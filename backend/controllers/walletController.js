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


// ------------------------------------------------------------
// Idempotency lock helper
// ------------------------------------------------------------
const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // PROCESSING older than this is treated as crashed

/**
 * Returns one of:
 *  { action: 'PROCEED' }                  -> lock acquired, run the payment
 *  { action: 'REPLAY', status, body }     -> same key already completed, return saved response
 *  { action: 'REJECT', status, message }  -> conflict / payload mismatch
 */
const acquireIdempotencyLock = async ({ key, userId, requestPath, payloadHash }) => {
  // Step 1: try to INSERT. The unique index guarantees only one request wins.
  try {
    await IdempotencyRecord.create({
      key,
      userId,
      requestPath,
      requestPayloadHash: payloadHash,
      status: 'PROCESSING',
      lockedAt: new Date()
    });
    return { action: 'PROCEED' };
  } catch (err) {
    if (err.code !== 11000) throw err; // real error, not a duplicate
  }

  // Step 2: record already exists, so decide based on its state
  const existing = await IdempotencyRecord.findOne({ key, userId });
  if (!existing) {
    // Deleted between our insert and read (TTL). Very rare, so ask client to retry.
    return { action: 'REJECT', status: 409, message: 'Please retry the request.' };
  }

  if (existing.requestPayloadHash !== payloadHash) {
    return {
      action: 'REJECT',
      status: 422,
      message: 'Idempotency key was previously used with a different request payload'
    };
  }

  if (existing.status === 'COMPLETED') {
    return {
      action: 'REPLAY',
      status: existing.responseStatus || 200,
      body: existing.responseBody
    };
  }

  // Step 3: FAILED, or PROCESSING but stale -> atomically take over the lock.
  // The filter makes sure only ONE concurrent retry can win the takeover.
  const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MS);
  const takenOver = await IdempotencyRecord.findOneAndUpdate(
    {
      key,
      userId,
      $or: [
        { status: 'FAILED' },
        { status: 'PROCESSING', lockedAt: { $lt: staleBefore } }
      ]
    },
    {
      $set: { status: 'PROCESSING', lockedAt: new Date() },
      $unset: { responseStatus: '', responseBody: '' }
    },
    { new: true }
  );

  if (takenOver) return { action: 'PROCEED' };

  // Still PROCESSING and fresh, or another retry just took it
  return {
    action: 'REJECT',
    status: 409,
    message: 'A payment with this idempotency key is currently processing. Please wait.'
  };
};


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

  if (!idempotencyKey || !String(idempotencyKey).trim()) {
    return sendError(res, 'idempotencyKey is required', 400);
  }
  const sanitizedIdempotencyKey = String(idempotencyKey).trim();

  // Check transaction support BEFORE taking the lock (no cleanup needed on failure)
  let session;
  try {
    session = await mongoose.startSession();
  } catch (sessErr) {
    return sendError(
      res,
      'MongoDB multi-document transactions require a replica set or mongos cluster.',
      503
    );
  }

  try {
    // ---- Idempotency lock ----
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ userId: userId.toString(), planKey: targetKey }))
      .digest('hex');

    const lock = await acquireIdempotencyLock({
      key: sanitizedIdempotencyKey,
      userId,
      requestPath: req.originalUrl || req.path,
      payloadHash
    });

    if (lock.action === 'REPLAY') {
      return res.status(lock.status).json(lock.body);
    }
    if (lock.action === 'REJECT') {
      return sendError(res, lock.message, lock.status);
    }

    // ---- Transaction ----
    let result = null;

    try {
      await session.withTransaction(async () => {
        // Step 1: Load user inside the transaction
        const freshUser = await User.findById(userId).session(session);
        if (!freshUser) {
          const err = new Error('USER_NOT_FOUND');
          err.statusCode = 404;
          throw err;
        }

        // Step 2: Authoritative pricing calculation
        const pricing = calculateAuthoritativePayable(freshUser, targetKey);
        const {
          targetTier,
          payableAmount,
          transactionType,
          price,
          tax,
          targetTotal,
          upgradeCredit,
          currentPlanKey
        } = pricing;

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

        // Step 7: Record WalletTransaction, Payment, SubscriptionHistory
        const transactionId =
          'WTX_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8).toUpperCase();

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
              idempotencyKey: sanitizedIdempotencyKey,
              balanceBefore,
              balanceAfter,
              metadata: {
                subtotal: price,
                tax,
                targetTotal,
                upgradeCredit,
                previousPlan: currentPlanKey,
                planDurationDays: durationDays
              }
            }
          ],
          { session }
        );

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

        // Committed atomically together with the payment
        await IdempotencyRecord.findOneAndUpdate(
          { key: sanitizedIdempotencyKey, userId },
          { $set: { status: 'COMPLETED', responseStatus: 200, responseBody: result } },
          { session }
        );
      });
    } catch (txnError) {
      // Transaction already rolled back. Mark the lock FAILED so the client can retry.
      // Filter on PROCESSING so we never overwrite a COMPLETED record.
      try {
        await IdempotencyRecord.findOneAndUpdate(
          { key: sanitizedIdempotencyKey, userId, status: 'PROCESSING' },
          {
            $set: {
              status: 'FAILED',
              responseStatus: txnError.statusCode || 400,
              responseBody: {
                success: false,
                message: txnError.message || 'Payment transaction failed'
              }
            }
          }
        );
      } catch (markErr) {
        console.warn('Could not mark idempotency record FAILED:', markErr.message);
      }
      throw txnError;
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Wallet Payment Transaction Error:', error);

    if (error.message === 'ALREADY_ON_PLAN') {
      return sendError(res, 'You are already on this plan. No charge was made.', 409);
    }

    if (error.message === 'DOWNGRADE_NOT_ALLOWED') {
      return sendError(
        res,
        'Downgrading to a lower plan is not supported while your current plan is active.',
        409
      );
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

    return sendError(
      res,
      error.message || 'Payment transaction failed and was rolled back.',
      error.statusCode || 500
    );
  } finally {
    await session.endSession();
  }
};


const getPlanQuote = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const targetKey = normalizePlanKey(req.query.plan);
    if (!targetKey || !PLAN_TIERS[targetKey]) {
      return sendError(res, 'Invalid or non-existent gym plan selected', 400);
    }

    const user = await User.findById(userId).select(
      'walletBalance currentPlan plan planStartDate planExpiryDate paymentStatus'
    );
    if (!user) {
      return sendError(res, 'User account not found', 404);
    }

    const walletBalance = user.walletBalance || 0;
    const currentPlan = normalizePlanKey(user.currentPlan || user.plan) || 'basic';

    if (targetKey === 'basic') {
      return sendSuccess(res, 'Quote generated', {
        currentPlan, targetPlan: targetKey, canPurchase: false,
        reason: 'BASIC_IS_FREE', walletBalance
      });
    }

    let pricing;
    try {
      pricing = calculateAuthoritativePayable(user, targetKey);
    } catch (err) {
      if (err.message === 'ALREADY_ON_PLAN' || err.message === 'DOWNGRADE_NOT_ALLOWED') {
        return sendSuccess(res, 'Quote generated', {
          currentPlan, targetPlan: targetKey, canPurchase: false,
          reason: err.message, walletBalance
        });
      }
      throw err;
    }

    const shortfall = Math.max(0, pricing.payableAmount - walletBalance);
    return sendSuccess(res, 'Quote generated', {
      currentPlan,
      targetPlan: targetKey,
      targetPlanName: pricing.targetTier.name,
      transactionType: pricing.transactionType,
      price: pricing.price,
      tax: pricing.tax,
      targetTotal: pricing.targetTotal,
      upgradeCredit: pricing.upgradeCredit,
      payableAmount: pricing.payableAmount,
      walletBalance,
      projectedBalance: walletBalance - pricing.payableAmount,
      shortfall,
      canPurchase: shortfall === 0,
      reason: shortfall > 0 ? 'INSUFFICIENT_FUNDS' : null
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to generate quote', 500);
  }
};


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
  getPlanQuote,
  getAdminWallet,
  getAdminTransactions,
  calculateAuthoritativePayable
};