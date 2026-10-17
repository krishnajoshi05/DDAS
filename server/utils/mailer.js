const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send duplicate detection alert email.
 * matchKind:      'exact' | 'near' | 'partial'
 * crossModal:     true when original/candidate sourceFormats differ
 * overlapPercent: 0..1 (only meaningful for 'partial')
 */
const sendDuplicateAlert = async ({
  toEmail, toName, fileName, originalUploader, originalDate,
  matchKind = 'exact',
  overlapPercent = null,
  crossModal = false,
  candidateFormat = null,
  originalFormat = null,
}) => {
  const formattedDate = new Date(originalDate).toLocaleString('en-IN', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  const isNear    = matchKind === 'near';
  const isPartial = matchKind === 'partial';

  const headline =
    isPartial            ? 'Partial duplicate file detected'
  : isNear && crossModal ? 'Cross-format duplicate detected'
  : isNear               ? 'Near-duplicate file detected'
  :                        'Duplicate file detected';

  const overlapPct = overlapPercent != null
    ? Math.round(overlapPercent * 100) + '%'
    : null;

  const matchLabel =
    isPartial            ? `Partial (CDC chunk overlap · ${overlapPct})`
  : isNear && crossModal ? `Cross-format (${(originalFormat || '?').toUpperCase()} ↔ ${(candidateFormat || '?').toUpperCase()})`
  : isNear               ? 'Near (content fingerprint)'
  :                        'Exact (SHA-256)';

  const explainer =
    isPartial
      ? `The file you just uploaded shares <strong>${overlapPct} of its content (by bytes)</strong> ` +
        'with an existing file in your organisation. DDAS detected this using content-defined ' +
        'chunking (CDC) — variable-size chunk fingerprints that survive insertions and edits.'
  : isNear && crossModal
      ? `The file you just uploaded is in <strong>${(candidateFormat || '?').toUpperCase()}</strong>, ` +
        `but its text content matches an existing <strong>${(originalFormat || '?').toUpperCase()}</strong> ` +
        'file in your organisation. DDAS detected this cross-format duplicate by extracting and ' +
        'normalising the text from both files.'
  : isNear
      ? 'The file you just uploaded is <strong>not byte-identical</strong> to an existing file, ' +
        'but its content appears nearly identical (same image, same document text, etc.). ' +
        'DDAS detected this using a perceptual / content-normalised fingerprint.'
  :     'The file you just uploaded has been identified as a <strong>duplicate</strong>. ' +
        'This file already exists in the DDAS registry and was uploaded by another user.';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
      <div style="background:#1F3864;padding:24px;text-align:center">
        <h1 style="color:#ffffff;margin:0;font-size:22px">DDAS — ${headline}</h1>
        <p style="color:#BDD7EE;margin:6px 0 0;font-size:13px">Data Download Duplication Alert System</p>
      </div>
      <div style="padding:28px">
        <p style="font-size:15px;color:#333">Hi <strong>${toName}</strong>,</p>
        <p style="font-size:14px;color:#555;line-height:1.7">${explainer}</p>
        <div style="background:#FEF3C7;border-left:4px solid #D97706;padding:16px;border-radius:4px;margin:20px 0">
          <p style="margin:0 0 8px;font-size:13px;color:#92400E;font-weight:bold">
            ${headline}
          </p>
          <p style="margin:4px 0;font-size:13px;color:#78350F">File name: <strong>${fileName}</strong></p>
          <p style="margin:4px 0;font-size:13px;color:#78350F">Originally uploaded by: <strong>${originalUploader}</strong></p>
          <p style="margin:4px 0;font-size:13px;color:#78350F">Original upload date: <strong>${formattedDate}</strong></p>
          <p style="margin:4px 0;font-size:13px;color:#78350F">Match type: <strong>${matchLabel}</strong></p>
          ${isPartial ? `<p style="margin:4px 0;font-size:13px;color:#78350F">Chunk overlap: <strong>${overlapPct}</strong></p>` : ''}
        </div>
        <p style="font-size:13px;color:#666;line-height:1.7">
          To avoid redundant storage and bandwidth usage, please access the existing file
          from the shared repository instead of uploading a new copy.
        </p>
        <p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:16px">
          This is an automated alert from DDAS &mdash; Shri Vaishnav Institute of Information Technology, Indore.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from:    `"DDAS Alert" <${process.env.EMAIL_USER}>`,
    to:      toEmail,
    subject: `[DDAS] ${headline} — ${fileName}`,
    html,
  });
};

module.exports = { sendDuplicateAlert };
