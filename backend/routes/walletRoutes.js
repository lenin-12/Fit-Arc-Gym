const express = require('express');
const router = express.Router();
const {
  getWalletBalance,
  getWalletTransactions,
  purchasePlanWithWallet,
  getAdminWallet,
  getAdminTransactions
} = require('../controllers/walletController');
const { protect, requireAdmin } = require('../middlewares/authMiddleware');

// 1. Authenticated User Wallet Endpoints
// GET /api/wallet
router.get('/wallet', protect, getWalletBalance);

// GET /api/wallet/transactions
router.get('/wallet/transactions', protect, getWalletTransactions);

// POST /api/payments/plan
router.post('/payments/plan', protect, purchasePlanWithWallet);

// POST /api/payment/wallet (convenient alias for existing payment route patterns)
router.post('/payment/wallet', protect, purchasePlanWithWallet);

// 2. Administrator Platform Endpoints
// GET /api/admin/wallet
router.get('/admin/wallet', protect, requireAdmin, getAdminWallet);

// GET /api/admin/transactions
router.get('/admin/transactions', protect, requireAdmin, getAdminTransactions);

module.exports = router;
