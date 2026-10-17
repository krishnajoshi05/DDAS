const express      = require('express');
const { body, validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const User         = require('../models/User');
const FileRecord   = require('../models/FileRecord');
const { protect }  = require('../middleware/auth');

const router = express.Router();

// ── GET /api/orgs/me ──────────────────────────────────────────────────────
// Current user's organisation (with member + file counts).
router.get('/me', protect, async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.json({ success: true, organization: null });
    }
    const org = await Organization.findById(req.user.organization);
    if (!org) return res.json({ success: true, organization: null });

    const [memberCount, fileCount] = await Promise.all([
      User.countDocuments({ organization: org._id }),
      FileRecord.countDocuments({ organization: org._id, isDuplicate: false }),
    ]);

    res.json({
      success: true,
      organization: {
        _id:         org._id,
        name:        org.name,
        description: org.description,
        inviteCode:  org.inviteCode,
        createdAt:   org.createdAt,
        memberCount,
        fileCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orgs/me/members ─────────────────────────────────────────────
router.get('/me/members', protect, async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.json({ success: true, members: [] });
    }
    const members = await User.find({ organization: req.user.organization })
      .sort({ createdAt: -1 })
      .select('name email role createdAt');
    res.json({ success: true, count: members.length, members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/orgs ────────────────────────────────────────────────────────
// Create a new org; the caller becomes its first member.
router.post('/', protect, [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 chars'),
  body('description').optional().trim().isLength({ max: 240 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description } = req.body;

    const existing = await Organization.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Organisation name already taken' });
    }

    const org = await Organization.create({
      name:        name.trim(),
      description: description || '',
      createdBy:   req.user._id,
    });

    // Move the caller into the new org.
    await User.findByIdAndUpdate(req.user._id, { organization: org._id });

    res.status(201).json({ success: true, organization: org });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/orgs/join ───────────────────────────────────────────────────
// Join an existing organisation using its invite code.
router.post('/join', protect, [
  body('inviteCode').trim().isLength({ min: 4, max: 12 }).withMessage('Invite code required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const code = req.body.inviteCode.trim().toUpperCase();
    const org  = await Organization.findOne({ inviteCode: code });
    if (!org) {
      return res.status(404).json({ success: false, message: 'Invalid invite code' });
    }

    await User.findByIdAndUpdate(req.user._id, { organization: org._id });
    res.json({ success: true, organization: org });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/orgs/leave ──────────────────────────────────────────────────
router.post('/leave', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { organization: null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
