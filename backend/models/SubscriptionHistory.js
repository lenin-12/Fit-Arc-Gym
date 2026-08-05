const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    planName: {
      type: String,
      required: true,
      enum: ['basic', 'premium', 'pro_ai_vip']
    },
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['active', 'failed', 'cancelled', 'expired'],
      default: 'active'
    },
    transactionId: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
