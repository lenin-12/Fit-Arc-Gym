const User = require('../models/User');
const Payment = require('../models/Payment');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const mockUsersStore = require('../services/mockDbStore');

/**
 * Stage A — Existing User Audit Utility
 * Inspects all users currently marked on premium/pro plans without paid transaction records
 * and safely resets them to basic free tier.
 */
const auditUsersPlan = async () => {
  try {
    // 1. Mongo DB Audit
    let mongoUsers = [];
    try {
      mongoUsers = await User.find({ currentPlan: { $in: ['premium', 'pro_ai_vip'] } });
    } catch (err) {
      mongoUsers = [];
    }

    for (const u of mongoUsers) {
      try {
        const paymentRecord = await Payment.findOne({
          userId: u._id,
          status: { $in: ['active', 'success'] }
        });
        const subRecord = await SubscriptionHistory.findOne({
          userId: u._id,
          paymentStatus: 'active'
        });

        if (!paymentRecord && !subRecord) {
          u.currentPlan = 'basic';
          u.plan = 'Basic Plan';
          u.paymentStatus = 'free';
          u.planStartDate = null;
          u.planExpiryDate = null;
          await u.save();
          console.log(`[Stage A Audit] Reset unpaid user ${u.email} to basic plan.`);
        }
      } catch (e) {
        console.error(`[Stage A Audit] Error auditing Mongo user ${u.email}:`, e);
      }
    }

    // 2. Mock Store Audit
    Object.values(mockUsersStore).forEach((u) => {
      if (u && (u.currentPlan === 'premium' || u.currentPlan === 'pro_ai_vip' || u.plan === 'Premium Plan')) {
        // If mock user has no active transaction ID
        if (!u.lastTransactionId) {
          u.currentPlan = 'basic';
          u.plan = 'Basic Plan';
          u.paymentStatus = 'free';
          u.planStartDate = null;
          u.planExpiryDate = null;
          console.log(`[Stage A Audit] Reset mock store user ${u.email} to basic plan.`);
        }
      }
    });
  } catch (error) {
    console.error('[Stage A Audit] User plan audit failed:', error);
  }
};

module.exports = { auditUsersPlan };
