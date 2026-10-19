const mongoose = require('mongoose');

const platformWalletSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      default: 'PLATFORM_WALLET',
      immutable: true
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Platform balance cannot be negative']
    },
    totalRevenue: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    totalTransactions: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'CREDITS'
    },
    lastTransactionAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

/**
 * Singleton retrieval or atomic initialization helper
 */
platformWalletSchema.statics.getOrCreateSingleton = async function (session = null) {
  const query = { identifier: 'PLATFORM_WALLET' };
  let wallet = await this.findOne(query).session(session);

  if (!wallet) {
    try {
      const docs = await this.create(
        [
          {
            identifier: 'PLATFORM_WALLET',
            balance: 0,
            totalRevenue: 0,
            totalTransactions: 0,
            currency: 'CREDITS'
          }
        ],
        { session }
      );
      wallet = docs[0];
    } catch (err) {
      // Handle race condition if created concurrently
      if (err.code === 11000) {
        wallet = await this.findOne(query).session(session);
      } else {
        throw err;
      }
    }
  }

  return wallet;
};

module.exports = mongoose.model('PlatformWallet', platformWalletSchema);
