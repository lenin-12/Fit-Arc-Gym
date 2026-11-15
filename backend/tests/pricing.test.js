const test = require('node:test');
const assert = require('node:assert');
const { calculateAuthoritativePayable: calc } = require('../utils/planUtils');
const future = new Date(Date.now() + 10 * 864e5), past = new Date(Date.now() - 864e5);
const u = (plan, exp = future, st = 'active') => ({ currentPlan: plan, planExpiryDate: exp, paymentStatus: st });

test('first purchase = price + GST', () => {
  const r = calc({}, 'premium');
  assert.deepStrictEqual([r.price, r.tax, r.payableAmount, r.transactionType, r.upgradeCredit], [3499, 630, 4129, 'PLAN_PURCHASE', 0]);
});
test('premium -> pro: 7079 - 4129 = 2950', () => {
  const r = calc(u('premium'), 'pro_ai_vip');
  assert.deepStrictEqual([r.targetTotal, r.upgradeCredit, r.payableAmount, r.transactionType], [7079, 4129, 2950, 'PLAN_UPGRADE']);
});
test('same active plan is rejected (no renewal charge)', () => {
  assert.throws(() => calc(u('premium'), 'premium'), { message: 'ALREADY_ON_PLAN', statusCode: 409 });
});
test('downgrade rejected', () => {
  assert.throws(() => calc(u('pro_ai_vip'), 'premium'), { message: 'DOWNGRADE_NOT_ALLOWED' });
});
test('expired plan: full price, no credit', () => {
  const r = calc(u('premium', past), 'pro_ai_vip');
  assert.deepStrictEqual([r.upgradeCredit, r.payableAmount, r.transactionType], [0, 7079, 'PLAN_PURCHASE']);
});
test('cancelled plan gets no credit', () => {
  assert.strictEqual(calc(u('premium', future, 'cancelled'), 'pro_ai_vip').upgradeCredit, 0);
});
test("stale 'failed' status does not strip an active plan", () => {
  assert.throws(() => calc(u('premium', future, 'failed'), 'premium'), { message: 'ALREADY_ON_PLAN' });
});
test('invalid plan', () => {
  assert.throws(() => calc({}, 'gold'), { message: 'INVALID_PLAN', statusCode: 400 });
});
test('amounts are integers and payable = total - credit', () => {
  for (const cur of ['basic', 'premium']) for (const t of ['premium', 'pro_ai_vip']) {
    try { const r = calc(u(cur), t); assert.ok(Number.isInteger(r.payableAmount)); assert.strictEqual(r.payableAmount, r.targetTotal - r.upgradeCredit); } catch (e) { if (e.message !== 'ALREADY_ON_PLAN' && e.message !== 'DOWNGRADE_NOT_ALLOWED') throw e; }
  }
});