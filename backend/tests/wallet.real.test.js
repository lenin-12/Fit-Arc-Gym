const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DISABLE_AUTO_CONNECT = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-test-secret-not-used-in-prod';

const db = require('./helpers/testDb');
const { createUser, createAdmin, newKey, auth } = require('./helpers/factories');

const app = require('../app');
const User = require('../models/User');
const PlatformWallet = require('../models/PlatformWallet');
const WalletTransaction = require('../models/WalletTransaction');
const IdempotencyRecord = require('../models/IdempotencyRecord');
const Payment = require('../models/Payment');
const SubscriptionHistory = require('../models/SubscriptionHistory');
const { PLAN_TIERS, TAX_RATE } = require('../utils/planUtils');

const PREMIUM_TOTAL = PLAN_TIERS.premium.price + Math.round(PLAN_TIERS.premium.price * TAX_RATE); // 4129
const PRO_TOTAL = PLAN_TIERS.pro_ai_vip.price + Math.round(PLAN_TIERS.pro_ai_vip.price * TAX_RATE); // 7079

const buy = (token, body) =>
  request(app).post('/api/payments/plan').set(auth(token)).send(body);

const platformBalance = async () => {
  const w = await PlatformWallet.findOne({ identifier: 'PLATFORM_WALLET' });
  return w ? w.balance : 0;
};

describe('Wallet system against the REAL controllers', () => {
  before(async () => { await db.connect(); });
  after(async () => { await db.disconnect(); });
  beforeEach(async () => { await db.clear(); });

  // ---- TEST 1 and 14: registration bonus (real authController) ----
  describe('Registration bonus', () => {
    const registerBody = (email) => ({
      name: 'New User', email, mobile: '9876543210',
      firstSchoolName: 'Primary School',
      password: 'password123', confirmPassword: 'password123'
    });

    test('T1: new user gets exactly 15,000 credits and a ledger entry', async () => {
      const res = await request(app).post('/api/auth/register').send(registerBody('bonus@test.com'));
      assert.equal(res.status, 201, JSON.stringify(res.body));
      const user = await User.findOne({ email: 'bonus@test.com' });
      assert.equal(user.walletBalance, 15000);
      const txns = await WalletTransaction.find({ userId: user._id, transactionType: 'REGISTRATION_BONUS' });
      assert.equal(txns.length, 1);
      assert.equal(txns[0].amount, 15000);
      assert.equal(txns[0].balanceAfter, 15000);
    });

    test('T14: registering the same email twice grants only one bonus', async () => {
      await request(app).post('/api/auth/register').send(registerBody('dup@test.com'));
      const second = await request(app).post('/api/auth/register').send(registerBody('dup@test.com'));
      assert.ok(second.status >= 400 && second.status < 500, `expected 4xx, got ${second.status}`);
      assert.equal(await User.countDocuments({ email: 'dup@test.com' }), 1);
      assert.equal(await WalletTransaction.countDocuments({ transactionType: 'REGISTRATION_BONUS' }), 1);
    });
  });

  // ---- TEST 3: successful purchase ----
  describe('Successful purchase', () => {
    test('T3: deducts user, credits platform, activates plan, writes every record', async () => {
      const { user, token } = await createUser();
      const res = await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.amountPaid, PREMIUM_TOTAL);

      const after = await User.findById(user._id);
      assert.equal(after.walletBalance, 15000 - PREMIUM_TOTAL);
      assert.equal(after.currentPlan, 'premium');
      assert.equal(after.paymentStatus, 'active');
      assert.ok(after.planExpiryDate > new Date());

      assert.equal(await platformBalance(), PREMIUM_TOTAL);
      const txn = await WalletTransaction.findOne({ userId: user._id, transactionType: 'PLAN_PURCHASE' });
      assert.equal(txn.amount, PREMIUM_TOTAL);
      assert.equal(txn.balanceBefore, 15000);
      assert.equal(txn.balanceAfter, 15000 - PREMIUM_TOTAL);
      assert.equal(await Payment.countDocuments({ userId: user._id, status: 'success' }), 1);
      assert.equal(await SubscriptionHistory.countDocuments({ userId: user._id }), 1);
    });

    test('T3b: upgrade premium to pro charges only the difference', async () => {
      const { user, token } = await createUser();
      await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      const res = await buy(token, { planName: 'pro_ai_vip', idempotencyKey: newKey() });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.amountPaid, PRO_TOTAL - PREMIUM_TOTAL);
      const after = await User.findById(user._id);
      assert.equal(after.walletBalance, 15000 - PRO_TOTAL);
      assert.equal(after.currentPlan, 'pro_ai_vip');
      assert.equal(await WalletTransaction.countDocuments({ userId: user._id, transactionType: 'PLAN_UPGRADE' }), 1);
    });
  });

  // ---- TEST 4, 5, 13: rejections leave no trace ----
  describe('Rejections change nothing', () => {
    test('T4: insufficient balance returns 400 and changes no state', async () => {
      const { user, token } = await createUser({ walletBalance: 500 });
      const res = await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 400);
      assert.equal((await User.findById(user._id)).walletBalance, 500);
      assert.equal((await User.findById(user._id)).currentPlan, 'basic');
      assert.equal(await platformBalance(), 0);
      assert.equal(await Payment.countDocuments(), 0);
      assert.equal(await SubscriptionHistory.countDocuments(), 0);
      assert.equal(await WalletTransaction.countDocuments({ transactionType: 'PLAN_PURCHASE' }), 0);
    });

    test('T5: unknown plan returns 400 and changes no state', async () => {
      const { user, token } = await createUser();
      const res = await buy(token, { planName: 'gold_xyz', idempotencyKey: newKey() });
      assert.equal(res.status, 400);
      assert.equal((await User.findById(user._id)).walletBalance, 15000);
      assert.equal(await platformBalance(), 0);
    });

    test('T5b: basic plan is rejected, it is free', async () => {
      const { token } = await createUser();
      const res = await buy(token, { planName: 'basic', idempotencyKey: newKey() });
      assert.equal(res.status, 400);
    });

    test('T5c: missing idempotency key is rejected before any work', async () => {
      const { user, token } = await createUser();
      const res = await buy(token, { planName: 'premium' });
      assert.equal(res.status, 400);
      assert.equal((await User.findById(user._id)).walletBalance, 15000);
    });

    test('T13: after a failed purchase the idempotency record is FAILED and no success records exist', async () => {
      const { user, token } = await createUser({ walletBalance: 100 });
      const key = newKey();
      await buy(token, { planName: 'premium', idempotencyKey: key });
      const rec = await IdempotencyRecord.findOne({ key, userId: user._id });
      assert.equal(rec.status, 'FAILED');
      assert.equal(await Payment.countDocuments({ status: 'success' }), 0);
      assert.equal(await platformBalance(), 0);
    });
  });

  // ---- TEST 9, 10: auth and RBAC (real middleware) ----
  describe('Authentication and authorization', () => {
    test('T9: no token gives 401 on purchase', async () => {
      const res = await request(app).post('/api/payments/plan').send({ planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 401);
    });

    test('T9b: garbage token gives 401', async () => {
      const res = await buy('not.a.real.token', { planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 401);
    });

    test('T10: normal user gets 403 on both admin endpoints', async () => {
      const { token } = await createUser();
      const a = await request(app).get('/api/admin/wallet').set(auth(token));
      const b = await request(app).get('/api/admin/transactions').set(auth(token));
      assert.equal(a.status, 403);
      assert.equal(b.status, 403);
    });

    test('T10b: admin gets 200 and sees platform revenue', async () => {
      const { token: userToken } = await createUser();
      const { token: adminToken } = await createAdmin();
      await buy(userToken, { planName: 'premium', idempotencyKey: newKey() });
      const res = await request(app).get('/api/admin/wallet').set(auth(adminToken));
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.platformBalance, PREMIUM_TOTAL);
    });
  });

  // ---- TEST 11: price tampering ----
  describe('Price tampering', () => {
    test('T11: client-supplied price, total and amount are ignored', async () => {
      const { user, token } = await createUser();
      const res = await buy(token, {
        planName: 'pro_ai_vip', idempotencyKey: newKey(),
        price: 10, total: 10, amount: 10, payableAmount: 10
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.amountPaid, PRO_TOTAL);
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PRO_TOTAL);
    });
  });

  // PART 2 CONTINUES HERE, inside the same describe

  // ---- TEST 6: real atomic rollback ----
  describe('Atomic rollback', () => {
    test('T6: a failure in the LAST write rolls back every earlier write', async () => {
      const { user, token } = await createUser();
      // Force the final write inside the transaction to fail
      const original = SubscriptionHistory.create;
      SubscriptionHistory.create = async () => { throw new Error('SIMULATED_DB_CRASH'); };
      let res;
      try {
        res = await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      } finally {
        SubscriptionHistory.create = original;
      }
      assert.ok(res.status >= 400, `expected failure, got ${res.status}`);
      const after = await User.findById(user._id);
      assert.equal(after.walletBalance, 15000, 'balance must be restored');
      assert.equal(after.currentPlan, 'basic', 'plan must not be activated');
      assert.equal(await platformBalance(), 0, 'platform must not be credited');
      assert.equal(await Payment.countDocuments(), 0, 'payment record must be rolled back');
      assert.equal(await WalletTransaction.countDocuments({ transactionType: 'PLAN_PURCHASE' }), 0);
    });

    test('T6b: after a rolled-back failure the same key can be retried and succeeds', async () => {
      const { user, token } = await createUser();
      const key = newKey();
      const original = SubscriptionHistory.create;
      SubscriptionHistory.create = async () => { throw new Error('SIMULATED_DB_CRASH'); };
      try { await buy(token, { planName: 'premium', idempotencyKey: key }); }
      finally { SubscriptionHistory.create = original; }

      const retry = await buy(token, { planName: 'premium', idempotencyKey: key });
      assert.equal(retry.status, 200, JSON.stringify(retry.body));
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PREMIUM_TOTAL);
    });
  });

  // ---- TEST 7, 12: idempotency ----
  describe('Idempotency', () => {
    test('T7: same key twice charges once and replays the first response', async () => {
      const { user, token } = await createUser();
      const key = newKey();
      const first = await buy(token, { planName: 'premium', idempotencyKey: key });
      const second = await buy(token, { planName: 'premium', idempotencyKey: key });
      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal(second.body.data.transactionId, first.body.data.transactionId, 'must be the cached response');
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PREMIUM_TOTAL);
      assert.equal(await platformBalance(), PREMIUM_TOTAL);
      assert.equal(await Payment.countDocuments(), 1);
      assert.equal(await WalletTransaction.countDocuments({ transactionType: 'PLAN_PURCHASE' }), 1);
    });

    test('T12: five rapid retries of one key produce exactly one charge', async () => {
      const { user, token } = await createUser();
      const key = newKey();
      const results = [];
      for (let i = 0; i < 5; i++) results.push(await buy(token, { planName: 'premium', idempotencyKey: key }));
      assert.ok(results.every((r) => r.status === 200));
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PREMIUM_TOTAL);
    });

    test('T12b: reusing a key for a DIFFERENT plan is rejected with 422 and charges nothing extra', async () => {
      const { user, token } = await createUser();
      const key = newKey();
      await buy(token, { planName: 'premium', idempotencyKey: key });
      const res = await buy(token, { planName: 'pro_ai_vip', idempotencyKey: key });
      assert.equal(res.status, 422);
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PREMIUM_TOTAL);
    });

    test('T12c: user B cannot replay or collide with user A key', async () => {
      const a = await createUser();
      const b = await createUser();
      const key = newKey();
      await buy(a.token, { planName: 'premium', idempotencyKey: key });
      const res = await buy(b.token, { planName: 'premium', idempotencyKey: key });
      assert.equal(res.status, 200, 'same key under a different user is an independent request');
      assert.equal((await User.findById(b.user._id)).walletBalance, 15000 - PREMIUM_TOTAL);
      assert.equal(await platformBalance(), PREMIUM_TOTAL * 2);
    });

    test('T12d: a stale PROCESSING lock (older than 2 minutes) can be taken over', async () => {
      const { user, token } = await createUser();
      const key = newKey();
      const crypto = require('crypto');
      const payloadHash = crypto.createHash('sha256')
        .update(JSON.stringify({ userId: user._id.toString(), planKey: 'premium' })).digest('hex');
      await IdempotencyRecord.collection.insertOne({
        key, userId: user._id, requestPath: '/api/payments/plan',
        requestPayloadHash: payloadHash, status: 'PROCESSING',
        lockedAt: new Date(Date.now() - 5 * 60 * 1000), createdAt: new Date(), updatedAt: new Date()
      });
      const res = await buy(token, { planName: 'premium', idempotencyKey: key });
      assert.equal(res.status, 200, JSON.stringify(res.body));
    });

    test('T12e: a FRESH PROCESSING lock returns 409 and does not charge', async () => {
      const { user, token } = await createUser();
      const key = newKey();
      const crypto = require('crypto');
      const payloadHash = crypto.createHash('sha256')
        .update(JSON.stringify({ userId: user._id.toString(), planKey: 'premium' })).digest('hex');
      await IdempotencyRecord.collection.insertOne({
        key, userId: user._id, requestPath: '/api/payments/plan',
        requestPayloadHash: payloadHash, status: 'PROCESSING',
        lockedAt: new Date(), createdAt: new Date(), updatedAt: new Date()
      });
      const res = await buy(token, { planName: 'premium', idempotencyKey: key });
      assert.equal(res.status, 409);
      assert.equal((await User.findById(user._id)).walletBalance, 15000);
    });
  });

  // ---- TEST 8: true concurrency ----
  describe('Concurrency', () => {
    test('T8: two simultaneous purchases with different keys cannot overspend', async () => {
      const { user, token } = await createUser({ walletBalance: 5000 }); // enough for one, not two
      const [r1, r2] = await Promise.all([
        buy(token, { planName: 'premium', idempotencyKey: newKey() }),
        buy(token, { planName: 'premium', idempotencyKey: newKey() })
      ]);
      const statuses = [r1.status, r2.status].sort();
      const after = await User.findById(user._id);
      assert.ok(after.walletBalance >= 0, 'balance must never go negative');
      assert.equal(after.walletBalance, 5000 - PREMIUM_TOTAL, 'exactly one charge');
      assert.equal(await Payment.countDocuments({ status: 'success' }), 1, `statuses were ${statuses}`);
      assert.equal(await platformBalance(), PREMIUM_TOTAL);
    });

    test('T8b: ten simultaneous requests with the SAME key charge exactly once', async () => {
      const { user, token } = await createUser();
      const key = newKey();
      const results = await Promise.all(
        Array.from({ length: 10 }, () => buy(token, { planName: 'premium', idempotencyKey: key }))
      );
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PREMIUM_TOTAL);
      assert.equal(await Payment.countDocuments({ status: 'success' }), 1);
      assert.ok(results.some((r) => r.status === 200), 'at least one must succeed');
    });
  });

  // ---- Cases your old suite never covered ----
  describe('Previously uncovered cases', () => {
    test('N1: buying the plan you already have returns 409 and charges nothing', async () => {
      const { user, token } = await createUser();
      await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      const res = await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 409);
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PREMIUM_TOTAL);
    });

    test('N2: downgrading while active returns 409 and charges nothing', async () => {
      const { user, token } = await createUser();
      await buy(token, { planName: 'pro_ai_vip', idempotencyKey: newKey() });
      const res = await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 409);
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PRO_TOTAL);
    });

    test('N3: an expired plan is repurchased at full price with no credit', async () => {
      const { user, token } = await createUser({
        currentPlan: 'premium', plan: 'Premium Plan', paymentStatus: 'active',
        planStartDate: new Date(Date.now() - 40 * 864e5),
        planExpiryDate: new Date(Date.now() - 10 * 864e5)
      });
      const res = await buy(token, { planName: 'pro_ai_vip', idempotencyKey: newKey() });
      // note: protect middleware may reset the expired plan first, either way full price applies
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.data.amountPaid, PRO_TOTAL);
    });

    test('N4: exact balance equal to the price succeeds and leaves zero', async () => {
      const { user, token } = await createUser({ walletBalance: PREMIUM_TOTAL });
      const res = await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal((await User.findById(user._id)).walletBalance, 0);
    });

    test('N5: one credit short is rejected', async () => {
      const { user, token } = await createUser({ walletBalance: PREMIUM_TOTAL - 1 });
      const res = await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 400);
      assert.equal((await User.findById(user._id)).walletBalance, PREMIUM_TOTAL - 1);
    });

    test('N6: the second route alias /api/payment/wallet behaves identically', async () => {
      const { user, token } = await createUser();
      const res = await request(app).post('/api/payment/wallet').set(auth(token))
        .send({ planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal((await User.findById(user._id)).walletBalance, 15000 - PREMIUM_TOTAL);
    });

    test('N7: quote endpoint matches what the purchase actually charges', async () => {
      const { token } = await createUser();
      const quote = await request(app).get('/api/payments/quote?plan=premium').set(auth(token));
      assert.equal(quote.status, 200);
      assert.equal(quote.body.data.payableAmount, PREMIUM_TOTAL);
      assert.equal(quote.body.data.canPurchase, true);
      const res = await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      assert.equal(res.body.data.amountPaid, quote.body.data.payableAmount);
    });

    test('N8: ledger arithmetic: balanceBefore minus amount equals balanceAfter on every purchase', async () => {
      const { user, token } = await createUser();
      await buy(token, { planName: 'premium', idempotencyKey: newKey() });
      await buy(token, { planName: 'pro_ai_vip', idempotencyKey: newKey() });
      const txns = await WalletTransaction.find({ userId: user._id, transactionType: { $ne: 'REGISTRATION_BONUS' } });
      assert.equal(txns.length, 2);
      for (const t of txns) assert.equal(t.balanceBefore - t.amount, t.balanceAfter);
    });

    test('N9: money is conserved: user spend equals platform revenue', async () => {
      const a = await createUser();
      const b = await createUser();
      await buy(a.token, { planName: 'premium', idempotencyKey: newKey() });
      await buy(b.token, { planName: 'pro_ai_vip', idempotencyKey: newKey() });
      const spent = (15000 - (await User.findById(a.user._id)).walletBalance)
                  + (15000 - (await User.findById(b.user._id)).walletBalance);
      assert.equal(await platformBalance(), spent);
    });

    test('N10: wallet transactions list is paginated and scoped to the caller', async () => {
      const a = await createUser();
      const b = await createUser();
      await buy(a.token, { planName: 'premium', idempotencyKey: newKey() });
      await buy(b.token, { planName: 'premium', idempotencyKey: newKey() });
      const res = await request(app).get('/api/wallet/transactions?limit=1').set(auth(a.token));
      assert.equal(res.status, 200);
      assert.equal(res.body.data.transactions.length, 1);
      assert.ok(res.body.data.transactions.every((t) => String(t.userId) === String(a.user._id)));
    });

    test('N11: a user cannot spend someone else balance by sending a userId in the body', async () => {
      const victim = await createUser();
      const attacker = await createUser({ walletBalance: 100 });
      const res = await buy(attacker.token, { planName: 'premium', idempotencyKey: newKey(), userId: String(victim.user._id) });
      assert.equal(res.status, 400);
      assert.equal((await User.findById(victim.user._id)).walletBalance, 15000);
    });
  });
});