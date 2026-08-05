/**
 * Single source of truth for plan tier definitions in the frontend
 */

export const PLAN_TIERS = [
  {
    key: 'basic',
    name: 'Basic Plan',
    price: 1999,
    formattedPrice: '₹1,999',
    period: '/ 30 days',
    durationDays: 30,
    features: [
      'Standard Gym Access',
      'Basic Workout Tracker',
      'Community Forum Access',
      'Standard Support'
    ],
    tierRank: 1
  },
  {
    key: 'premium',
    name: 'Premium Plan',
    price: 3499,
    formattedPrice: '₹3,499',
    period: '/ 30 days',
    durationDays: 30,
    features: [
      'Unlimited AI Fitness Coach',
      'Fitbod AI Workout Generator',
      'MyFitnessPal Diet Tracker',
      '1-on-1 Trainer Session'
    ],
    featured: true,
    tierRank: 2
  },
  {
    key: 'pro_ai_vip',
    name: 'Pro AI VIP',
    price: 5999,
    formattedPrice: '₹5,999',
    period: '/ 30 days',
    durationDays: 30,
    features: [
      'All Premium AI Features',
      'Personalized Biomechanics Audit',
      'Custom Supplement Formulation',
      'Priority 24/7 VIP Support'
    ],
    tierRank: 3
  }
];

export const TAX_RATE = 0.18; // 18% GST

export const normalizePlanKey = (planStr) => {
  if (!planStr) return 'premium';
  const lower = planStr.toLowerCase().replace(/[^a-z]/g, '');
  if (lower.includes('basic')) return 'basic';
  if (lower.includes('pro') || lower.includes('vip')) return 'pro_ai_vip';
  return 'premium';
};

export const getPlanDisplayTitle = (planKeyOrStr) => {
  const key = normalizePlanKey(planKeyOrStr);
  const found = PLAN_TIERS.find((p) => p.key === key);
  return found ? found.name : 'Premium Plan';
};
