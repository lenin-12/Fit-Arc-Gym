const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const PlatformWallet = require('../models/PlatformWallet');
const WalletTransaction = require('../models/WalletTransaction');
const IdempotencyRecord = require('../models/IdempotencyRecord');
const Payment = require('../models/Payment');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const {
  PLAN_TIERS,
  TAX_RATE,
  normalizePlanKey,
  calculateAuthoritativePayable
} = require('../utils/planUtils');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const mockUsersStore = require('../services/mockDbStore');

/**
 * GET /api/wallet
 * Returns authenticated user's wallet balance
 */
const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let balance = req.user.walletBalance;
    let role = req.user.role || 'user';

    try {
      const dbUser = await User.findById(userId).select('walletBalance role email name currentPlan plan');
      if (dbUser) {
        balance = dbUser.walletBalance;
        role = dbUser.role || 'user';
      }
    } catch (dbErr) {
      // In-memory mock store fallback
      if (mockUsersStore[userId]) {
        balance = mockUsersStore[userId].walletBalance ?? 15000;
        role = mockUsersStore[userId].role || 'user';
      }
    }

    return sendSuccess(res, 'Wallet balance retrieved successfully', {
      walletBalance: balance !== undefined ? balance : 15000,
      currency: 'CREDITS',
      role,
      user: {
        id: userId,
        email: req.user.email,
        name: req.user.name,
        currentPlan: req.user.currentPlan,
        plan: req.user.plan
      }
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch wallet balance', 500);
  }
};

/**
 * GET /api/wallet/transactions
 * Returns authenticated user's paginated wallet transaction history
 */
const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    let transactions = [];
    let total = 0;

    try {
      [transactions, total] = await Promise.all([
        WalletTransaction.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        WalletTransaction.countDocuments({ userId })
      ]);
    } catch (dbErr) {
      transactions = [];
      total = 0;
    }

    return sendSuccess(res, 'Wallet transactions retrieved successfully', {
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch wallet transactions', 500);
  }
};

/**
 * POST /api/payments/plan (also handles POST /api/payment/wallet)
 * Purchase or upgrade a plan using wallet credits with ACID transactions and idempotency
 */
const purchasePlanWithWallet = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { planName, idempotencyKey } = req.body;

  if (!planName) {
    return sendError(res, 'Plan name is required', 400);
  }

  const targetKey = normalizePlanKey(planName);
  if (!targetKey || !PLAN_TIERS[targetKey]) {
    return sendError(res, 'Invalid or non-existent gym plan selected', 400);
  }

  if (targetKey === 'basic') {
    return sendError(res, 'Basic plan is free and does not require credit payment', 400);
  }

  // 1. Idempotency Check & Record Initialization
  let idempotencyRecord = null;
  const sanitizedIdempotencyKey = idempotencyKey ? String(idempotencyKey).trim() : null;

  if (sanitizedIdempotencyKey) {
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ userId: userId.toString(), planKey: targetKey }))
      .digest('hex');

    try {
      const existing = await IdempotencyRecord.findOne({
        key: sanitizedIdempotencyKey,
        userId
      });

      if (existing) {
        if (existing.status === 'COMPLETED') {
          // Verify payload matches
          if (existing.requestPayloadHash !== payloadHash) {
            return sendError(
              res,
              'Idempotency key was previously used with a different request payload',
              422
            );
          }
          // Return cached idempotent response
          return res.status(existing.responseStatus || 200).json(existing.responseBody);
        } else if (existing.status === 'PROCESSING') {
          return sendError(
            res,
            'A payment with this idempotency key is currently processing. Please wait.',
            409
          );
        }
      }

      // Create new PROCESSING idempotency record
      idempotencyRecord = await IdempotencyRecord.findOneAndUpdate(
        { key: sanitizedIdempotencyKey, userId },
        {
          $setOnInsert: {
            key: sanitizedIdempotencyKey,
            userId,
            requestPath: req.originalUrl || req.path,
            requestPayloadHash: payloadHash,
            status: 'PROCESSING'
          }
        },
        { upsert: true, new: true }
      );
    } catch (idempErr) {
      // If duplicate key error during insert, another request just created it
      if (idempErr.code === 11000) {
        return sendError(
          res,
          'A payment with this idempotency key is currently processing. Please wait.',
          409
        );
      }
      console.warn('Idempotency initialization warning:', idempErr.message);
    }
  }

  // 2. Start Mongoose Session for ACID Multi-Document Transaction
  let session = null;
  let useTransactions = true;

  try {
    session = await mongoose.startSession();
  } catch (sessErr) {
    console.warn('MongoDB sessions not available:', sessErr.message);
    useTransactions = false;
  }

  try {
    let result = null;

    if (useTransactions && session) {
      await session.withTransaction(async () => {
        // Step 1: Load and lock user document inside the transaction
        const freshUser = await User.findById(userId).session(session);
        if (!freshUser) {
          const err = new Error('USER_NOT_FOUND');
          err.statusCode = 404;
          throw err;
        }

        // Step 2: Authoritative pricing calculation
        const pricing = calculateAuthoritativePayable(freshUser, targetKey);
        const { targetTier, payableAmount, transactionType, price, tax, currentPlanKey } = pricing;

        // Step 3: Check sufficient balance
        if (freshUser.walletBalance < payableAmount) {
          const err = new Error('INSUFFICIENT_FUNDS');
          err.statusCode = 400;
          err.details = {
            required: payableAmount,
            available: freshUser.walletBalance,
            shortage: payableAmount - freshUser.walletBalance
          };
          throw err;
        }

        const balanceBefore = freshUser.walletBalance;

        // Step 4: Conditionally deduct wallet credits from user
        const updatedUser = await User.findOneAndUpdate(
          { _id: userId, walletBalance: { $gte: payableAmount } },
          { $inc: { walletBalance: -payableAmount } },
          { session, new: true, runValidators: true }
        );

        if (!updatedUser) {
          const err = new Error('INSUFFICIENT_FUNDS');
          err.statusCode = 400;
          throw err;
        }

        const balanceAfter = updatedUser.walletBalance;

        // Step 5: Atomically credit platform wallet singleton
        await PlatformWallet.findOneAndUpdate(
          { identifier: 'PLATFORM_WALLET' },
          {
            $inc: {
              balance: payableAmount,
              totalRevenue: payableAmount,
              totalTransactions: 1
            },
            $set: { lastTransactionAt: new Date() }
          },
          { session, upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Step 6: Update user plan activation
        const now = new Date();
        const durationDays = targetTier.duration;
        const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

        updatedUser.currentPlan = targetKey;
        updatedUser.plan = targetTier.name;
        updatedUser.planStartDate = now;
        updatedUser.planExpiryDate = expiryDate;
        updatedUser.planDuration = durationDays;
        updatedUser.paymentStatus = 'active';
        updatedUser.lastPaymentDate = now;
        await updatedUser.save({ session });

        // Step 7: Create unique transaction identifiers and record WalletTransaction
        const transactionId = 'WTX_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const txnIdempKey = sanitizedIdempotencyKey || transactionId;

        const [walletTxn] = await WalletTransaction.create(
          [
            {
              userId,
              transactionType,
              amount: payableAmount,
              status: 'COMPLETED',
              description: `Paid ${payableAmount} credits for ${targetTier.name}`,
              relatedPlanId: targetKey,
              relatedOrderId: transactionId,
              idempotencyKey: txnIdempKey,
              balanceBefore,
              balanceAfter,
              metadata: {
                subtotal: price,
                tax,
                previousPlan: currentPlanKey,
                planDurationDays: durationDays
              }
            }
          ],
          { session }
        );

        // Step 8: Create Payment and SubscriptionHistory records
        await Payment.create(
          [
            {
              userId,
              planName: targetKey,
              amount: price,
              tax,
              total: payableAmount,
              method: 'wallet',
              status: 'success',
              transactionId
            }
          ],
          { session }
        );

        await SubscriptionHistory.create(
          [
            {
              userId,
              planName: targetKey,
              purchaseDate: now,
              expiryDate,
              amount: payableAmount,
              paymentStatus: 'active',
              transactionId
            }
          ],
          { session }
        );

        result = {
          success: true,
          message: `Your ${targetTier.name} has been activated successfully!`,
          data: {
            transactionId,
            planName: targetTier.name,
            planKey: targetKey,
            amountPaid: payableAmount,
            walletBalance: balanceAfter,
            planStartDate: now,
            planExpiryDate: expiryDate,
            paymentStatus: 'active',
            transaction: walletTxn,
            user: updatedUser.toJSON()
          }
        };
      });
    } else {
      // If transactions are not supported by the deployment environment
      const errorMsg = 'MongoDB multi-document transactions require a replica set or mongos cluster. Standalone servers do not support transactions.';
      if (sanitizedIdempotencyKey && idempotencyRecord) {
        await IdempotencyRecord.deleteOne({ key: sanitizedIdempotencyKey, userId });
      }
      return sendError(res, errorMsg, 503);
    }

    // 3. Mark Idempotency Record as COMPLETED
    if (sanitizedIdempotencyKey) {
      try {
        await IdempotencyRecord.findOneAndUpdate(
          { key: sanitizedIdempotencyKey, userId },
          {
            $set: {
              status: 'COMPLETED',
              responseStatus: 200,
              responseBody: result
            }
          }
        );
      } catch (e) {
        console.warn('Failed to update idempotency record status:', e.message);
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    // Transaction rolled back automatically
    console.error('Wallet Payment Transaction Error:', error);

    // Clean up or mark idempotency record as FAILED
    if (sanitizedIdempotencyKey) {
      try {
        await IdempotencyRecord.findOneAndUpdate(
          { key: sanitizedIdempotencyKey, userId },
          {
            $set: {
              status: 'FAILED',
              responseStatus: error.statusCode || 400,
              responseBody: {
                success: false,
                message: error.message || 'Payment transaction failed'
              }
            }
          }
        );
      } catch (cleanErr) {}
    }

    if (error.message === 'INSUFFICIENT_FUNDS') {
      return sendError(
        res,
        `Insufficient wallet balance. You need ${error.details?.required || 'more'} credits to complete this payment.`,
        400,
        error.details
      );
    }

    if (error.message === 'USER_NOT_FOUND') {
      return sendError(res, 'User account not found', 404);
    }

    if (error.message === 'INVALID_PLAN') {
      return sendError(res, 'The selected plan does not exist or is invalid', 400);
    }

    return sendError(res, error.message || 'Payment transaction failed and was rolled back.', error.statusCode || 500);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

/**
 * GET /api/admin/wallet
 * Returns platform wallet balance and revenue statistics (Admin only)
 */
const getAdminWallet = async (req, res) => {
  try {
    const platformWallet = await PlatformWallet.getOrCreateSingleton();

    // Query aggregated stats from WalletTransaction
    const [statsResult] = await WalletTransaction.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$transactionType', ['PLAN_PURCHASE', 'PLAN_UPGRADE', 'PLAN_RENEWAL']] },
                '$amount',
                0
              ]
            }
          },
          totalBonusesGranted: {
            $sum: {
              $cond: [{ $eq: ['$transactionType', 'REGISTRATION_BONUS'] }, '$amount', 0]
            }
          },
          totalCompletedTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const stats = statsResult || {
      totalRevenue: platformWallet.totalRevenue || 0,
      totalBonusesGranted: 0,
      totalCompletedTransactions: platformWallet.totalTransactions || 0
    };

    return sendSuccess(res, 'Platform wallet data retrieved successfully', {
      platformBalance: platformWallet.balance,
      totalRevenue: stats.totalRevenue || platformWallet.totalRevenue,
      totalBonusesGranted: stats.totalBonusesGranted,
      totalTransactions: stats.totalCompletedTransactions || platformWallet.totalTransactions,
      currency: platformWallet.currency,
      lastTransactionAt: platformWallet.lastTransactionAt,
      updatedAt: platformWallet.updatedAt
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to retrieve admin platform wallet', 500);
  }
};

/**
 * GET /api/admin/transactions
 * Returns system-wide wallet transactions (Admin only)
 */
const getAdminTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) {
      filter.transactionType = req.query.type;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .populate('userId', 'name email currentPlan')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments(filter)
    ]);

    return sendSuccess(res, 'Admin transactions retrieved successfully', {
      transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to retrieve admin transactions', 500);
  }
};

module.exports = {
  getWalletBalance,
  getWalletTransactions,
  purchasePlanWithWallet,
  getAdminWallet,
  getAdminTransactions,
  calculateAuthoritativePayable
};
