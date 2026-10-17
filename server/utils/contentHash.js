/**
 * Content-hash engine — produces a "perceptual" or "content-normalised"
 * fingerprint that survives small edits, recompression, re-saving, or
 * being re-exported into a different file format.
 *
 *   • Images (JPEG/PNG/GIF/WEBP/BMP)
 *       → aHash variant: 8×8 grayscale, average-threshold,
 *         64-bit fingerprint as 16 hex chars. (kind = 'phash')
 *
 *   • Text-bearing documents — ALL map to the SAME 'text' fingerprint
 *     namespace so a PDF, a DOCX, a PPTX, an .html scrape and a .txt
 *     export of the same content all collide as a single near-dup.
 *     This is Feature #4 — cross-modal duplicate detection.
 *
 *       - PDF   → text via pdf-parse
 *       - DOCX  → text via mammoth
 *       - PPTX  → text via jszip + slide-XML extraction
 *       - HTML  → text via simple tag-strip
 *       - TXT/MD/CSV → raw text
 *
 *     All paths normalise (lowercase, collapse whitespace, drop
 *     punctuation/symbols) and SHA-256 the result. (kind = 'text')
 *
 *   • Anything else → null  (callers fall back to exact-hash matching).
 *
 * Heavy / optional deps (`sharp`, `pdf-parse`, `mammoth`, `jszip`) are
 * loaded lazily so the server still boots if any one of them fails to
 * install — that engine is just disabled.
 */

const crypto = require('crypto');

// ── Lazy optional deps ────────────────────────────────────────────────────
let sharp, pdfParse, mammoth, JSZip;
try { sharp    = require('sharp');     } catch { sharp    = null; }
try { pdfParse = require('pdf-parse'); } catch { pdfParse = null; }
try { mammoth  = require('mammoth');   } catch { mammoth  = null; }
try { JSZip    = require('jszip');     } catch { JSZip    = null; }

// ── MIME / extension predicates ──────────────────────────────────────────
const isImage = (mime) => /^image\/(jpeg|jpg|png|gif|webp|bmp)$/i.test(mime || '');
const isPdf   = (mime, name) =>
  (mime || '').toLowerCase() === 'application/pdf' || /\.pdf$/i.test(name || '');
const isDocx  = (mime, name) =>
  (mime || '') === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
  /\.docx$/i.test(name || '');
const isPptx  = (mime, name) =>
  (mime || '') === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
  /\.pptx$/i.test(name || '');
const isHtml  = (mime, name) =>
  (mime || '').toLowerCase() === 'text/html' || /\.html?$/i.test(name || '');
const isPlainText = (mime, name) =>
  (mime || '').toLowerCase().startsWith('text/') || /\.(txt|md|markdown|csv|log)$/i.test(name || '');

// ── Image perceptual hash (8×8 average hash) ─────────────────────────────
async function imagePHash(buffer) {
  if (!sharp) return null;
  try {
    const { data } = await sharp(buffer)
      .grayscale()
      .resize(8, 8, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (data.length < 64) return null;

    let sum = 0;
    for (let i = 0; i < 64; i++) sum += data[i];
    const mean = sum / 64;

    let hex = '';
    for (let nibble = 0; nibble < 16; nibble++) {
      let v = 0;
      for (let b = 0; b < 4; b++) {
        const pixel = data[nibble * 4 + b];
        v = (v << 1) | (pixel > mean ? 1 : 0);
      }
      hex += v.toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

// ── Text normalisation ────────────────────────────────────────────────────
// Order matters: replace punctuation/symbols WITH a space first, then
// collapse runs of whitespace. Doing it the other way round leaves
// double-spaces where punctuation used to be, which then causes two
// otherwise-identical texts (one with " — " and one without) to hash
// differently. This was caught by the smoke test.
function normaliseText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')    // any non-alphanum/space → ' '
    .replace(/\s+/g, ' ')                  // collapse whitespace
    .trim();
}

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// ── Per-format text extractors ───────────────────────────────────────────
async function pdfText(buffer) {
  if (!pdfParse) return null;
  try {
    const parsed = await pdfParse(buffer);
    return parsed.text || null;
  } catch { return null; }
}

async function docxText(buffer) {
  if (!mammoth) return null;
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || null;
  } catch { return null; }
}

/**
 * PPTX — a PPTX file is a ZIP archive. The text we care about lives in
 * ppt/slides/slideN.xml as <a:t>...</a:t> runs. We unzip, sort the
 * slide files numerically, and pull the text out with a permissive regex.
 *
 * Speaker notes live in ppt/notesSlides/notesSlideN.xml; we include
 * those too because two decks with the same speaker notes but different
 * visuals are still arguably the same content.
 */
async function pptxText(buffer) {
  if (!JSZip) return null;
  try {
    const zip = await JSZip.loadAsync(buffer);

    const slideNames = Object.keys(zip.files)
      .filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)\.xml/i)[1], 10);
        const nb = parseInt(b.match(/slide(\d+)\.xml/i)[1], 10);
        return na - nb;
      });

    const noteNames = Object.keys(zip.files)
      .filter(n => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(n))
      .sort();

    const allNames = [...slideNames, ...noteNames];
    if (allNames.length === 0) return null;

    const parts = [];
    for (const n of allNames) {
      const xml = await zip.files[n].async('string');
      // Pull every <a:t>...</a:t> run; ignore tag attributes.
      const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
      for (const m of matches) {
        parts.push(m.replace(/<[^>]+>/g, ''));
      }
    }
    return parts.join(' ');
  } catch { return null; }
}

async function htmlText(buffer) {
  try {
    const raw = buffer.toString('utf8');
    // Drop script/style blocks first, then strip all remaining tags,
    // then decode the most common HTML entities.
    const stripped = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi,  ' ')
      .replace(/<!--[\s\S]*?-->/g,           ' ')
      .replace(/<[^>]+>/g,                   ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g,  '&')
      .replace(/&lt;/g,   '<')
      .replace(/&gt;/g,   '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g,  "'");
    return stripped;
  } catch { return null; }
}

async function plainText(buffer) {
  try { return buffer.toString('utf8'); } catch { return null; }
}

/**
 * Compute a content hash + kind + source-format label for a file.
 * Returns { contentHash, kind, sourceFormat } where:
 *   kind          ∈ {'phash','text',null}
 *   sourceFormat  ∈ {'image','pdf','docx','pptx','html','text',null}
 *
 * `sourceFormat` is informational only — the matching key is
 * (contentHash, kind), which means cross-format collisions surface
 * automatically.
 */
async function computeContentHash({ buffer, mimeType, fileName }) {
  if (isImage(mimeType)) {
    const h = await imagePHash(buffer);
    return h
      ? { contentHash: h, kind: 'phash', sourceFormat: 'image' }
      : empty();
  }

  // ── Text-bearing formats (cross-modal) ─────────────────────────────
  let rawText = null, sourceFormat = null;
  if      (isPdf(mimeType, fileName))   { rawText = await pdfText(buffer);   sourceFormat = 'pdf';  }
  else if (isDocx(mimeType, fileName))  { rawText = await docxText(buffer);  sourceFormat = 'docx'; }
  else if (isPptx(mimeType, fileName))  { rawText = await pptxText(buffer);  sourceFormat = 'pptx'; }
  else if (isHtml(mimeType, fileName))  { rawText = await htmlText(buffer);  sourceFormat = 'html'; }
  else if (isPlainText(mimeType, fileName)) {
                                          rawText = await plainText(buffer); sourceFormat = 'text'; }

  if (rawText) {
    const norm = normaliseText(rawText);
    if (norm.length >= 32) {
      return { contentHash: sha256(norm), kind: 'text', sourceFormat };
    }
  }

  return empty();
}

function empty() {
  return { contentHash: null, kind: null, sourceFormat: null };
}

// Diagnostic: which engines are live?
function availableEngines() {
  return {
    image: !!sharp,
    pdf:   !!pdfParse,
    docx:  !!mammoth,
    pptx:  !!JSZip,
    html:  true,
    text:  true,
  };
}

module.exports = { computeContentHash, availableEngines };
