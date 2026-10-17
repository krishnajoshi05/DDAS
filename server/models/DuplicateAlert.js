const mongoose = require('mongoose');

const DuplicateAlertSchema = new mongoose.Schema(
  {
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    originalFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileRecord',
      required: true,
    },
    // For desktop-agent check-only events the duplicate isn't stored,
    // so this field is optional (the legacy behaviour stuffed the
    // original id here which corrupted the audit trail — fixed).
    duplicateFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FileRecord',
      default: null,
    },
    // 'exact'   = SHA-256 byte-identical
    // 'near'    = content-hash match (incl. cross-modal text matches)
    // 'partial' = CDC chunk overlap above the configured threshold
    matchKind: {
      type: String,
      enum: ['exact', 'near', 'partial'],
      default: 'exact',
    },
    // For 'partial' matches: fraction of bytes that overlapped (0..1).
    overlapPercent: {
      type: Number,
      default: null,
    },
    // True when the original and candidate had different sourceFormats
    // (e.g. PDF vs DOCX with the same text content). Lets the UI label
    // the match as "Cross-format" instead of just "Near-duplicate".
    crossModal: {
      type: Boolean,
      default: false,
    },
    // Helpful diagnostic for the UI / email — what the two formats were.
    candidateFormat: { type: String, default: null },
    originalFormat:  { type: String, default: null },

    // 'upload' = full upload via web; 'check' = desktop agent probe
    source: {
      type: String,
      enum: ['upload', 'check'],
      default: 'upload',
    },
    channels: {
      type: [String],
      enum: ['web', 'email', 'os'],
      default: ['web'],
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Populate helper ───────────────────────────────────────────────────────
DuplicateAlertSchema.statics.getForUser = function (userId) {
  return this.find({ triggeredBy: userId })
    .populate('originalFile', 'fileName originalName uploadedBy createdAt fileSize sourceFormat')
    .populate('duplicateFile', 'fileName originalName createdAt sourceFormat')
    .populate('triggeredBy', 'name email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('DuplicateAlert', DuplicateAlertSchema);
