const express = require('express');
const router = express.Router();
const {
  getPlanDetails,
  getPlanStatus,
  selectPlan,
  createPayment,
  processPaymentSuccess,
  getPaymentHistory
} = require('../controllers/planController');
const { protect } = require('../middlewares/authMiddleware');

// GET /api/plan
router.get('/plan', protect, getPlanDetails);

// GET /api/plan/status
router.get('/plan/status', protect, getPlanStatus);

// POST /api/plan/select
router.post('/plan/select', protect, selectPlan);

// POST /api/payment/create
router.post('/payment/create', protect, createPayment);

// POST /api/payment/success
router.post('/payment/success', protect, processPaymentSuccess);

// GET /api/payment/history
router.get('/payment/history', protect, getPaymentHistory);

module.exports = router;
