const NutritionTarget = require('../models/NutritionTarget');
const DailyNutrition = require('../models/DailyNutrition');
const { calculateMacroTargets } = require('../utils/macroCalculator');

/**
 * Helper to calculate and format today's nutrition response from a DailyNutrition document.
 */
const formatNutritionResponse = (daily) => {
  const cConsumed = Math.round(daily.caloriesConsumed);
  const pConsumed = Math.round(daily.proteinConsumed);
  const cConsumedCarbs = Math.round(daily.carbsConsumed);
  const fConsumed = Math.round(daily.fatConsumed);

  const cTarget = Math.round(daily.caloriesTarget);
  const pTarget = Math.round(daily.proteinTarget);
  const carbTarget = Math.round(daily.carbsTarget);
  const fTarget = Math.round(daily.fatTarget);

  return {
    date: daily.date.toISOString(),
    hasLoggedMeals: daily.meals.length > 0,
    loggedMealsCount: daily.meals.length,
    consumed: {
      calories: cConsumed,
      protein: pConsumed,
      carbs: cConsumedCarbs,
      fats: fConsumed,
      fat: fConsumed
    },
    targets: {
      calories: cTarget,
      protein: pTarget,
      carbs: carbTarget,
      fats: fTarget,
      fat: fTarget
    },
    remaining: {
      calories: Math.max(0, cTarget - cConsumed),
      protein: Math.max(0, pTarget - pConsumed),
      carbs: Math.max(0, carbTarget - cConsumedCarbs),
      fats: Math.max(0, fTarget - fConsumed),
      fat: Math.max(0, fTarget - fConsumed)
    },
    loggedMeals: daily.meals
  };
};

/**
 * Gets or creates the target nutrition profile for a user.
 */
const getOrCreateTarget = async (userId, user) => {
  let target = await NutritionTarget.findOne({ userId });

  if (!target) {
    const calculated = calculateMacroTargets(user || {});
    target = new NutritionTarget({
      userId,
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fat: calculated.fats || calculated.fat || 60
    });
    await target.save();
  }

  return target;
};

/**
 * Retrieves today's daily nutrition details, generating targets and creating a fresh day document if needed.
 */
const getTodayNutrition = async (userId, user) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // 1. Find daily nutrition document for today
  let daily = await DailyNutrition.findOne({
    userId,
    date: { $gte: startOfToday, $lte: endOfToday }
  });

  // 2. If not found, get/create target and create daily document
  if (!daily) {
    const target = await getOrCreateTarget(userId, user);
    daily = new DailyNutrition({
      userId,
      date: new Date(),
      caloriesTarget: target.calories,
      proteinTarget: target.protein,
      carbsTarget: target.carbs,
      fatTarget: target.fat,
      caloriesConsumed: 0,
      proteinConsumed: 0,
      carbsConsumed: 0,
      fatConsumed: 0,
      meals: []
    });
    await daily.save();
  }

  return formatNutritionResponse(daily);
};

/**
 * Logs a new meal, updating daily consumed totals and saving to MongoDB.
 */
const logMeal = async (userId, user, mealData) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let daily = await DailyNutrition.findOne({
    userId,
    date: { $gte: startOfToday, $lte: endOfToday }
  });

  if (!daily) {
    const target = await getOrCreateTarget(userId, user);
    daily = new DailyNutrition({
      userId,
      date: new Date(),
      caloriesTarget: target.calories,
      proteinTarget: target.protein,
      carbsTarget: target.carbs,
      fatTarget: target.fat,
      caloriesConsumed: 0,
      proteinConsumed: 0,
      carbsConsumed: 0,
      fatConsumed: 0,
      meals: []
    });
  }

  // Map meal values
  const calories = Number(mealData.calories) || 0;
  const protein = Number(mealData.protein) || 0;
  const carbs = Number(mealData.carbs) || 0;
  const fat = Number(mealData.fats || mealData.fat || 0);
  const mealName = mealData.mealName || mealData.name || 'Meal';
  const mealType = mealData.mealType || 'Snack';

  const mealEntry = {
    mealName,
    mealType,
    calories,
    protein,
    carbs,
    fat,
    fats: fat,
    date: new Date()
  };

  daily.meals.push(mealEntry);
  daily.caloriesConsumed += calories;
  daily.proteinConsumed += protein;
  daily.carbsConsumed += carbs;
  daily.fatConsumed += fat;

  await daily.save();
  return formatNutritionResponse(daily);
};

/**
 * Resets today's consumed macros and deletes meal logs from the MongoDB document.
 */
const resetDietData = async (userId, user) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let daily = await DailyNutrition.findOne({
    userId,
    date: { $gte: startOfToday, $lte: endOfToday }
  });

  if (!daily) {
    const target = await getOrCreateTarget(userId, user);
    daily = new DailyNutrition({
      userId,
      date: new Date(),
      caloriesTarget: target.calories,
      proteinTarget: target.protein,
      carbsTarget: target.carbs,
      fatTarget: target.fat,
      caloriesConsumed: 0,
      proteinConsumed: 0,
      carbsConsumed: 0,
      fatConsumed: 0,
      meals: []
    });
  } else {
    daily.meals = [];
    daily.caloriesConsumed = 0;
    daily.proteinConsumed = 0;
    daily.carbsConsumed = 0;
    daily.fatConsumed = 0;
  }

  await daily.save();
  return formatNutritionResponse(daily);
};

module.exports = {
  calculateTodayNutrition: getTodayNutrition, // mapping name for backwards compatibility if needed
  getTodayNutrition,
  logMeal,
  resetDietData
};
