const { sendError } = require('../utils/apiResponse');

const PLAN_LEVELS = {
  basic: 1,
  premium: 2,
  pro_ai_vip: 3
};

/**
 * Middleware to enforce plan gating server-side
 * @param {'basic' | 'premium' | 'pro_ai_vip'} minPlanRequired 
 */
const requirePlan = (minPlanRequired = 'premium') => {
  return (req, res, next) => {
    const userPlan = (req.user && req.user.currentPlan) ? req.user.currentPlan.toLowerCase() : 'basic';
    const userLevel = PLAN_LEVELS[userPlan] || 1;
    const requiredLevel = PLAN_LEVELS[minPlanRequired.toLowerCase()] || 2;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `This feature is locked on your current ${userPlan.toUpperCase()} plan. Upgrade to unlock full access.`,
        upgradeRequired: true,
        redirect: '/dashboard/plan'
      });
    }

    next();
  };
};

module.exports = {
  requirePlan,
  PLAN_LEVELS
};
