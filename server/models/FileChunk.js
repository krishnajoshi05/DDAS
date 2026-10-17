const mongoose = require('mongoose');

/**
 * FileChunk — per-organisation index of content-defined chunk hashes.
 *
 * One document per (chunkHash, organization) pair. The `refs` array
 * lists every FileRecord that contains this chunk, with the offset
 * inside that file. Looking up partial duplicates becomes:
 *
 *   1. Chunk the uploaded buffer        → chunkHashes[]
 *   2. db.filechunks.find({ hash:{$in:chunkHashes}, organization })
 *   3. Group by ref.fileRecord, sum sizes → overlap per existing file
 *
 * That's a single Mongo query regardless of how many files exist.
 */
const FileChunkSchema = new mongoose.Schema(
  {
    hash: {
      type: String,            // SHA-256 hex of the chunk's raw bytes
      required: true,
    },
    size: {
      type: Number,            // bytes; identical chunk hash ⇒ identical size
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    refs: [
      {
        fileRecord: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FileRecord',
          required: true,
        },
        offset: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

// One document per (hash, organization).
FileChunkSchema.index({ hash: 1, organization: 1 }, { unique: true });
// For dashboard queries.
FileChunkSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model('FileChunk', FileChunkSchema);
