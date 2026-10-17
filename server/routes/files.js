const express        = require('express');
const multer         = require('multer');
const path           = require('path');
const fs             = require('fs');
const FileRecord     = require('../models/FileRecord');
const FileChunk      = require('../models/FileChunk');
const DuplicateAlert = require('../models/DuplicateAlert');
const { protect }    = require('../middleware/auth');
const { hashFromBuffer } = require('../utils/hashEngine');
const { computeContentHash, availableEngines } = require('../utils/contentHash');
const { chunkBuffer, computeOverlap, CHUNK_PARAMS } = require('../utils/chunking');
const { sendDuplicateAlert } = require('../utils/mailer');

const router = express.Router();

// ── Multer setup (memory storage — hash before saving to disk) ────────────
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Partial-duplicate threshold. Below this overlap percentage we don't
// raise a partial-dup alert — the noise isn't worth it.
const PARTIAL_DUP_THRESHOLD =
  parseFloat(process.env.PARTIAL_DUP_THRESHOLD || '0.30');

// ── GET /api/files/engines ────────────────────────────────────────────────
// Diagnostic: which near-duplicate engines are active + CDC params.
router.get('/engines', protect, (req, res) => {
  res.json({
    success: true,
    engines: availableEngines(),
    cdc:     { ...CHUNK_PARAMS, partialDupThreshold: PARTIAL_DUP_THRESHOLD },
  });
});

// ── Helper — record a DuplicateAlert + optionally email ───────────────────
async function recordDuplicate({
  user, originalFile, duplicateFile, matchKind, source, channels, fileName,
  overlapPercent = null, crossModal = false,
  candidateFormat = null, originalFormat = null,
}) {
  const alert = await DuplicateAlert.create({
    triggeredBy:   user._id,
    organization:  user.organization,
    originalFile:  originalFile._id,
    duplicateFile: duplicateFile ? duplicateFile._id : null,
    matchKind,
    overlapPercent,
    crossModal,
    candidateFormat,
    originalFormat,
    source,
    channels,
    emailSent:     false,
  });

  if (channels.includes('email')) {
    try {
      await sendDuplicateAlert({
        toEmail:          user.email,
        toName:           user.name,
        fileName,
        originalUploader: originalFile.uploadedBy?.name || 'another user',
        originalDate:     originalFile.createdAt,
        matchKind,
        overlapPercent,
        crossModal,
        candidateFormat,
        originalFormat,
      });
      await DuplicateAlert.findByIdAndUpdate(alert._id, { emailSent: true });
    } catch (mailErr) {
      console.error('Email send failed:', mailErr.message);
    }
  }

  return alert;
}

// ── Helper — given a buffer, compute chunks AND find the best partial
// overlap candidate in the org. Returns:
//   { chunks, best: { file, overlapBytes, overlapPercent } | null }
async function chunkAndFindPartial(buffer, orgId) {
  const chunks = chunkBuffer(buffer);

  // Single-chunk files behave just like exact-hash matching — skip.
  if (chunks.length < 2) return { chunks, best: null };

  const hashes = chunks.map(c => c.hash);

  // One query to find every chunk doc in this org that shares a hash
  // with the candidate file.
  const matchQuery = { hash: { $in: hashes } };
  if (orgId) matchQuery.organization = orgId;
  else       matchQuery.organization = null;

  const docs = await FileChunk.find(matchQuery).select('hash size refs');
  if (docs.length === 0) return { chunks, best: null };

  // Tally overlap bytes per existing FileRecord.
  const perFile = new Map();   // fileRecordId(string) → overlapBytes
  for (const d of docs) {
    for (const r of d.refs) {
      const k = r.fileRecord.toString();
      perFile.set(k, (perFile.get(k) || 0) + d.size);
    }
  }

  // Find the file with the largest overlap.
  let bestId = null, bestBytes = 0;
  for (const [k, v] of perFile) {
    if (v > bestBytes) { bestBytes = v; bestId = k; }
  }
  if (!bestId) return { chunks, best: null };

  const bestFile = await FileRecord
    .findById(bestId)
    .populate('uploadedBy', 'name email');

  if (!bestFile || bestFile.isDuplicate) return { chunks, best: null };

  const overlap = computeOverlap(
    chunks,
    new Map(docs.map(d => [d.hash, d.size])),
    bestFile.fileSize,
  );

  return {
    chunks,
    best: {
      file:                       bestFile,
      overlapBytes:               overlap.overlapBytes,
      overlapPercentOfCandidate:  overlap.overlapPercentOfCandidate,
      overlapPercentOfExisting:   overlap.overlapPercentOfExisting,
      overlapPercent:             overlap.overlapPercentMax,
    },
  };
}

// ── Helper — persist a file's chunks into the FileChunk collection ───────
async function persistChunks({ chunks, fileRecordId, orgId }) {
  if (!Array.isArray(chunks) || chunks.length === 0) return;

  // bulkWrite upsert keeps existing refs while appending our new one.
  const ops = chunks.map(c => ({
    updateOne: {
      filter: { hash: c.hash, organization: orgId || null },
      update: {
        $setOnInsert: { hash: c.hash, size: c.size, organization: orgId || null },
        $push:        { refs: { fileRecord: fileRecordId, offset: c.offset } },
      },
      upsert: true,
    },
  }));

  try {
    await FileChunk.bulkWrite(ops, { ordered: false });
  } catch (err) {
    // Duplicate-key errors during racy upserts are recoverable: retry
    // each failed op as a plain $push.
    if (err.writeErrors) {
      for (const we of err.writeErrors) {
        const c = chunks[we.index];
        if (!c) continue;
        try {
          await FileChunk.updateOne(
            { hash: c.hash, organization: orgId || null },
            { $push: { refs: { fileRecord: fileRecordId, offset: c.offset } } }
          );
        } catch (e2) {
          console.warn('chunk push retry failed:', e2.message);
        }
      }
    } else {
      console.warn('chunk bulkWrite failed:', err.message);
    }
  }
}

// ── POST /api/files/upload ────────────────────────────────────────────────
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const orgId = req.user.organization;

    // 1. Exact hash
    const hash = hashFromBuffer(req.file.buffer);

    // 2. Exact-match lookup (org-scoped if user has an org)
    let existing       = await FileRecord.findByHash(hash, orgId);
    let matchKind      = existing ? 'exact' : null;
    let scope          = existing ? (orgId ? 'organization' : 'global') : null;
    let crossModal     = false;
    let overlapPercent = null;

    // 3. Near-duplicate fallback via content hash (cross-modal aware)
    let contentHashResult = { contentHash: null, kind: null, sourceFormat: null };
    if (!existing) {
      contentHashResult = await computeContentHash({
        buffer:   req.file.buffer,
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
      });
      if (contentHashResult.contentHash) {
        const near = await FileRecord.findByContentHash(
          contentHashResult.contentHash,
          contentHashResult.kind,
          orgId,
        );
        if (near) {
          existing   = near;
          matchKind  = 'near';
          scope      = orgId ? 'organization' : 'global';
          crossModal = !!(contentHashResult.sourceFormat &&
                          near.sourceFormat &&
                          contentHashResult.sourceFormat !== near.sourceFormat);
        }
      }
    }

    // 4. CDC partial-overlap fallback (Feature 2)
    let chunks = null;
    if (!existing) {
      const result = await chunkAndFindPartial(req.file.buffer, orgId);
      chunks = result.chunks;
      if (result.best && result.best.overlapPercent >= PARTIAL_DUP_THRESHOLD) {
        existing       = result.best.file;
        matchKind      = 'partial';
        scope          = orgId ? 'organization' : 'global';
        overlapPercent = result.best.overlapPercent;
      }
    }

    // ── DUPLICATE DETECTED (exact, near, or partial) ───────────────────
    if (existing) {
      const dupRecord = await FileRecord.create({
        fileName:        `dup_${Date.now()}_${req.file.originalname}`,
        originalName:    req.file.originalname,
        fileSize:        req.file.size,
        mimeType:        req.file.mimetype,
        hash,
        contentHash:     contentHashResult.contentHash,
        contentHashKind: contentHashResult.kind,
        sourceFormat:    contentHashResult.sourceFormat,
        organization:    orgId,
        uploadedBy:      req.user._id,
        isDuplicate:     true,
        duplicateKind:   matchKind,
        duplicateOf:     existing._id,
        overlapPercent,
        crossModal,
      });

      const alert = await recordDuplicate({
        user:            req.user,
        originalFile:    existing,
        duplicateFile:   dupRecord,
        matchKind,
        source:          'upload',
        channels:        ['web', 'email'],
        fileName:        req.file.originalname,
        overlapPercent,
        crossModal,
        candidateFormat: contentHashResult.sourceFormat,
        originalFormat:  existing.sourceFormat,
      });

      const message =
        matchKind === 'exact'   ? 'Exact duplicate file detected'
      : matchKind === 'near'    ? (crossModal
                                    ? `Cross-format near-duplicate detected (${existing.sourceFormat || '?'} ↔ ${contentHashResult.sourceFormat || '?'})`
                                    : 'Near-duplicate file detected (same content)')
      :                           `Partial duplicate detected (${Math.round((overlapPercent || 0) * 100)}% chunk overlap with an existing file)`;

      return res.status(409).json({
        success:        false,
        isDuplicate:    true,
        matchKind,
        scope,
        crossModal,
        overlapPercent,
        message,
        duplicate: {
          originalFile: {
            _id:          existing._id,
            fileName:     existing.originalName,
            uploadedBy:   existing.uploadedBy,
            uploadedAt:   existing.createdAt,
            fileSize:     existing.fileSize,
            sourceFormat: existing.sourceFormat,
          },
          candidateFormat: contentHashResult.sourceFormat,
          alertId:         alert._id,
        },
      });
    }

    // ── NEW FILE — save to disk + index chunks ─────────────────────────
    const safeName = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, req.file.buffer);

    // Ensure we have a chunk list (if the partial-dup step bailed early
    // because it was a single-chunk file, we still want to record it).
    if (!chunks) chunks = chunkBuffer(req.file.buffer);

    const record = await FileRecord.create({
      fileName:        safeName,
      originalName:    req.file.originalname,
      fileSize:        req.file.size,
      mimeType:        req.file.mimetype,
      hash,
      contentHash:     contentHashResult.contentHash,
      contentHashKind: contentHashResult.kind,
      sourceFormat:    contentHashResult.sourceFormat,
      chunks,
      chunkCount:      chunks.length,
      organization:    orgId,
      uploadedBy:      req.user._id,
      isDuplicate:     false,
      filePath,
    });

    // Persist the chunk index so the next upload can find partial overlap.
    await persistChunks({ chunks, fileRecordId: record._id, orgId });

    res.status(201).json({
      success:     true,
      isDuplicate: false,
      message:     'File uploaded successfully',
      file:        record,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/files/check ─────────────────────────────────────────────────
// Used by:
//   • the desktop agent (only knows raw hash)
//   • the browser pre-upload check (browser computes raw hash; may also
//     pass a precomputed contentHash if it has one).
// NOTE: partial-overlap (chunking) detection deliberately runs only at
// /upload — it requires the file bytes which /check by design never sees.
router.post('/check', protect, async (req, res) => {
  const { hash, fileName, fileSize, contentHash, contentHashKind, source } = req.body;
  if (!hash) {
    return res.status(400).json({ success: false, message: 'Hash is required' });
  }

  try {
    const orgId = req.user.organization;

    // Exact match first
    let existing  = await FileRecord.findByHash(hash, orgId);
    let matchKind = existing ? 'exact' : null;

    // Near-duplicate fallback
    if (!existing && contentHash && contentHashKind) {
      const near = await FileRecord.findByContentHash(contentHash, contentHashKind, orgId);
      if (near) {
        existing  = near;
        matchKind = 'near';
      }
    }

    if (existing) {
      const channels = source === 'agent' ? ['os'] : ['web'];
      await recordDuplicate({
        user:          req.user,
        originalFile:  existing,
        duplicateFile: null,           // check-only — no file stored
        matchKind,
        source:        'check',
        channels,
        fileName: fileName || existing.originalName,
        originalFormat: existing.sourceFormat,
      });

      return res.json({
        isDuplicate: true,
        matchKind,
        message:     matchKind === 'exact'
          ? `"${fileName || existing.originalName}" already exists in the registry`
          : `"${fileName || existing.originalName}" looks nearly identical to an existing file`,
        originalFile: {
          fileName:     existing.originalName,
          uploadedBy:   existing.uploadedBy,
          uploadedAt:   existing.createdAt,
          fileSize:     existing.fileSize,
          sourceFormat: existing.sourceFormat,
        },
      });
    }

    res.json({ isDuplicate: false, message: 'File is unique' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/files ────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const files = await FileRecord.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: files.length, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/files/org ────────────────────────────────────────────────────
router.get('/org', protect, async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.json({ success: true, count: 0, files: [] });
    }
    const files = await FileRecord.find({
      organization: req.user.organization,
      isDuplicate:  false,
    })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: files.length, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/files/alerts ─────────────────────────────────────────────────
router.get('/alerts', protect, async (req, res) => {
  try {
    const alerts = await DuplicateAlert.getForUser(req.user._id);
    res.json({ success: true, count: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/files/alerts/:id/read ─────────────────────────────────────
router.patch('/alerts/:id/read', protect, async (req, res) => {
  try {
    await DuplicateAlert.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/files/chunks/stats ──────────────────────────────────────────
// Diagnostic — bytes the org has stored vs unique bytes after CDC.
router.get('/chunks/stats', protect, async (req, res) => {
  try {
    const orgFilter = req.user.organization
      ? { organization: req.user.organization }
      : { organization: null };

    const [totals, chunkAgg] = await Promise.all([
      FileRecord.aggregate([
        { $match: { ...orgFilter, isDuplicate: false } },
        { $group: { _id: null, totalBytes: { $sum: '$fileSize' }, files: { $sum: 1 } } },
      ]),
      FileChunk.aggregate([
        { $match: orgFilter },
        { $group: { _id: null, uniqueBytes: { $sum: '$size' }, uniqueChunks: { $sum: 1 } } },
      ]),
    ]);

    const totalBytes   = totals[0]?.totalBytes   || 0;
    const totalFiles   = totals[0]?.files        || 0;
    const uniqueBytes  = chunkAgg[0]?.uniqueBytes || 0;
    const uniqueChunks = chunkAgg[0]?.uniqueChunks || 0;
    const savedBytes   = Math.max(0, totalBytes - uniqueBytes);
    const dedupRatio   = totalBytes > 0 ? uniqueBytes / totalBytes : 1;

    res.json({
      success: true,
      stats: {
        totalFiles,
        totalBytes,
        uniqueBytes,
        uniqueChunks,
        savedBytes,
        dedupRatio,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
