
const mongoose = require('mongoose');

const idempotencyRecordSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestPath: String,
    requestPayloadHash: { type: String, required: true },
    status: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PROCESSING'
    },
    lockedAt: { type: Date, default: Date.now }, 
    responseStatus: Number,
    responseBody: mongoose.Schema.Types.Mixed
  }
  { timestamps: true }
);


idempotencyRecordSchema.index({ key: 1, userId: 1 }, { unique: true });


idempotencyRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);