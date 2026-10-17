require('dotenv').config();
const chokidar   = require('chokidar');
const axios      = require('axios');
const notifier   = require('node-notifier');
const crypto     = require('crypto');
const fs         = require('fs');
const os         = require('os');
const path       = require('path');

const API_URL   = process.env.DDAS_API_URL || 'http://localhost:5000';
const WATCH_DIR = process.env.WATCH_DIR    || path.join(os.homedir(), 'Downloads');

let authToken = null;

// ── Compute SHA-256 from file path ────────────────────────────────────────
const hashFile = (filePath) => new Promise((resolve, reject) => {
  const hash   = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  stream.on('data',  chunk => hash.update(chunk));
  stream.on('end',   ()    => resolve(hash.digest('hex')));
  stream.on('error', reject);
});

// ── Login to get JWT token ────────────────────────────────────────────────
const login = async () => {
  try {
    const res = await axios.post(`${API_URL}/api/auth/login`, {
      email:    process.env.DDAS_EMAIL,
      password: process.env.DDAS_PASSWORD,
    });
    authToken = res.data.token;
    console.log(`✅  Authenticated as ${process.env.DDAS_EMAIL}`);
  } catch (err) {
    console.error('❌  Login failed:', err.response?.data?.message || err.message);
    process.exit(1);
  }
};

// ── Fire OS notification ──────────────────────────────────────────────────
const notify = ({ title, message, isWarning = false }) => {
  notifier.notify({
    title,
    message,
    icon:    path.join(__dirname, 'icon.png'), // optional — add a png if you want
    sound:   isWarning,
    wait:    false,
  });
};

// ── Check file against DDAS API ───────────────────────────────────────────
const checkFile = async (filePath) => {
  const fileName = path.basename(filePath);

  // Skip hidden files, temp files, partial downloads
  if (fileName.startsWith('.') || fileName.endsWith('.crdownload') || fileName.endsWith('.part')) {
    return;
  }

  // Wait 500ms to ensure file is fully written
  await new Promise(r => setTimeout(r, 500));

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return;

    console.log(`\n🔍  New file detected: ${fileName}`);
    console.log(`    Computing SHA-256 hash...`);

    const hash = await hashFile(filePath);
    console.log(`    Hash: ${hash.slice(0, 16)}...`);

    const res = await axios.post(
      `${API_URL}/api/files/check`,
      { hash, fileName, fileSize: stat.size, source: 'agent' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (res.data.isDuplicate) {
      const orig      = res.data.originalFile;
      const isNear    = res.data.matchKind === 'near';
      const kindLabel = isNear ? 'NEAR-DUPLICATE' : 'DUPLICATE';
      console.log(`\n⚠️   ${kindLabel} DETECTED!`);
      console.log(`    Original: ${orig.fileName}`);
      console.log(`    Uploaded by: ${orig.uploadedBy?.name || 'another user'}`);

      notify({
        title:     `⚠️ DDAS — ${isNear ? 'Near-duplicate' : 'Duplicate'} File Detected!`,
        message:   `"${fileName}" ${isNear ? 'looks nearly identical to' : 'already exists as'} a file in the registry.\nOriginal by: ${orig.uploadedBy?.name || 'another user'}`,
        isWarning: true,
      });
    } else {
      console.log(`    ✅  File is unique — no duplicate found`);
      notify({
        title:   'DDAS — File is Unique',
        message: `"${fileName}" is not a duplicate.`,
      });
    }
  } catch (err) {
    if (err.response?.status === 401) {
      // Token expired — re-login
      console.log('    Token expired, re-authenticating...');
      await login();
      return checkFile(filePath);
    }
    console.error(`    Error checking file: ${err.message}`);
  }
};

// ── Main ──────────────────────────────────────────────────────────────────
const main = async () => {
  console.log('\n════════════════════════════════════════');
  console.log('  DDAS Desktop Agent');
  console.log('  Data Download Duplication Alert System');
  console.log('════════════════════════════════════════\n');

  await login();

  console.log(`\n👁   Watching: ${WATCH_DIR}`);
  console.log('    (Press Ctrl+C to stop)\n');

  const watcher = chokidar.watch(WATCH_DIR, {
    persistent:    true,
    ignoreInitial: true,       // don't scan existing files on startup
    awaitWriteFinish: {
      stabilityThreshold: 1000, // wait 1s after last write
      pollInterval:       100,
    },
  });

  watcher.on('add', checkFile);

  watcher.on('error', err => console.error('Watcher error:', err));
};

main();
