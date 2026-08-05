const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    method: {
      type: String,
      enum: ['card', 'upi', 'net_banking', 'wallet'],
      default: 'card'
    },
    status: {
      type: String,
      enum: ['active', 'success', 'pending', 'failed'],
      default: 'pending'
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

module.exports = mongoose.model('Payment', paymentSchema);
