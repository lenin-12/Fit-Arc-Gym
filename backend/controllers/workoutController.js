const workoutService = require('../services/workoutService');
const { validateUpdateExercise } = require('../validators/workoutValidator');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * GET /api/workout/today
 * Retrieves today's workout, or generates a new one.
 */
const getTodayWorkout = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const workout = await workoutService.getTodayWorkout(userId, req.user);
    return sendSuccess(res, "Today's workout retrieved successfully", { workout });
  } catch (error) {
    return sendError(res, error.message || 'Error fetching today\'s workout', 500);
  }
};

/**
 * PATCH /api/workout/exercise
 * Immediately update an exercise's completion status.
 */
const updateExerciseCompletion = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    // Validate request body
    const { isValid, errors } = validateUpdateExercise(req.body);
    if (!isValid) {
      return sendError(res, errors.join(', '), 400);
    }

    const { exerciseId, completed } = req.body;
    const workout = await workoutService.updateExerciseCompletion(userId, exerciseId, completed);
    return sendSuccess(res, 'Exercise status updated', { workout });
  } catch (error) {
    return sendError(res, error.message || 'Error updating exercise completion status', 500);
  }
};

/**
 * POST /api/workout/finish
 * Validates and finalizes today's workout. Updates User XP, streak, history, and completed counts.
 */
const finishWorkout = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { workout, user } = await workoutService.finishWorkout(userId);

    // Format payload similar to userController
    const payload = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete payload.password;

    return sendSuccess(res, 'Workout completed & saved to database! +50 XP 🔥', {
      workout,
      user: payload
    });
  } catch (error) {
    return sendError(res, error.message || 'Error completing workout session', 500);
  }
};

module.exports = {
  getTodayWorkout,
  updateExerciseCompletion,
  finishWorkout
};
