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

module.exports = {
  PLAN_TIERS,
  TAX_RATE,
  calculatePlanMetrics
};
