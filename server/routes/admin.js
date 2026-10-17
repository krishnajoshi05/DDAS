const express        = require('express');
const User           = require('../models/User');
const FileRecord     = require('../models/FileRecord');
const DuplicateAlert = require('../models/DuplicateAlert');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// ── GET /api/admin/stats ──────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalFiles, totalDuplicates, totalAlerts] = await Promise.all([
      User.countDocuments(),
      FileRecord.countDocuments({ isDuplicate: false }),
      FileRecord.countDocuments({ isDuplicate: true }),
      DuplicateAlert.countDocuments(),
    ]);

    // Storage saved (sum of duplicate file sizes)
    const savedStorage = await FileRecord.aggregate([
      { $match: { isDuplicate: true } },
      { $group: { _id: null, total: { $sum: '$fileSize' } } },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalFiles,
        totalDuplicates,
        totalAlerts,
        storageSavedBytes: savedStorage[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/files ──────────────────────────────────────────────────
router.get('/files', async (req, res) => {
  try {
    const files = await FileRecord.find()
      .populate('uploadedBy', 'name email')
      .populate('duplicateOf', 'originalName uploadedBy')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: files.length, files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/admin/alerts ─────────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await DuplicateAlert.find()
      .populate('triggeredBy', 'name email')
      .populate('originalFile', 'originalName fileSize createdAt')
      .populate('duplicateFile', 'originalName createdAt')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: alerts.length, alerts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
