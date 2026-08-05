import { calculateMacroTargets } from './macroCalculator';

/**
 * Single Source of Truth for Frontend Nutrition Calculation
 * Used as a fallback if the backend user.todayNutrition is not yet populated.
 * Guarantees that ALL pages display the exact same values.
 */
export const calculateTodayNutrition = (user) => {
  if (!user) {
    return {
      hasLoggedMeals: false,
      loggedMealsCount: 0,
      consumed: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      targets: { calories: 2200, protein: 140, carbs: 250, fats: 60 },
      remaining: { calories: 2200, protein: 140, carbs: 250, fats: 60 },
      loggedMeals: []
    };
  }

  const todayStr = new Date().toDateString();
  const dietHistory = Array.isArray(user.dietHistory) ? user.dietHistory : [];

  // Filter confirmed meals logged TODAY
  const loggedToday = dietHistory.filter((m) => {
    if (!m || !m.date) return false;
    return new Date(m.date).toDateString() === todayStr && m.isLogged === true;
  });

  const consumedCalories = loggedToday.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const consumedProtein = loggedToday.reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
  const consumedCarbs = loggedToday.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
  const consumedFats = loggedToday.reduce((sum, m) => sum + (Number(m.fats) || 0), 0);

  const targets = user.dailyTargets || calculateMacroTargets(user);
  const targetCalories = Number(targets.calories || targets.targetCalories) || 2200;
  const targetProtein = Number(targets.protein || targets.targetProtein) || 140;
  const targetCarbs = Number(targets.carbs || targets.targetCarbs) || 250;
  const targetFats = Number(targets.fats || targets.targetFats) || 60;

  const roundedConsumedCals = Math.round(consumedCalories);
  const roundedConsumedProtein = Math.round(consumedProtein);
  const roundedConsumedCarbs = Math.round(consumedCarbs);
  const roundedConsumedFats = Math.round(consumedFats);

  return {
    date: new Date().toISOString(),
    hasLoggedMeals: loggedToday.length > 0,
    loggedMealsCount: loggedToday.length,
    consumed: {
      calories: roundedConsumedCals,
      protein: roundedConsumedProtein,
      carbs: roundedConsumedCarbs,
      fats: roundedConsumedFats
    },
    targets: {
      calories: targetCalories,
      protein: targetProtein,
      carbs: targetCarbs,
      fats: targetFats
    },
    remaining: {
      calories: Math.max(0, targetCalories - roundedConsumedCals),
      protein: Math.max(0, targetProtein - roundedConsumedProtein),
      carbs: Math.max(0, targetCarbs - roundedConsumedCarbs),
      fats: Math.max(0, targetFats - roundedConsumedFats)
    },
    loggedMeals: loggedToday
  };
};
