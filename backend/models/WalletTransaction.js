const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    transactionType: {
      type: String,
      enum: ['REGISTRATION_BONUS', 'PLAN_PURCHASE', 'PLAN_UPGRADE', 'PLAN_RENEWAL', 'REFUND'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Transaction amount must be non-negative']
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
      default: 'COMPLETED',
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    relatedPlanId: {
      type: String,
      enum: ['basic', 'premium', 'pro_ai_vip', 'none', null],
      default: null
    },
    relatedOrderId: {
      type: String,
      default: null
    },
    idempotencyKey: {
      type: String,
      default: null,
      sparse: true,
      index: true
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast user transaction history queries ordered by recency
walletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
