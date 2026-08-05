const express = require('express');
const router = express.Router();
const {
  updateProfile,
  incrementWater,
  toggleDietPreference,
  logWorkout,
  logMeal,
  updateDietDay,
  uploadProfilePicture,
  changePassword,
  deleteAccount,
  getTodayNutrition,
  resetDietData
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerMiddleware');

router.put('/profile', protect, updateProfile);
router.get('/today-nutrition', protect, getTodayNutrition);
router.post('/reset-diet', protect, resetDietData);
router.post('/water-increment', protect, incrementWater);
router.post('/toggle-diet', protect, toggleDietPreference);
router.post('/workout-log', protect, logWorkout);
router.post('/meal-log', protect, logMeal);
router.put('/diet-day', protect, updateDietDay);
router.post('/upload-avatar', protect, upload.single('profilePicture'), uploadProfilePicture);
router.post('/change-password', protect, changePassword);

module.exports = router;
