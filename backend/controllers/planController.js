const User = require('../models/User');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const Payment = require('../models/Payment');
const {
  PLAN_TIERS,
  TAX_RATE,
  calculatePlanMetrics,
  normalizePlanKey: sharedNormalizePlanKey
} = require('../utils/planUtils');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Shared normalizer: returns null for unknown plans (no silent 'premium' default)
const normalizePlanKey = (planStr) => sharedNormalizePlanKey(planStr);

// Map plan key to display title
const getPlanDisplayTitle = (key) => {
  switch (key) {
    case 'basic':
      return 'Basic Plan';
    case 'pro_ai_vip':
      return 'Pro AI VIP';
    case 'premium':
    default:
      return 'Premium Plan';
  }
};

/**
 * GET /api/plan
 * Current plan + derived progress fields
 */
const getPlanDetails = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, 'User not authenticated', 401);
    }

    const currentPlanKey = normalizePlanKey(user.currentPlan || user.plan) || 'basic';
    const planTier = PLAN_TIERS[currentPlanKey] || PLAN_TIERS.premium;

    // Use user dates if available, or initialize defaults
    const planStartDate = user.planStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const planExpiryDate = user.planExpiryDate || new Date(Date.now() + 23 * 24 * 60 * 60 * 1000);

    const metrics = calculatePlanMetrics(planStartDate, planExpiryDate);

    return sendSuccess(res, 'Plan details retrieved successfully', {
      currentPlan: currentPlanKey,
      planDisplayName: getPlanDisplayTitle(currentPlanKey),
      planStartDate,
      planExpiryDate,
      planDuration: user.planDuration || 30,
      paymentStatus: user.paymentStatus || 'active',
      lastPaymentDate: user.lastPaymentDate || planStartDate,
      metrics,
      tierDetails: planTier
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch plan details', 500);
  }
};

/**
 * GET /api/plan/status
 * Lightweight status check
 */
const getPlanStatus = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return sendError(res, 'User not authenticated', 401);
    }

    const currentPlanKey = normalizePlanKey(user.currentPlan || user.plan) || 'basic';
    const planStartDate = user.planStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const planExpiryDate = user.planExpiryDate || new Date(Date.now() + 23 * 24 * 60 * 60 * 1000);

    const metrics = calculatePlanMetrics(planStartDate, planExpiryDate);

    return sendSuccess(res, 'Plan status retrieved', {
      currentPlan: currentPlanKey,
      remainingDays: metrics.remainingDays,
      status: metrics.status,
      paymentStatus: user.paymentStatus || 'active'
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch plan status', 500);
  }
};

/**
 * POST /api/plan/select
 * Intended plan selection, returns draft order details
 */
const selectPlan = async (req, res) => {
  try {
    const { planName } = req.body;
    const targetKey = normalizePlanKey(planName);

    const tier = PLAN_TIERS[targetKey];
    if (!tier) {
      return sendError(res, 'Invalid plan tier selected', 400);
    }

    const price = tier.price;
    const tax = Math.round(price * TAX_RATE);
    const total = price + tax;

    const draftOrder = {
      planKey: targetKey,
      planName: tier.name,
      duration: tier.duration,
      price,
      tax,
      taxRate: TAX_RATE,
      total,
      currency: 'INR',
      features: tier.features
    };

    return sendSuccess(res, 'Plan draft order generated', draftOrder);
  } catch (error) {
    return sendError(res, error.message || 'Failed to select plan', 500);
  }
};

/**
 * POST /api/payment/create
 * Creates payment order with payment gateway
 */
const createPayment = async (req, res) => {
  try {
    const { planName, method = 'card' } = req.body;
    const targetKey = normalizePlanKey(planName);
    const tier = PLAN_TIERS[targetKey];

    if (!tier) {
      return sendError(res, 'Invalid plan tier', 400);
    }

    const price = tier.price;
    const tax = Math.round(price * TAX_RATE);
    const total = price + tax;
    const transactionId = 'TXN_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

    // Save pending payment record if Mongoose connected
    try {
      await Payment.create({
        userId: req.user._id || req.user.id,
        planName: targetKey,
        amount: price,
        tax,
        total,
        method,
        status: 'pending',
        transactionId
      });
    } catch (e) {
      console.warn('Mongo payment draft write skipped (local dev mode):', e.message);
    }

    return sendSuccess(res, 'Payment transaction initiated', {
      transactionId,
      planKey: targetKey,
      planName: tier.name,
      amount: price,
      tax,
      total,
      currency: 'INR',
      method
    });
  } catch (error) {
    return sendError(res, error.message || 'Payment initiation failed', 500);
  }
};

/**
 * POST /api/payment/success
 * SECURITY: this endpoint no longer activates plans. Plans are activated ONLY by the
 * wallet purchase endpoint (inside its DB transaction). This route just confirms the
 * state of a payment that the wallet flow already completed for the same user.
 */
const processPaymentSuccess = async (req, res) => {
  try {
    const { transactionId, success = true } = req.body;
    const userId = req.user._id || req.user.id;

    if (!transactionId) {
      return sendError(res, 'Transaction ID is required', 400);
    }

    if (!success) {
      // Mark only this pending payment as failed. Never touch the user's plan state.
      try {
        await Payment.findOneAndUpdate(
          { transactionId, userId, status: 'pending' },
          { status: 'failed' }
        );
      } catch (e) {}
      return sendError(res, 'Payment transaction failed or was cancelled', 400);
    }

    let payment = null;
    try {
      payment = await Payment.findOne({ transactionId, userId, status: 'success' });
    } catch (e) {}

    if (!payment) {
      return sendError(
        res,
        'No completed payment found for this transaction. Plans are activated only by a successful wallet payment.',
        402
      );
    }

    const displayTitle = getPlanDisplayTitle(payment.planName);
    return sendSuccess(res, `Your ${displayTitle} is active.`, {
      user: req.user,
      subscription: {
        planName: displayTitle,
        planKey: payment.planName,
        paymentStatus: 'active',
        transactionId
      }
    });
  } catch (error) {
    return sendError(res, error.message || 'Payment verification failed', 500);
  }
};

/**
 * GET /api/payment/history
 * Subscription & payment history for authenticated user
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let subscriptions = [];
    let payments = [];

    try {
      subscriptions = await SubscriptionHistory.find({ userId }).sort({ createdAt: -1 });
      payments = await Payment.find({ userId }).sort({ createdAt: -1 });
    } catch (e) {}

    return sendSuccess(res, 'Payment history retrieved', {
      subscriptions,
      payments
    });
  } catch (error) {
    return sendError(res, error.message || 'Failed to fetch payment history', 500);
  }
};

module.exports = {
  getPlanDetails,
  getPlanStatus,
  selectPlan,
  createPayment,
  processPaymentSuccess,
  getPaymentHistory
};