
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


const calcTax = (price) => Math.round((price * Math.round(TAX_RATE * 100)) / 100);

const planError = (code, statusCode = 409) => {
  const err = new Error(code);
  err.statusCode = statusCode;
  return err;
};


const INACTIVE_STATUSES = ['cancelled', 'canceled', 'expired', 'refunded'];

const isPlanActive = (user, now = new Date()) => {
  if (!user || !user.planExpiryDate) return false;
  if (new Date(user.planExpiryDate) <= now) return false;
  return !INACTIVE_STATUSES.includes(String(user.paymentStatus || '').toLowerCase());
};


const calculateAuthoritativePayable = (user, targetKey, now = new Date()) => {
  const targetTier = PLAN_TIERS[targetKey];
  if (!targetTier) {
    throw planError('INVALID_PLAN', 400);
  }

  const price = targetTier.price;
  const tax = calcTax(price);
  const targetTotal = price + tax;

  const currentPlanKey = normalizePlanKey(user.currentPlan || user.plan) || 'basic';
  const active = isPlanActive(user, now);

  let transactionType = 'PLAN_PURCHASE';
  let upgradeCredit = 0;

  if (active) {
    const currentRank = PLAN_RANKS[currentPlanKey] || 1;
    const targetRank = PLAN_RANKS[targetKey] || 1;

    if (targetRank === currentRank) throw planError('ALREADY_ON_PLAN');
    if (targetRank < currentRank) throw planError('DOWNGRADE_NOT_ALLOWED');

    const currentTier = PLAN_TIERS[currentPlanKey];
    // CREDIT RULE
    upgradeCredit = currentTier ? currentTier.price + calcTax(currentTier.price) : 0;
    transactionType = 'PLAN_UPGRADE';
  }

  const payableAmount = Math.max(0, targetTotal - upgradeCredit);

  return {
    targetKey,
    targetTier,
    price,
    tax,
    targetTotal,
    upgradeCredit,
    payableAmount,
    transactionType,
    currentPlanKey,
    currentPlanActive: active
  };
};

module.exports = {
  PLAN_TIERS,
  TAX_RATE,
  calculatePlanMetrics,
  normalizePlanKey,
  calculateAuthoritativePayable,
  calcTax,
  isPlanActive
};