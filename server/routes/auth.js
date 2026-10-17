const express      = require('express');
const jwt          = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User         = require('../models/User');
const Organization = require('../models/Organization');
const { protect }  = require('../middleware/auth');

const router = express.Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Build a slim user response that includes a flattened organisation field.
const shapeUser = (user, org) => ({
  _id:   user._id,
  name:  user.name,
  email: user.email,
  role:  user.role,
  organization: org
    ? { _id: org._id, name: org.name, inviteCode: org.inviteCode }
    : null,
});

// ── POST /api/auth/register ───────────────────────────────────────────────
// Body: { name, email, password,
//         orgAction?: 'create' | 'join' | 'none',
//         orgName?:  string,      // when orgAction === 'create'
//         inviteCode?: string }   // when orgAction === 'join'
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('orgAction').optional().isIn(['create', 'join', 'none']),
  body('orgName').optional().trim().isLength({ min: 2, max: 80 }),
  body('inviteCode').optional().trim().isLength({ min: 4, max: 12 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password, orgAction, orgName, inviteCode } = req.body;

  try {
    if (await User.findOne({ email })) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // ── Resolve organisation BEFORE creating the user ──────────────────
    let org = null;
    if (orgAction === 'create') {
      if (!orgName) {
        return res.status(400).json({ success: false, message: 'orgName required when orgAction is create' });
      }
      if (await Organization.findOne({ name: orgName.trim() })) {
        return res.status(409).json({ success: false, message: 'Organisation name already taken' });
      }
      org = await Organization.create({ name: orgName.trim() });
    } else if (orgAction === 'join') {
      if (!inviteCode) {
        return res.status(400).json({ success: false, message: 'inviteCode required when orgAction is join' });
      }
      org = await Organization.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
      if (!org) {
        return res.status(404).json({ success: false, message: 'Invalid invite code' });
      }
    }

    // SECURITY: never honour client-supplied `role`. The first user whose
    // email matches process.env.BOOTSTRAP_ADMIN_EMAIL becomes admin; all
    // others are plain users until promoted by an existing admin.
    const isBootstrapAdmin = !!process.env.BOOTSTRAP_ADMIN_EMAIL &&
      email.toLowerCase() === process.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();

    const user = await User.create({
      name,
      email,
      password,
      role:         isBootstrapAdmin ? 'admin' : 'user',
      organization: org ? org._id : undefined,
    });

    if (org && orgAction === 'create') {
      org.createdBy = user._id;
      await org.save();
    }

    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: shapeUser(user, org) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password').populate('organization');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    res.json({ success: true, token, user: shapeUser(user, user.organization) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).populate('organization');
  res.json({ success: true, user: shapeUser(user, user.organization) });
});

// ── PUT /api/auth/me ──────────────────────────────────────────────────────
router.put('/me', protect, [
  body('name').optional().trim().isLength({ min: 2 }),
], async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { ...(name && { name }) },
      { new: true, runValidators: true }
    ).populate('organization');
    res.json({ success: true, user: shapeUser(user, user.organization) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
