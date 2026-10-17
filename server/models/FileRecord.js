const mongoose = require('mongoose');

/**
 * FileRecord
 *
 * Enterprise-grade intelligent file metadata model.
 *
 * Supports:
 * - Exact duplicate detection
 * - Near duplicate detection
 * - Cross-modal duplicate detection
 * - Content-defined chunking (CDC)
 * - AI similarity scoring
 * - Storage optimization analytics
 */

const FileRecordSchema = new mongoose.Schema(

  {

    /* BASIC FILE INFO */

    fileName: {

      type: String,

      required: true,

      trim: true,

    },

    originalName: {

      type: String,

      required: true,

    },

    fileSize: {

      type: Number,

      required: true,

    },

    mimeType: {

      type: String,

      required: true,

    },

    /* EXACT HASH */

    hash: {

      type: String,

      required: true,

      index: true,

    },

    /* CONTENT HASH */

    contentHash: {

      type: String,

      default: null,

      index: true,

    },

    contentHashKind: {

      type: String,

      enum: ['phash', 'text', null],

      default: null,

    },

    /* SOURCE FORMAT */

    sourceFormat: {

      type: String,

      enum: [

        'image',

        'pdf',

        'docx',

        'pptx',

        'html',

        'text',

        null

      ],

      default: null,

    },

    /* CDC CHUNKS */

    chunks: [

      {

        hash: String,

        size: Number,

        offset: Number,

      },

    ],

    chunkCount: {

      type: Number,

      default: 0,

    },

    /* ORGANIZATION */

    organization: {

      type: mongoose.Schema.Types.ObjectId,

      ref: 'Organization',

      index: true,

    },

    uploadedBy: {

      type: mongoose.Schema.Types.ObjectId,

      ref: 'User',

      required: true,

    },

    /* DUPLICATE STATUS */

    isDuplicate: {

      type: Boolean,

      default: false,

    },

    /* STANDARDIZED MATCH TYPE */

    matchKind: {

      type: String,

      enum: [

        'exact',

        'near',

        'partial',

        null

      ],

      default: null,

    },

    duplicateOf: {

      type: mongoose.Schema.Types.ObjectId,

      ref: 'FileRecord',

      default: null,

    },

    overlapPercent: {

      type: Number,

      default: null,

    },

    crossModal: {

      type: Boolean,

      default: false,

    },

    /* AI INTELLIGENCE */

    similarityScore: {

      type: Number,

      default: 0,

    },

    detectionEngine: {

      type: String,

      enum: [

        'SHA-256',

        'Perceptual Hash',

        'Cosine Similarity',

        'CDC',

        'Cross-Modal AI'

      ],

      default: 'SHA-256',

    },

    aiTags: {

      type: [String],

      default: [],

    },

    /* STORAGE OPTIMIZATION */

    storageSavedBytes: {

      type: Number,

      default: 0,

    },

    /* FILE STORAGE */

    filePath: {

      type: String,

      default: '',

    },

    fileUrl: {

      type: String,

      default: '',

    },

  },

  {

    timestamps: true,

  }

);

/* EXACT DUPLICATE */

FileRecordSchema.statics.findByHash =
function(hash, organizationId) {

  const query = {

    hash,

    isDuplicate: false,

  };

  if (organizationId) {

    query.organization =
      organizationId;

  }

  return this
    .findOne(query)
    .populate(
      'uploadedBy',
      'name email'
    );

};

/* NEAR DUPLICATE */

FileRecordSchema.statics.findByContentHash =
function(contentHash, kind, organizationId) {

  if (!contentHash) {

    return Promise.resolve(null);

  }

  const query = {

    contentHash,

    contentHashKind: kind,

    isDuplicate: false,

  };

  if (organizationId) {

    query.organization =
      organizationId;

  }

  return this
    .findOne(query)
    .populate(
      'uploadedBy',
      'name email'
    );

};

/* DASHBOARD HELPERS */

FileRecordSchema.statics.getAnalytics =
async function() {

  const totalFiles =
    await this.countDocuments();

  const exactDuplicates =
    await this.countDocuments({

      isDuplicate: true,

      matchKind: 'exact',

    });

  const nearDuplicates =
    await this.countDocuments({

      matchKind: 'near',

    });

  const partialDuplicates =
    await this.countDocuments({

      matchKind: 'partial',

    });

  const totalStorageAgg =
    await this.aggregate([

      {

        $group: {

          _id: null,

          total: {

            $sum: '$fileSize'

          }

        }

      }

    ]);

  const storageSavedAgg =
    await this.aggregate([

      {

        $group: {

          _id: null,

          total: {

            $sum: '$storageSavedBytes'

          }

        }

      }

    ]);

  return {

    totalFiles,

    exactDuplicates,

    nearDuplicates,

    partialDuplicates,

    totalStorage:
      totalStorageAgg[0]?.total || 0,

    storageSaved:
      storageSavedAgg[0]?.total || 0,

  };

};

module.exports =
  mongoose.model(
    'FileRecord',
    FileRecordSchema
  );