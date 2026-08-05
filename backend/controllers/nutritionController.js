const nutritionService = require('../services/nutritionService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * GET /api/nutrition/today
 * Retrieves or generates today's nutrition totals and target macros.
 */
const getTodayNutrition = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const summary = await nutritionService.getTodayNutrition(userId, req.user);
    return sendSuccess(res, "Today's nutrition summary retrieved successfully", summary);
  } catch (error) {
    return sendError(res, error.message || 'Error fetching today\'s nutrition summary', 500);
  }
};

/**
 * POST /api/nutrition/meal
 * Logs a meal to today's daily record. Updates consumed totals.
 */
const logMeal = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { mealName, name } = req.body;

    if (!mealName && !name) {
      return sendError(res, 'Meal name is required', 400);
    }

    const summary = await nutritionService.logMeal(userId, req.user, req.body);
    return sendSuccess(res, 'Meal logged successfully', summary);
  } catch (error) {
    return sendError(res, error.message || 'Error logging meal', 500);
  }
};

/**
 * POST /api/nutrition/reset
 * Resets today's consumed macros and deletes meal logs from the MongoDB document.
 */
const resetDiet = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const summary = await nutritionService.resetDietData(userId, req.user);
    return sendSuccess(res, 'Diet logs cleared. Starting with clean 0 state!', summary);
  } catch (error) {
    return sendError(res, error.message || 'Error resetting nutrition logs', 500);
  }
};

module.exports = {
  getTodayNutrition,
  logMeal,
  resetDiet
};
