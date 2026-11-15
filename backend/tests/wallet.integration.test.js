/**
 * tests/wallet.integration.test.js
 *
 * REAL integration tests for the wallet purchase flow.
 * Uses MongoMemoryReplSet (replica set) because walletController relies on
 * mongoose multi-document transactions, which require a replica set.
 *
 * Tests call purchasePlanWithWallet via a lightweight mock req/res rather than
 * spinning up the full HTTP server, so there is no network dependency.
 *
 * Run:  npm run test:wallet:integration
 * CI:   added to the backend job in ci.yml
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

// ── Models & controller ──────────────────────────────────────────────────────
// We require these AFTER mongoose is connected so their model registrations
// happen on the right connection.
let User, PlatformWallet, WalletTransaction, IdempotencyRecord, Payment,
    SubscriptionHistory, purchasePlanWithWallet;

// ── Test helpers ─────────────────────────────────────────────────────────────
let replSet;

/**
 * Build a minimal express-style req object.
 */
const makeReq = (user, body = {}) => ({
  user,
  body,
  originalUrl: '/api/payments/plan',
  path: '/api/payments/plan',
  query: {}
});

/**
 * Collect what sendSuccess / sendError would write to the response.
 * Returns { status, body } after the controller resolves.
 */
const makeRes = () => {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; }
  };
  return res;
};

/**
 * Create a user document in MongoDB with a given wallet balance.
 */
const createUser = async (overrides = {}) => {
  return User.create({
    name: 'Test User',
    email: `test_${Date.now()}_${Math.random().toString(36).slice(2)}@fitarc.test`,
    mobile: '9999999999',
    password: 'hashed_irrelevant',
    walletBalance: 15000,
    currentPlan: 'basic',
    paymentStatus: 'free',
    ...overrides
  });
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────
test.before(async () => {
  // Start an in-process replica set (required for multi-document transactions)
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  // Now require models & controller (after connection is established)
  User                   = require('../models/User');
  PlatformWallet         = require('../models/PlatformWallet');
  WalletTransaction      = require('../models/WalletTransaction');
  IdempotencyRecord      = require('../models/IdempotencyRecord');
  Payment                = require('../models/Payment');
  SubscriptionHistory    = require('../models/SubscriptionHistory');
  ({ purchasePlanWithWallet } = require('../controllers/walletController'));

  // Ensure PlatformWallet singleton exists
  await PlatformWallet.findOneAndUpdate(
    { identifier: 'PLATFORM_WALLET' },
    { $setOnInsert: { identifier: 'PLATFORM_WALLET', balance: 0, totalRevenue: 0, totalTransactions: 0 } },
    { upsert: true }
  );
});

test.after(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

test.afterEach(async () => {
  // Clear collections between tests to prevent bleed-through
  await Promise.all([
    User.deleteMany({}),
    WalletTransaction.deleteMany({}),
    IdempotencyRecord.deleteMany({}),
    Payment.deleteMany({}),
    SubscriptionHistory.deleteMany({}),
    PlatformWallet.updateMany({}, { $set: { balance: 0, totalRevenue: 0, totalTransactions: 0 } })
  ]);
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1: Successful purchase debits user, credits platform, writes one ledger
// ═════════════════════════════════════════════════════════════════════════════
test('successful purchase: debits user + credits platform + writes one ledger entry', async () => {
  const user = await createUser({ walletBalance: 15000 });
  const req  = makeReq(user, { planName: 'premium', idempotencyKey: 'integ-test-1' });
  const res  = makeRes();

  await purchasePlanWithWallet(req, res);

  assert.equal(res._status, 200, `Expected 200, got ${res._status}`);
  assert.ok(res._body?.success, 'Response must be success=true');

  // Expected authoritative amount: 3499 + round(3499*18/100) = 3499+630 = 4129
  const EXPECTED = 4129;

  // User balance debited
  const updatedUser = await User.findById(user._id);
  assert.equal(updatedUser.walletBalance, 15000 - EXPECTED, 'User balance not correctly debited');
  assert.equal(updatedUser.currentPlan, 'premium', 'User plan not updated');

  // Platform credited
  const pw = await PlatformWallet.findOne({ identifier: 'PLATFORM_WALLET' });
  assert.equal(pw.balance, EXPECTED, 'Platform wallet not credited correctly');

  // Exactly one ledger entry
  const txns = await WalletTransaction.find({ userId: user._id, transactionType: 'PLAN_PURCHASE' });
  assert.equal(txns.length, 1, 'Expected exactly one WalletTransaction');
  assert.equal(txns[0].amount, EXPECTED);
  assert.equal(txns[0].status, 'COMPLETED');
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2: Insufficient balance — no state changes at all
// ═════════════════════════════════════════════════════════════════════════════
test('insufficient balance: no user, platform, or ledger changes', async () => {
  const user = await createUser({ walletBalance: 100 });  // premium costs 4129
  const req  = makeReq(user, { planName: 'premium', idempotencyKey: 'integ-test-2' });
  const res  = makeRes();

  await purchasePlanWithWallet(req, res);

  assert.equal(res._status, 400, `Expected 400, got ${res._status}`);

  const updatedUser = await User.findById(user._id);
  assert.equal(updatedUser.walletBalance, 100, 'User balance must not change');
  assert.equal(updatedUser.currentPlan, 'basic', 'User plan must not change');

  const pw = await PlatformWallet.findOne({ identifier: 'PLATFORM_WALLET' });
  assert.equal(pw.balance, 0, 'Platform wallet must not be credited');

  const txns = await WalletTransaction.find({ userId: user._id });
  assert.equal(txns.length, 0, 'No ledger entry must be written');
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3: Forced mid-transaction error — full rollback
// ═════════════════════════════════════════════════════════════════════════════
test('forced mid-transaction error: everything rolls back', async () => {
  const user = await createUser({ walletBalance: 15000 });

  // Monkey-patch PlatformWallet.findOneAndUpdate to throw inside the txn
  const originalFn = PlatformWallet.findOneAndUpdate.bind(PlatformWallet);
  let callCount = 0;
  PlatformWallet.findOneAndUpdate = async function (...args) {
    callCount++;
    if (callCount === 1) {
      PlatformWallet.findOneAndUpdate = originalFn; // restore immediately
      throw new Error('SIMULATED_DB_CRASH');
    }
    return originalFn(...args);
  };

  const req = makeReq(user, { planName: 'premium', idempotencyKey: 'integ-test-3' });
  const res = makeRes();

  await purchasePlanWithWallet(req, res);

  // The error is handled and returned as a 500 or 400 (not 200)
  assert.ok(res._status !== 200, `Expected non-200 on simulated crash, got ${res._status}`);

  // User balance must be rolled back
  const updatedUser = await User.findById(user._id);
  assert.equal(updatedUser.walletBalance, 15000, 'User balance must be rolled back after crash');
  assert.equal(updatedUser.currentPlan, 'basic', 'Plan must not change after crash');

  // Platform must not be credited
  const pw = await PlatformWallet.findOne({ identifier: 'PLATFORM_WALLET' });
  assert.equal(pw.balance, 0, 'Platform must not be credited after rollback');

  // No ledger entry
  const txns = await WalletTransaction.find({ userId: user._id });
  assert.equal(txns.length, 0, 'No ledger entry must exist after rollback');
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 4: Same idempotency key twice — only charged once
// ═════════════════════════════════════════════════════════════════════════════
test('idempotency: same key submitted twice charges only once', async () => {
  const user = await createUser({ walletBalance: 15000 });
  const IKEY = 'integ-idempotency-key-unique-1';

  const req1 = makeReq(user, { planName: 'premium', idempotencyKey: IKEY });
  const res1 = makeRes();
  await purchasePlanWithWallet(req1, res1);
  assert.equal(res1._status, 200);

  // Simulate retry (same user, same key, same plan)
  const freshUser = await User.findById(user._id);
  const req2 = makeReq(freshUser, { planName: 'premium', idempotencyKey: IKEY });
  const res2 = makeRes();
  await purchasePlanWithWallet(req2, res2);

  // Retry must succeed (return cached response), not 409 on the user's balance
  assert.equal(res2._status, 200, 'Retry must return 200 from cached idempotent response');

  // Balance charged only once
  const finalUser = await User.findById(user._id);
  assert.equal(finalUser.walletBalance, 15000 - 4129, 'Balance charged exactly once');

  // Exactly one wallet transaction
  const txns = await WalletTransaction.find({ userId: user._id });
  assert.equal(txns.length, 1, 'Only one ledger entry must exist');

  // Platform credited exactly once
  const pw = await PlatformWallet.findOne({ identifier: 'PLATFORM_WALLET' });
  assert.equal(pw.balance, 4129, 'Platform credited exactly once');
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 5: Concurrent purchases never make balance negative
// ═════════════════════════════════════════════════════════════════════════════
test('concurrent purchases: balance never goes negative', async () => {
  // Set balance to exactly one premium plan cost so only one of two concurrent
  // requests can succeed.
  const BALANCE = 4129;  // exactly one premium
  const user = await createUser({ walletBalance: BALANCE });

  const userId = user._id;

  const makeRequest = async (key) => {
    // Re-fetch user each time to simulate independent HTTP requests
    const freshUser = await User.findById(userId);
    const req = makeReq(freshUser, { planName: 'premium', idempotencyKey: key });
    const res = makeRes();
    await purchasePlanWithWallet(req, res);
    return res;
  };

  const [r1, r2] = await Promise.allSettled([
    makeRequest('concurrent-key-A'),
    makeRequest('concurrent-key-B')
  ]);

  const finalUser = await User.findById(userId);

  // Balance must never be negative
  assert.ok(finalUser.walletBalance >= 0, `Balance went negative: ${finalUser.walletBalance}`);

  // Exactly one of the two must have succeeded
  const succeeded = [r1, r2].filter(r => r.status === 'fulfilled' && r.value._status === 200);
  const failed    = [r1, r2].filter(r => r.status === 'fulfilled' && r.value._status !== 200);
  assert.equal(succeeded.length, 1, 'Exactly one concurrent request must succeed');
  assert.equal(failed.length,    1, 'Exactly one concurrent request must fail');

  // Final balance: 0 (one purchase succeeded, deducted exactly 4129)
  assert.equal(finalUser.walletBalance, 0, 'Balance should be 0 after one successful purchase');
});

// ═════════════════════════════════════════════════════════════════════════════
// TEST 6: Buying the same active plan again returns 409 ALREADY_ON_PLAN
// ═════════════════════════════════════════════════════════════════════════════
test('buying active plan again returns 409 ALREADY_ON_PLAN', async () => {
  // Set the user as already on premium with a future expiry
  const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const user = await createUser({
    walletBalance: 15000,
    currentPlan: 'premium',
    planExpiryDate: futureExpiry,
    paymentStatus: 'active'
  });

  const req = makeReq(user, { planName: 'premium', idempotencyKey: 'already-on-plan-test' });
  const res = makeRes();

  await purchasePlanWithWallet(req, res);

  assert.equal(res._status, 409, `Expected 409, got ${res._status}`);
  assert.ok(
    res._body?.message?.includes('already on this plan') || res._body?.message === 'You are already on this plan. No charge was made.',
    `Expected ALREADY_ON_PLAN message, got: ${res._body?.message}`
  );

  // Balance unchanged
  const updatedUser = await User.findById(user._id);
  assert.equal(updatedUser.walletBalance, 15000, 'Balance must not be changed on 409');

  // Platform not credited
  const pw = await PlatformWallet.findOne({ identifier: 'PLATFORM_WALLET' });
  assert.equal(pw.balance, 0, 'Platform must not be credited on 409');
});
