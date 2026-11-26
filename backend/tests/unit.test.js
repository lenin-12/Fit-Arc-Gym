const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculatePlanMetrics,
  normalizePlanKey,
  calculateAuthoritativePayable
} = require('../utils/planUtils');

describe('Plan Date Math & Metrics: Identity Tests', () => {
  test('elapsedDays + remainingDays === totalDays (identity invariant)', () => {
    const start   = new Date('2026-01-01T00:00:00Z');
    const expiry  = new Date('2026-01-31T00:00:00Z');
    const refDate = new Date('2026-01-15T00:00:00Z');

    const m = calculatePlanMetrics(start, expiry, refDate);
    assert.equal(m.totalDays, 30, 'totalDays should be 30');
    assert.equal(m.elapsedDays, 14, 'elapsedDays should be 14');
    assert.equal(m.remainingDays, 16, 'remainingDays should be 16');
    assert.equal(m.elapsedDays + m.remainingDays, m.totalDays, 'identity invariant');
    assert.equal(m.status, 'Active');
  });

  test('Status transitions: Expiring Soon (5 days or fewer left) and Expired (0 remaining)', () => {
    const start  = new Date('2026-01-01T00:00:00Z');
    const expiry = new Date('2026-01-31T00:00:00Z');

    // 3 days remaining: Expiring Soon
    const mSoon = calculatePlanMetrics(start, expiry, new Date('2026-01-28T00:00:00Z'));
    assert.ok(mSoon.remainingDays <= 5 && mSoon.remainingDays > 0, 'should be expiring soon');
    assert.equal(mSoon.status, 'Expiring Soon');
    assert.equal(mSoon.elapsedDays + mSoon.remainingDays, mSoon.totalDays, 'identity invariant');

    // 0 remaining: Expired
    const mExp = calculatePlanMetrics(start, expiry, new Date('2026-02-01T00:00:00Z'));
    assert.equal(mExp.remainingDays, 0, 'should have 0 remaining');
    assert.equal(mExp.status, 'Expired');
    assert.equal(mExp.elapsedDays + mExp.remainingDays, mExp.totalDays, 'identity invariant');
  });
});

describe('Plan Key Normalization', () => {
  test('normalizes known plan names to canonical keys', () => {
    assert.equal(normalizePlanKey('Basic Plan'), 'basic');
    assert.equal(normalizePlanKey('basic'), 'basic');
    assert.equal(normalizePlanKey('Premium Plan'), 'premium');
    assert.equal(normalizePlanKey('PRO AI VIP'), 'pro_ai_vip');
  });

  test('returns null for unknown plan names', () => {
    assert.equal(normalizePlanKey('unknown'), null);
    assert.equal(normalizePlanKey(''), null);
    assert.equal(normalizePlanKey(null), null);
  });
});

describe('Authoritative Payable Calculation', () => {
  const DAY = 24 * 60 * 60 * 1000;

  test('basic to premium with paymentStatus=free is PLAN_PURCHASE at full premium price + 18% GST', () => {
    const user = { currentPlan: 'basic', paymentStatus: 'free' };
    const result = calculateAuthoritativePayable(user, 'premium');
    const expectedAmount = 3499 + Math.round(3499 * 0.18);
    assert.equal(result.payableAmount, expectedAmount, 'full price + 18% GST');
    assert.equal(result.transactionType, 'PLAN_PURCHASE');
  });

  
  test('premium to premium with an active plan is rejected with ALREADY_ON_PLAN (409)', () => {
    const user = {
      currentPlan: 'premium',
      paymentStatus: 'active',
      planExpiryDate: new Date(Date.now() + 30 * DAY).toISOString()
    };
    assert.throws(
      () => calculateAuthoritativePayable(user, 'premium'),
      { message: 'ALREADY_ON_PLAN', statusCode: 409 }
    );
  });

 
  test('premium to pro_ai_vip with an active plan is PLAN_UPGRADE and credits the premium price', () => {
    const user = {
      currentPlan: 'premium',
      paymentStatus: 'active',
      planExpiryDate: new Date(Date.now() + 30 * DAY).toISOString()
    };
    const result = calculateAuthoritativePayable(user, 'pro_ai_vip');
    assert.equal(result.transactionType, 'PLAN_UPGRADE');
    assert.equal(result.upgradeCredit, 3499 + Math.round(3499 * 0.18));
    assert.equal(result.payableAmount, result.targetTotal - result.upgradeCredit);
  });
});