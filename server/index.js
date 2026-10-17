require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const path       = require('path');
const connectDB  = require('./config/db');

// ── Routes ────────────────────────────────────────────────────────────────
const authRoutes  = require('./routes/auth');
const fileRoutes  = require('./routes/files');
const adminRoutes = require('./routes/admin');
const orgRoutes   = require('./routes/organizations');
const dashboardRoutes =
  require('./routes/dashboard');

const app = express();

// ── Connect DB ────────────────────────────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(
  '/api/dashboard',
  dashboardRoutes
);
app.use(morgan('dev'));

// ── Static uploads ────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orgs',  orgRoutes);

// ── Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'DDAS API is running', timestamp: new Date() });
});

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ── Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  DDAS Server running on http://localhost:${PORT}`);
  console.log(`📁  Upload limit: 100MB`);
  console.log(`🔐  JWT expiry: ${process.env.JWT_EXPIRES_IN || '7d'}\n`);
});
