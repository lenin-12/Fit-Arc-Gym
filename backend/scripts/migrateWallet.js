/**
 * Fit Arc Gym - Wallet Migration & Initialization Script
 *
 * Safe migration strategy:
 * 1. Safely finds all users missing the `walletBalance` field and sets it to 15,000 credits.
 * 2. Leaves existing user balances completely intact without overwriting them.
 * 3. Logs initial REGISTRATION_BONUS transactions for migrated users if not already present.
 * 4. Ensures the PlatformWallet singleton document is initialized to 0 credits (or preserved).
 * 5. Syncs all necessary database indexes (compound, unique, sparse).
 *
 * Usage:
 *   node backend/scripts/migrateWallet.js
 * Or via npm:
 *   npm run migrate:wallet (from backend directory)
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const PlatformWallet = require('../models/PlatformWallet');
const WalletTransaction = require('../models/WalletTransaction');
const IdempotencyRecord = require('../models/IdempotencyRecord');

const runMigration = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fit_arc_gym';

  console.log('====================================================');
  console.log('🚀 FIT-ARC-GYM: Starting Wallet Migration & Init');
  console.log('====================================================');

  try {
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.host}`);

    // STEP 1: Sync Indexes
    console.log('\n[Step 1] Synchronizing database indexes...');
    await Promise.all([
      User.syncIndexes(),
      PlatformWallet.syncIndexes(),
      WalletTransaction.syncIndexes(),
      IdempotencyRecord.syncIndexes()
    ]);
    console.log('✅ Database indexes synchronized successfully.');

    // STEP 2: Initialize PlatformWallet Singleton
    console.log('\n[Step 2] Initializing PlatformWallet singleton...');
    const platformWallet = await PlatformWallet.getOrCreateSingleton();
    console.log(`✅ Platform Wallet ready. Current Balance: ${platformWallet.balance} ${platformWallet.currency}`);

    // STEP 3: Safe User Migration
    console.log('\n[Step 3] Migrating existing user documents without wallet balances...');

    // Find users where walletBalance is undefined or null
    const usersNeedingMigration = await User.find({
      $or: [
        { walletBalance: { $exists: false } },
        { walletBalance: null }
      ]
    });

    console.log(`Found ${usersNeedingMigration.length} user(s) requiring wallet balance initialization.`);

    let migratedCount = 0;
    for (const user of usersNeedingMigration) {
      // Set initial balance
      user.walletBalance = 15000;
      if (!user.role) {
        user.role = 'user';
      }
      await user.save();

      // Check if registration bonus transaction already recorded
      const existingTxn = await WalletTransaction.findOne({
        userId: user._id,
        transactionType: 'REGISTRATION_BONUS'
      });

      if (!existingTxn) {
        await WalletTransaction.create({
          userId: user._id,
          transactionType: 'REGISTRATION_BONUS',
          amount: 15000,
          status: 'COMPLETED',
          description: 'Initial migration welcome bonus: 15,000 wallet credits',
          relatedPlanId: null,
          relatedOrderId: null,
          idempotencyKey: `MIGRATE_${user._id}`,
          balanceBefore: 0,
          balanceAfter: 15000
        });
      }

      migratedCount++;
      console.log(` -> Migrated user: ${user.email} (Wallet initialized to 15,000 credits)`);
    }

    console.log(`\n✅ Migration Complete! ${migratedCount} user(s) safely initialized.`);

    // STEP 4: Integrity Summary
    const totalUsers = await User.countDocuments();
    const totalWithWallet = await User.countDocuments({ walletBalance: { $exists: true, $ne: null } });
    console.log('\n====================================================');
    console.log(`📊 Integrity Check: ${totalWithWallet}/${totalUsers} users possess active wallet balances.`);
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
