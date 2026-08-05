const express = require('express');
const router = express.Router();
const {
  getTodayNutrition,
  logMeal,
  resetDiet
} = require('../controllers/nutritionController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/today', protect, getTodayNutrition);
router.post('/meal', protect, logMeal);
router.post('/reset', protect, resetDiet);

module.exports = router;
