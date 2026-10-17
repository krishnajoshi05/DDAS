/**
 * Offline smoke test — runs without Mongo / Express / network.
 *
 * Verifies:
 *   1. CDC chunker is deterministic and finds shared chunks between two
 *      buffers that share a long middle section.
 *   2. Cross-modal: a PDF-like buffer and a DOCX-like buffer with the same
 *      normalised text would collide (we exercise normaliseText + sha256
 *      directly because building real PDFs/DOCX in-script is heavy).
 *   3. PPTX extraction via JSZip — round-trip a tiny synthetic PPTX zip.
 *
 * Run with:  node scripts/smoke.js   (or  npm run smoke)
 */

'use strict';

const path = require('path');
process.chdir(path.join(__dirname, '..'));

const crypto = require('crypto');
const { chunkBuffer, computeOverlap, CHUNK_PARAMS } = require('../utils/chunking');

let JSZip;
try { JSZip = require('jszip'); } catch { JSZip = null; }

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`  ✓ ${name}`);                 pass++; }
  else      { console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); fail++; }
}

console.log('\n── CDC chunker ──────────────────────────────');
console.log('   params:', CHUNK_PARAMS);

// Build a 256 KiB pseudo-random buffer A, then build B which copies the
// middle 200 KiB of A and surrounds it with different random data.
const rng = (seed) => {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s & 0xff; };
};
function makeBuf(len, seed) {
  const r = rng(seed);
  const b = Buffer.alloc(len);
  for (let i = 0; i < len; i++) b[i] = r();
  return b;
}

const A      = makeBuf(256 * 1024, 0xCAFEBABE);
const middle = A.slice(28 * 1024, 228 * 1024);          // ≈ 200 KiB shared
const prefixB = makeBuf(20 * 1024, 0xDEADBEEF);
const suffixB = makeBuf(20 * 1024, 0xFEEDFACE);
const B = Buffer.concat([prefixB, middle, suffixB]);    // ≈ 240 KiB

const chunksA = chunkBuffer(A);
const chunksB = chunkBuffer(B);

check('chunkBuffer produced multiple chunks for A', chunksA.length > 4, `got ${chunksA.length}`);
check('chunkBuffer produced multiple chunks for B', chunksB.length > 4, `got ${chunksB.length}`);

// Determinism: chunking the same buffer twice → same hashes/sizes.
const chunksA2 = chunkBuffer(Buffer.from(A));
const detSame = chunksA.length === chunksA2.length &&
  chunksA.every((c, i) => c.hash === chunksA2[i].hash && c.size === chunksA2[i].size);
check('chunkBuffer is deterministic', detSame);

// Overlap: B should share a large fraction with A.
const existingMap = new Map(chunksA.map(c => [c.hash, c.size]));
const overlap = computeOverlap(chunksB, existingMap, A.length);
const pctOfCandidate = overlap.overlapPercentOfCandidate;

check('B overlaps >= 50% of its bytes with A',
  pctOfCandidate >= 0.5,
  `overlap pct of candidate = ${(pctOfCandidate * 100).toFixed(1)}%`);

// Negative case: two unrelated buffers should NOT overlap meaningfully.
const C = makeBuf(256 * 1024, 0x12345678);
const chunksC  = chunkBuffer(C);
const noOver   = computeOverlap(chunksC, existingMap, A.length);
check('Unrelated buffer overlaps < 5% with A',
  noOver.overlapPercentOfCandidate < 0.05,
  `overlap pct of candidate = ${(noOver.overlapPercentOfCandidate * 100).toFixed(2)}%`);

console.log('\n── Cross-modal text fingerprint ─────────────');
function normaliseText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

const pdfLike  = 'Quarterly Report — 2026 Q1\n\nRevenue: $1.2M\nGrowth: 17%.';
const docxLike = 'quarterly report 2026 q1.   revenue: $1.2m.  growth, 17%.';
const htmlLike = '<p>Quarterly REPORT — 2026 Q1.</p><div>Revenue: $1.2M. Growth: 17%</div>';

const hashPdf  = sha256(normaliseText(pdfLike));
const hashDocx = sha256(normaliseText(docxLike));
const hashHtml = sha256(normaliseText(htmlLike.replace(/<[^>]+>/g, ' ')));

check('PDF-like and DOCX-like normalise to the same hash', hashPdf === hashDocx);
check('HTML-like (after tag-strip) matches PDF/DOCX',      hashHtml === hashPdf);

console.log('\n── PPTX extraction (jszip) ──────────────────');
(async () => {
  if (!JSZip) {
    console.log('  ⚠  jszip not installed — skipped');
  } else {
    const slide1 =
`<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree>
    <a:t>Hello slide one</a:t><a:t>more text here</a:t>
  </p:spTree></p:cSld>
</p:sld>`;
    const z = new JSZip();
    z.file('ppt/slides/slide1.xml', slide1);

    const buf = await z.generateAsync({ type: 'nodebuffer' });

    // Re-load and pull text via the same logic as contentHash.pptxText
    const z2 = await JSZip.loadAsync(buf);
    const xml = await z2.files['ppt/slides/slide1.xml'].async('string');
    const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
    const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');

    check('PPTX text extraction round-trips',
      text.includes('Hello slide one') && text.includes('more text here'),
      `extracted: "${text}"`);
  }

  console.log(`\n── Summary ──── ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();
