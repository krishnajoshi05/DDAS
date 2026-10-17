/**
 * Content-Defined Chunking (CDC) — Feature 2.
 *
 * Splits a file's bytes into variable-size chunks using a rolling Gear hash.
 * The boundary between chunks is determined by content, not by a fixed
 * window — so inserting/removing a few bytes near the start of a file
 * does NOT cascade-shift every chunk that follows. Two files that share
 * most of their content will share most of their chunk hashes, and the
 * overlap can be measured exactly.
 *
 * This is the same approach used by restic, borg, and ZFS dedup.
 *
 *   • Algorithm:  FastCDC-lite using a 256-entry Gear table.
 *   • MIN_SIZE :  4 KiB     (smallest chunk we'll emit)
 *   • AVG_SIZE : ~12 KiB    (expected average chunk size)
 *   • MAX_SIZE :  64 KiB    (forced cut to bound chunk size)
 *
 * Trade-off worth flagging:
 *   CDC excels at text-like / structured data (PDFs, DOCX, CSVs, code,
 *   logs). For already-compressed media (JPEG, MP4, ZIP) entropy is
 *   maximal and chunk boundaries rarely repeat across files even when
 *   the source content is similar — so partial-dup detection on those
 *   formats will mostly score 0%. That's expected, not a bug.
 */

const crypto = require('crypto');

// ── Tunables (also overrideable via env at module load time) ─────────────
const MIN_SIZE = parseInt(process.env.CDC_MIN_SIZE, 10) || 4 * 1024;
const AVG_BITS = parseInt(process.env.CDC_MASK_BITS, 10) || 13;   // 2^13 ≈ 8 KiB
const MAX_SIZE = parseInt(process.env.CDC_MAX_SIZE, 10) || 64 * 1024;
const MASK     = (1 << AVG_BITS) - 1;                              // 0x1FFF

// Below this size, chunking doesn't help — treat as a single chunk.
const CHUNK_THRESHOLD = parseInt(process.env.CDC_MIN_FILE_SIZE, 10) || 16 * 1024;

// ── Gear table ────────────────────────────────────────────────────────────
// 256 pseudo-random 32-bit values, deterministically seeded so the same
// bytes always produce the same chunk boundaries across runs/machines.
const GEAR = (() => {
  const t = new Uint32Array(256);
  // Use a fixed seed so the table is stable across processes.
  let s = 0x9E3779B9;
  for (let i = 0; i < 256; i++) {
    // xorshift32
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    t[i] = s >>> 0;
  }
  return t;
})();

/**
 * Split a Buffer into content-defined chunks.
 * Each chunk: { offset, size, hash } where hash = SHA-256 hex of chunk bytes.
 *
 * For files smaller than CHUNK_THRESHOLD a single-chunk array is returned.
 */
function chunkBuffer(buffer) {
  const len = buffer.length;

  if (len < CHUNK_THRESHOLD) {
    return [{
      offset: 0,
      size:   len,
      hash:   crypto.createHash('sha256').update(buffer).digest('hex'),
    }];
  }

  const chunks = [];
  let start = 0;

  while (start < len) {
    if (len - start <= MIN_SIZE) {
      // Remaining bytes are too small for a real chunk — flush as one.
      chunks.push(makeChunk(buffer, start, len));
      break;
    }

    // Skip the first MIN_SIZE bytes without scanning — they can never
    // be a cut point.
    let i     = start + MIN_SIZE;
    const lim = Math.min(start + MAX_SIZE, len);
    let hash  = 0;
    let cut   = -1;

    while (i < lim) {
      hash = ((hash << 1) + GEAR[buffer[i]]) >>> 0;
      if ((hash & MASK) === 0) { cut = i + 1; break; }
      i++;
    }

    const end = cut === -1 ? lim : cut;
    chunks.push(makeChunk(buffer, start, end));
    start = end;
  }

  return chunks;
}

function makeChunk(buffer, start, end) {
  return {
    offset: start,
    size:   end - start,
    hash:   crypto.createHash('sha256').update(buffer.slice(start, end)).digest('hex'),
  };
}

/**
 * Given a candidate file's chunk list and a map of {chunkHash → size}
 * recorded against an existing file, return the overlap statistics.
 *
 *   overlapBytes      = sum of sizes of chunk hashes present in BOTH
 *   overlapPercentOfA = overlapBytes / sizeof(candidate)
 *   overlapPercentOfB = overlapBytes / sizeof(existing)
 *   overlapPercentMax = max of the two (used for threshold check)
 *
 * The "max" form means a small file fully contained inside a larger one
 * still scores 100%, which is usually what we want for partial-dup alerts.
 */
function computeOverlap(candidateChunks, existingChunkMap, existingTotalSize) {
  const candidateTotal = candidateChunks.reduce((s, c) => s + c.size, 0);
  let overlapBytes = 0;

  for (const c of candidateChunks) {
    if (existingChunkMap.has(c.hash)) {
      // Use the candidate's size — sizes will match anyway for identical
      // chunk hashes, but this guards against an inconsistent existing
      // record.
      overlapBytes += c.size;
    }
  }

  const pctA = candidateTotal      > 0 ? overlapBytes / candidateTotal      : 0;
  const pctB = existingTotalSize   > 0 ? overlapBytes / existingTotalSize   : 0;

  return {
    overlapBytes,
    overlapPercentOfCandidate: pctA,
    overlapPercentOfExisting:  pctB,
    overlapPercentMax:         Math.max(pctA, pctB),
  };
}

module.exports = {
  chunkBuffer,
  computeOverlap,
  CHUNK_PARAMS: { MIN_SIZE, MAX_SIZE, AVG_BITS, CHUNK_THRESHOLD },
};
