const express = require('express');
const router = express.Router();
const {
  getWalletBalance,
  getWalletTransactions,
  purchasePlanWithWallet,
  getPlanQuote,
  getAdminWallet,
  getAdminTransactions
} = require('../controllers/walletController');
const { protect, requireAdmin } = require('../middlewares/authMiddleware');


router.get('/wallet', protect, getWalletBalance);


router.get('/wallet/transactions', protect, getWalletTransactions);


router.get('/payments/quote', protect, getPlanQuote);

router.post('/payments/plan', protect, purchasePlanWithWallet);


router.post('/payment/wallet', protect, purchasePlanWithWallet);


router.get('/admin/wallet', protect, requireAdmin, getAdminWallet);


router.get('/admin/transactions', protect, requireAdmin, getAdminTransactions);

module.exports = router;