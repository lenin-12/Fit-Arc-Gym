/**
 * Shared Subscription & Plan Date Math Utility (UTC based)
 */

const PLAN_TIERS = {
  basic: {
    key: 'basic',
    name: 'Basic Plan',
    price: 1999,
    duration: 30,
    features: ['Standard Gym Access', 'Basic Workout Tracker', 'Community Forum Access']
  },
  premium: {
    key: 'premium',
    name: 'Premium Plan',
    price: 3499,
    duration: 30,
    features: [
      'Unlimited AI Fitness Coach',
      'Fitbod AI Workout Generator',
      'MyFitnessPal Diet Tracker',
      '1-on-1 Trainer Session'
    ]
  },
  pro_ai_vip: {
    key: 'pro_ai_vip',
    name: 'Pro AI VIP',
    price: 5999,
    duration: 30,
    features: [
      'All Premium AI Features',
      'Personalized Biomechanics Audit',
      'Custom Supplement Formulation',
      'Priority 24/7 VIP Support'
    ]
  }
};

const TAX_RATE = 0.18; // 18% GST

/**
 * Calculates plan derived metrics strictly from planStartDate and planExpiryDate.
 * Enforces identity invariant: elapsedDays + remainingDays === totalDays
 */
function calculatePlanMetrics(startDate, expiryDate, referenceDate = new Date()) {
  const start = new Date(startDate);
  const expiry = new Date(expiryDate);
  const ref = new Date(referenceDate);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  // totalDays calculation
  const diffTotalMs = Math.max(0, expiry.getTime() - start.getTime());
  const totalDays = Math.max(1, Math.round(diffTotalMs / MS_PER_DAY));

  // elapsedDays calculation (floor, min 0)
  const diffElapsedMs = ref.getTime() - start.getTime();
  const rawElapsed = Math.floor(diffElapsedMs / MS_PER_DAY);
  const elapsedDays = Math.min(totalDays, Math.max(0, rawElapsed));

  // remainingDays calculation (min 0, strictly guarantees totalDays = elapsedDays + remainingDays)
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  // progressPct (clamp 0 - 100)
  const rawProgress = Math.round((elapsedDays / totalDays) * 100);
  const progressPct = Math.min(100, Math.max(0, rawProgress));

  // currentDay (clamp to 1..totalDays)
  const currentDay = Math.min(totalDays, Math.max(1, elapsedDays + 1));

  // Status calculation
  let status = 'Active';
  if (remainingDays === 0) {
    status = 'Expired';
  } else if (remainingDays <= 5) {
    status = 'Expiring Soon';
  }

  return {
    elapsedDays,
    totalDays,
    remainingDays,
    progressPct,
    currentDay,
    status
  };
}

const normalizePlanKey = (planStr) => {
  if (!planStr) return null;
  const lower = planStr.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.includes('basic')) return 'basic';
  if (lower.includes('pro') || lower.includes('vip')) return 'pro_ai_vip';
  if (lower.includes('premium')) return 'premium';
  return null;
};

const PLAN_RANKS = {
  basic: 1,
  premium: 2,
  pro_ai_vip: 3
};

const calculateAuthoritativePayable = (user, targetKey) => {
  const targetTier = PLAN_TIERS[targetKey];
  if (!targetTier) {
    throw new Error('INVALID_PLAN');
  }

  const price = targetTier.price;
  const tax = Math.round(price * TAX_RATE);
  const targetTotal = price + tax;

  const currentPlanKey = normalizePlanKey(user.currentPlan || user.plan) || 'basic';
  const currentRank = PLAN_RANKS[currentPlanKey] || 1;
  const targetRank = PLAN_RANKS[targetKey] || 1;

  const now = new Date();
  const isCurrentPlanActive = user.paymentStatus === 'active' && user.planExpiryDate && new Date(user.planExpiryDate) > now;

  let transactionType = 'PLAN_PURCHASE';
  let payableAmount = targetTotal;

  if (currentPlanKey === targetKey && isCurrentPlanActive) {
    transactionType = 'PLAN_RENEWAL';
    payableAmount = targetTotal;
  } else if (targetRank > currentRank && isCurrentPlanActive) {
    const currentPrice = PLAN_TIERS[currentPlanKey]?.price || 0;
    const currentTax = Math.round(currentPrice * TAX_RATE);
    const currentTotal = currentPrice + currentTax;

    const upgradeDifference = Math.max(0, targetTotal - currentTotal);
    payableAmount = upgradeDifference > 0 ? upgradeDifference : targetTotal;
    transactionType = 'PLAN_UPGRADE';
  } else {
    transactionType = 'PLAN_PURCHASE';
    payableAmount = targetTotal;
  }

  return {
    targetKey,
    targetTier,
    price,
    tax,
    targetTotal,
    payableAmount,
    transactionType,
    currentPlanKey
  };
};

module.exports = {
  PLAN_TIERS,
  TAX_RATE,
  calculatePlanMetrics,
  normalizePlanKey,
  calculateAuthoritativePayable
};
