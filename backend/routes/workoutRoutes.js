const express = require('express');
const router = express.Router();
const {
  getTodayWorkout,
  updateExerciseCompletion,
  finishWorkout
} = require('../controllers/workoutController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/today', protect, getTodayWorkout);
router.patch('/exercise', protect, updateExerciseCompletion);
router.post('/finish', protect, finishWorkout);

module.exports = router;
