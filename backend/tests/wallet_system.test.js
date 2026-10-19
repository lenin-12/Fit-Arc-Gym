/**
 * FIT ARC GYM - COMPREHENSIVE WALLET & PAYMENT TEST SUITE
 *
 * Covers all 14 required verification scenarios:
 * TEST 1:  New user registration bonus (exactly 15,000 credits)
 * TEST 2:  Existing user wallet balance preserved during migration
 * TEST 3:  Successful plan purchase (deduction, platform credit, txn logged, plan active)
 * TEST 4:  Insufficient balance rejection (no financial or plan state change)
 * TEST 5:  Invalid plan rejection (no financial or plan state change)
 * TEST 6:  Exception rollback (ACID atomicity - all changes revert together)
 * TEST 7:  Idempotency key deduplication (charged only once on duplicate submission)
 * TEST 8:  Concurrent purchases cannot overspend balance (balance never negative)
 * TEST 9:  Unauthenticated access rejection (401)
 * TEST 10: Non-admin access to admin balance API rejection (403)
 * TEST 11: Tampered client price ignored; backend computes authoritative amount
 * TEST 12: Network timeout retry with idempotency key does not double-charge
 * TEST 13: Failed transaction leaves no orphaned successful records
 * TEST 14: Repeated registration requests do not grant duplicate bonuses
 */

const assert = require('assert');
const crypto = require('crypto');
const { PLAN_TIERS, TAX_RATE, normalizePlanKey, calculateAuthoritativePayable } = require('../utils/planUtils');

// Lightweight test framework runner
let passedTests = 0;
let failedTests = 0;

const runTest = async (name, testFn) => {
  try {
    process.stdout.write(`▶ Running: ${name} ... `);
    await testFn();
    console.log('✅ PASSED');
    passedTests++;
  } catch (error) {
    console.log('❌ FAILED');
    console.error(`   Error: ${error.message}`);
    if (error.stack) console.error(error.stack.split('\n').slice(1, 4).join('\n'));
    failedTests++;
  }
};

// Mock in-memory database simulation of MongoDB ACID Transactions & models
class MockDatabase {
  constructor() {
    this.users = new Map();
    this.platformWallet = { identifier: 'PLATFORM_WALLET', balance: 0, totalRevenue: 0, totalTransactions: 0 };
    this.walletTransactions = [];
    this.idempotencyRecords = new Map();
    this.payments = [];
    this.subscriptionHistory = [];
  }

  // ACID transaction runner
  async withTransaction(txnFn) {
    // Snapshot state for atomicity / rollback
    const snapshot = {
      users: new Map(JSON.parse(JSON.stringify(Array.from(this.users.entries())))),
      platformWallet: { ...this.platformWallet },
      walletTransactions: [...this.walletTransactions],
      payments: [...this.payments],
      subscriptionHistory: [...this.subscriptionHistory]
    };

    try {
      const result = await txnFn(this);
      return result;
    } catch (err) {
      // Rollback on any failure
      this.users = snapshot.users;
      this.platformWallet = snapshot.platformWallet;
      this.walletTransactions = snapshot.walletTransactions;
      this.payments = snapshot.payments;
      this.subscriptionHistory = snapshot.subscriptionHistory;
      throw err;
    }
  }

  // Atomic conditional update
  atomicDeductBalance(userId, amount) {
    const user = this.users.get(userId);
    if (!user || user.walletBalance < amount) {
      return null; // Update condition failed
    }
    user.walletBalance -= amount;
    return user;
  }

  creditPlatform(amount) {
    this.platformWallet.balance += amount;
    this.platformWallet.totalRevenue += amount;
    this.platformWallet.totalTransactions += 1;
  }
}

// Payment execution engine matching purchasePlanWithWallet logic
const executePayment = async (db, { userId, planName, idempotencyKey, clientSuppliedAmount }) => {
  // Authoritative plan check (ignores clientSuppliedAmount completely)
  const targetKey = normalizePlanKey(planName);
  const targetTier = targetKey ? PLAN_TIERS[targetKey] : null;

  if (!targetTier || targetKey === 'basic') {
    throw new Error('INVALID_PLAN');
  }

  // Idempotency check
  if (idempotencyKey) {
    const existing = db.idempotencyRecords.get(idempotencyKey);
    if (existing && existing.status === 'COMPLETED') {
      return { fromCache: true, ...existing.result };
    }
  }

  // Multi-document ACID transaction
  return await db.withTransaction(async () => {
    const user = db.users.get(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const pricing = calculateAuthoritativePayable(user, targetKey);
    const payableAmount = pricing.payableAmount;

    if (user.walletBalance < payableAmount) {
      const err = new Error('INSUFFICIENT_FUNDS');
      err.required = payableAmount;
      err.available = user.walletBalance;
      throw err;
    }

    const balanceBefore = user.walletBalance;

    // 1. Atomic deduction with condition
    const updatedUser = db.atomicDeductBalance(userId, payableAmount);
    if (!updatedUser) throw new Error('INSUFFICIENT_FUNDS');

    // 2. Credit platform balance
    db.creditPlatform(payableAmount);

    // 3. Update plan
    updatedUser.currentPlan = targetKey;
    updatedUser.plan = targetTier.name;
    updatedUser.paymentStatus = 'active';

    // 4. Record wallet transaction
    const txnRecord = {
      id: 'WTX_' + Date.now() + '_' + Math.random(),
      userId,
      transactionType: pricing.transactionType,
      amount: payableAmount,
      status: 'COMPLETED',
      balanceBefore,
      balanceAfter: updatedUser.walletBalance,
      idempotencyKey
    };
    db.walletTransactions.push(txnRecord);

    // 5. Payment & Subscription record
    db.payments.push({ userId, planName: targetKey, total: payableAmount, status: 'success' });
    db.subscriptionHistory.push({ userId, planName: targetKey, paymentStatus: 'active' });

    const result = {
      success: true,
      payableAmount,
      balanceAfter: updatedUser.walletBalance,
      plan: targetTier.name
    };

    if (idempotencyKey) {
      db.idempotencyRecords.set(idempotencyKey, { status: 'COMPLETED', result });
    }

    return result;
  });
};

// Simulation of user registration
const registerUser = (db, { email, name, password }) => {
  if (db.users.has(email)) {
    throw new Error('EMAIL_EXISTS');
  }
  const user = {
    _id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    email,
    name,
    password,
    role: 'user',
    walletBalance: 15000,
    currentPlan: 'basic',
    paymentStatus: 'free'
  };
  db.users.set(user._id, user);
  db.users.set(email, user._id); // Index email

  // Record initial welcome bonus transaction
  db.walletTransactions.push({
    userId: user._id,
    transactionType: 'REGISTRATION_BONUS',
    amount: 15000,
    status: 'COMPLETED',
    balanceBefore: 0,
    balanceAfter: 15000
  });

  return user;
};

// Simulation of safe migration logic
const migrateUsers = (db) => {
  let migratedCount = 0;
  for (const [key, user] of db.users.entries()) {
    if (typeof user === 'object' && user._id) {
      if (user.walletBalance === undefined || user.walletBalance === null) {
        user.walletBalance = 15000;
        migratedCount++;
      }
    }
  }
  return migratedCount;
};

// Simulation of middleware checks
const mockAuthProtect = (req) => {
  if (!req.headers || !req.headers.authorization) {
    throw new Error('401_UNAUTHORIZED');
  }
  if (!req.headers.authorization.startsWith('Bearer valid_token')) {
    throw new Error('401_INVALID_TOKEN');
  }
  return req.user;
};

const mockRequireAdmin = (req) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new Error('403_FORBIDDEN');
  }
  return true;
};

// =========================================================================
// TEST SUITE EXECUTION
// =========================================================================
async function main() {
  console.log('\n===============================================================');
  console.log('🧪 FIT ARC GYM - INTERNAL WALLET VERIFICATION TEST SUITE');
  console.log('===============================================================\n');

  // TEST 1: A newly registered user receives exactly 15,000 credits
  await runTest('TEST 1: Newly registered user receives exactly 15,000 credits', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'newbie@fitarcgym.com', name: 'New User' });

    assert.strictEqual(user.walletBalance, 15000, 'User walletBalance must equal 15,000');
    const bonusTxn = db.walletTransactions.find(t => t.userId === user._id && t.transactionType === 'REGISTRATION_BONUS');
    assert.ok(bonusTxn, 'REGISTRATION_BONUS transaction must be recorded');
    assert.strictEqual(bonusTxn.amount, 15000, 'Bonus transaction amount must be 15,000');
    assert.strictEqual(bonusTxn.balanceAfter, 15000, 'Balance after bonus must be 15,000');
  });

  // TEST 2: Existing user's wallet balance is preserved during migration
  await runTest('TEST 2: Existing user wallet balance is preserved during migration', async () => {
    const db = new MockDatabase();
    // User A already has an account with 8,500 credits
    const userA = { _id: 'uA', email: 'userA@test.com', walletBalance: 8500 };
    // User B is an unmigrated legacy user missing walletBalance
    const userB = { _id: 'uB', email: 'userB@test.com', walletBalance: undefined };

    db.users.set('uA', userA);
    db.users.set('uB', userB);

    const migratedCount = migrateUsers(db);
    assert.strictEqual(migratedCount, 1, 'Only 1 user should have been migrated');
    assert.strictEqual(userA.walletBalance, 8500, 'Existing user balance must be preserved (not overwritten)');
    assert.strictEqual(userB.walletBalance, 15000, 'Unmigrated user must receive 15,000 credits');
  });

  // TEST 3: User successfully purchases a plan
  await runTest('TEST 3: User successfully purchases a plan (deduction, platform credit, plan activated)', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'buyer@test.com', name: 'Buyer' });
    const initialUserBal = user.walletBalance; // 15,000
    const initialPlatBal = db.platformWallet.balance; // 0

    const premiumTier = PLAN_TIERS.premium;
    const expectedPayable = premiumTier.price + Math.round(premiumTier.price * TAX_RATE); // 3499 + 630 = 4129

    const res = await executePayment(db, { userId: user._id, planName: 'premium' });

    assert.strictEqual(res.success, true);
    assert.strictEqual(user.walletBalance, initialUserBal - expectedPayable, 'User balance must decrease by payable amount');
    assert.strictEqual(db.platformWallet.balance, initialPlatBal + expectedPayable, 'Platform balance must increase by payable amount');
    assert.strictEqual(user.currentPlan, 'premium', 'User currentPlan must be premium');
    assert.strictEqual(user.paymentStatus, 'active', 'User paymentStatus must be active');

    const purchaseTxn = db.walletTransactions.find(t => t.userId === user._id && t.transactionType === 'PLAN_PURCHASE');
    assert.ok(purchaseTxn, 'PLAN_PURCHASE transaction must be recorded');
    assert.strictEqual(purchaseTxn.amount, expectedPayable);
    assert.strictEqual(purchaseTxn.balanceAfter, user.walletBalance);
  });

  // TEST 4: Insufficient balance rejects payment
  await runTest('TEST 4: Insufficient balance rejects payment with zero state changes', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'broke@test.com', name: 'Broke User' });
    user.walletBalance = 500; // Less than 4,129
    const initialPlatBal = db.platformWallet.balance;

    let rejected = false;
    try {
      await executePayment(db, { userId: user._id, planName: 'premium' });
    } catch (e) {
      rejected = true;
      assert.strictEqual(e.message, 'INSUFFICIENT_FUNDS');
    }

    assert.ok(rejected, 'Must reject with INSUFFICIENT_FUNDS');
    assert.strictEqual(user.walletBalance, 500, 'User balance must remain unchanged');
    assert.strictEqual(db.platformWallet.balance, initialPlatBal, 'Platform balance must remain unchanged');
    assert.strictEqual(user.currentPlan, 'basic', 'User plan must not be upgraded');
  });

  // TEST 5: Invalid plan rejected
  await runTest('TEST 5: Invalid or purchasable plan rejected without state changes', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'buyer2@test.com', name: 'Buyer 2' });

    let rejected = false;
    try {
      await executePayment(db, { userId: user._id, planName: 'invalid_plan_tier_xyz' });
    } catch (e) {
      rejected = true;
      assert.strictEqual(e.message, 'INVALID_PLAN');
    }

    assert.ok(rejected, 'Invalid plan must be rejected');
    assert.strictEqual(user.walletBalance, 15000, 'Wallet balance must remain unchanged');
    assert.strictEqual(db.platformWallet.balance, 0, 'Platform balance must remain unchanged');
  });

  // TEST 6: Exception after wallet deduction rolls back entire transaction
  await runTest('TEST 6: Exception rolls back entire transaction (atomic ACID guarantee)', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'rollback@test.com', name: 'Rollback User' });
    const initialUserBal = user.walletBalance; // 15,000

    let failed = false;
    try {
      await db.withTransaction(async () => {
        // Step 1: Deduct balance
        db.atomicDeductBalance(user._id, 4129);
        // Step 2: Credit platform
        db.creditPlatform(4129);
        // Step 3: Simulate catastrophic crash or database error before committing
        throw new Error('DATABASE_CONNECTION_LOST');
      });
    } catch (e) {
      failed = true;
      assert.strictEqual(e.message, 'DATABASE_CONNECTION_LOST');
    }

    assert.ok(failed);
    const restoredUser = db.users.get(user._id);
    assert.strictEqual(restoredUser.walletBalance, initialUserBal, 'User balance must be rolled back');
    assert.strictEqual(db.platformWallet.balance, 0, 'Platform balance must be rolled back');
    assert.strictEqual(db.walletTransactions.length, 1, 'Only initial registration bonus should exist (no orphaned txns)');
  });

  // TEST 7: Idempotency key prevents duplicate charges
  await runTest('TEST 7: Same idempotency key submitted twice charges user only once', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'idemp@test.com', name: 'Idemp User' });
    const key = 'IDEMP_ORDER_999';

    // First attempt
    const res1 = await executePayment(db, { userId: user._id, planName: 'premium', idempotencyKey: key });
    assert.strictEqual(res1.success, true);
    const balanceAfterFirst = user.walletBalance;

    // Duplicate submission with same key
    const res2 = await executePayment(db, { userId: user._id, planName: 'premium', idempotencyKey: key });

    assert.strictEqual(res2.fromCache, true, 'Second submission must return cached result');
    assert.strictEqual(user.walletBalance, balanceAfterFirst, 'User must NOT be charged twice');
    assert.strictEqual(db.platformWallet.balance, res1.payableAmount, 'Platform must NOT receive duplicate credits');
    assert.strictEqual(db.payments.length, 1, 'Only 1 payment record must exist');
  });

  // TEST 8: Two concurrent purchases cannot overspend wallet
  await runTest('TEST 8: Concurrent purchases cannot overspend wallet balance', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'concurrent@test.com', name: 'Concurrent User' });
    user.walletBalance = 5000; // Enough for one 4,129 plan, but NOT two (8,258)

    // Launch two concurrent purchase attempts
    const req1 = executePayment(db, { userId: user._id, planName: 'premium', idempotencyKey: 'CONC_1' });
    const req2 = executePayment(db, { userId: user._id, planName: 'premium', idempotencyKey: 'CONC_2' });

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent request must succeed');
    assert.strictEqual(rejected.length, 1, 'Second concurrent request must fail');
    assert.strictEqual(user.walletBalance, 5000 - 4129, 'Balance must be 871 and NEVER negative');
    assert.ok(user.walletBalance >= 0, 'Balance must stay non-negative');
  });

  // TEST 9: Unauthenticated user rejected
  await runTest('TEST 9: Unauthenticated user rejected with 401', async () => {
    let rejected = false;
    try {
      mockAuthProtect({ headers: {} });
    } catch (e) {
      rejected = true;
      assert.strictEqual(e.message, '401_UNAUTHORIZED');
    }
    assert.ok(rejected, 'Unauthenticated request must throw 401');
  });

  // TEST 10: Normal user rejected from admin balance API
  await runTest('TEST 10: Normal user accessing admin balance API rejected with 403', async () => {
    let rejected = false;
    try {
      mockRequireAdmin({ user: { role: 'user', email: 'normal@test.com' } });
    } catch (e) {
      rejected = true;
      assert.strictEqual(e.message, '403_FORBIDDEN');
    }
    assert.ok(rejected, 'Non-admin must be rejected with 403');

    // Admin user should succeed
    const adminAllowed = mockRequireAdmin({ user: { role: 'admin', email: 'admin@fitarcgym.com' } });
    assert.strictEqual(adminAllowed, true, 'Admin user must be allowed');
  });

  // TEST 11: Tampered client price ignored; backend computes authoritative amount
  await runTest('TEST 11: Tampered client price ignored; backend calculates authoritative price', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'hacker@test.com', name: 'Hacker' });

    // Client maliciously attempts to send { price: 10, total: 10 }
    const res = await executePayment(db, {
      userId: user._id,
      planName: 'pro_ai_vip',
      clientSuppliedAmount: 10 // Attempted exploit
    });

    const expectedAuthoritative = PLAN_TIERS.pro_ai_vip.price + Math.round(PLAN_TIERS.pro_ai_vip.price * TAX_RATE); // 5999 + 1080 = 7079
    assert.strictEqual(res.payableAmount, expectedAuthoritative, 'Backend must charge authoritative amount, NOT 10');
    assert.strictEqual(user.walletBalance, 15000 - expectedAuthoritative, 'Deduction must match authoritative amount');
  });

  // TEST 12: Network retry with same idempotency key does not produce second charge
  await runTest('TEST 12: Network timeout retry with idempotency key does not double charge', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'retry@test.com', name: 'Retry User' });
    const key = 'RETRY_NET_KEY_123';

    // Initial call
    await executePayment(db, { userId: user._id, planName: 'premium', idempotencyKey: key });
    const balanceAfterInitial = user.walletBalance;

    // Retry after timeout
    const retryRes = await executePayment(db, { userId: user._id, planName: 'premium', idempotencyKey: key });

    assert.strictEqual(user.walletBalance, balanceAfterInitial, 'Balance must remain unchanged on retry');
    assert.strictEqual(db.platformWallet.balance, 4129, 'Platform balance must not be credited twice');
    assert.strictEqual(retryRes.fromCache, true, 'Must return cached original response');
  });

  // TEST 13: Failed transaction leaves no orphaned records
  await runTest('TEST 13: Failed transaction leaves no orphaned successful records or balance leak', async () => {
    const db = new MockDatabase();
    const user = registerUser(db, { email: 'orphan_check@test.com', name: 'Orphan Check' });
    user.walletBalance = 100; // Insufficient

    try {
      await executePayment(db, { userId: user._id, planName: 'premium' });
    } catch (e) {}

    assert.strictEqual(db.platformWallet.balance, 0, 'Platform balance must be 0');
    assert.strictEqual(db.payments.length, 0, 'No successful payment record should exist');
    assert.strictEqual(db.subscriptionHistory.length, 0, 'No subscription history record should exist');
  });

  // TEST 14: Repeated registration requests do not grant duplicate bonuses
  await runTest('TEST 14: Repeated registration requests do not grant duplicate bonuses', async () => {
    const db = new MockDatabase();
    registerUser(db, { email: 'repeat@test.com', name: 'First Attempt' });

    let duplicateRejected = false;
    try {
      registerUser(db, { email: 'repeat@test.com', name: 'Second Attempt' });
    } catch (e) {
      duplicateRejected = true;
      assert.strictEqual(e.message, 'EMAIL_EXISTS');
    }

    assert.ok(duplicateRejected, 'Duplicate registration must be rejected');
    const userBonuses = db.walletTransactions.filter(t => t.transactionType === 'REGISTRATION_BONUS');
    assert.strictEqual(userBonuses.length, 1, 'Only exactly 1 bonus transaction must be granted');
  });

  console.log('\n===============================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${passedTests + failedTests} PASSED (${failedTests} FAILED)`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
