const mongoose = require('mongoose');
const crypto   = require('crypto');

/**
 * Organization model — groups users so duplicate detection can be scoped
 * to a shared workspace (e.g. a department, lab, or team).
 *
 * A user belongs to exactly ONE organisation. Duplicate detection happens
 * inside that organisation first; admins can optionally widen the check.
 */
const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
      unique: true,
    },
    // Short human-readable code used at signup so users can join an existing org
    // without an admin invite. Auto-generated if not supplied.
    inviteCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 12,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 240,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// ── Auto-generate invite code if missing ──────────────────────────────────
OrganizationSchema.pre('validate', function (next) {
  if (!this.inviteCode) {
    this.inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Organization', OrganizationSchema);
