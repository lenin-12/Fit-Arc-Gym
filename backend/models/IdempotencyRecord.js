const mongoose = require('mongoose');

const idempotencyRecordSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    requestPath: {
      type: String,
      required: true
    },
    requestPayloadHash: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING',
      required: true
    },
    responseStatus: {
      type: Number,
      default: null
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 // TTL 24 hours
    }
  },
  {
    timestamps: true
  }
);

// Compound index on key and userId
idempotencyRecordSchema.index({ key: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
