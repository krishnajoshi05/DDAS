const crypto = require('crypto');
const fs     = require('fs');

/**
 * Compute SHA-256 hash from a Buffer (used during upload via multer memoryStorage)
 */
const hashFromBuffer = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Compute SHA-256 hash from a file path (used by desktop agent)
 */
const hashFromPath = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash   = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end',  ()      => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

/**
 * Simple equality check
 */
const compareHashes = (h1, h2) => h1 === h2;

module.exports = { hashFromBuffer, hashFromPath, compareHashes };
