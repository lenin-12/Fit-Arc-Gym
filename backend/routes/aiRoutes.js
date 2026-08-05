const express = require('express');
const router = express.Router();
const {
  askAICoach,
  askAICoachStreaming,
  getChatHistory,
  clearChatHistory,
  generateWorkout
} = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/coach', protect, askAICoach);
router.post('/coach-stream', protect, askAICoachStreaming);
router.get('/history', protect, getChatHistory);
router.post('/history/clear', protect, clearChatHistory);
router.post('/generate-workout', protect, generateWorkout);

module.exports = router;
