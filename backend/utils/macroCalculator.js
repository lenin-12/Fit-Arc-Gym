/**
 * Backend utility function to calculate daily macro targets using the Mifflin-St Jeor formula
 * based on user biometrics (weight, height, age, gender, goal, activity level).
 */
const calculateMacroTargets = (user = {}) => {
  const weight = Number(user.weight) > 0 ? Number(user.weight) : 70; // kg
  const height = Number(user.height) > 0 ? Number(user.height) : 175; // cm
  const age = Number(user.age) > 0 ? Number(user.age) : 25; // years
  const gender = user.gender || 'Male';
  const goal = user.fitnessGoal || 'Gain Muscle';
  const activity = user.activityLevel || 'Intermediate';

  // 1. Mifflin-St Jeor BMR Formula
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender === 'Male') {
    bmr += 5;
  } else if (gender === 'Female') {
    bmr -= 161;
  } else {
    bmr -= 78; // average offset for 'Other'
  }

  // 2. Activity Level Multipliers
  let activityMultiplier = 1.55; // Intermediate default
  if (activity === 'Beginner') {
    activityMultiplier = 1.375;
  } else if (activity === 'Advanced') {
    activityMultiplier = 1.725;
  }

  const tdee = bmr * activityMultiplier;

  // 3. Goal Adjustment
  let goalAdjustment = 300;
  if (goal === 'Lose Weight') {
    goalAdjustment = -500;
  } else if (goal === 'Body Recomposition') {
    goalAdjustment = -200;
  } else if (goal === 'Maintain Fitness' || goal === 'Improve Endurance') {
    goalAdjustment = 0;
  } else if (goal === 'Gain Muscle') {
    goalAdjustment = 350;
  }

  const targetCalories = Math.max(1200, Math.round(tdee + goalAdjustment));

  // 4. Protein Target (g/kg body weight)
  let proteinRatio = 1.6;
  if (goal === 'Gain Muscle' || goal === 'Body Recomposition') {
    proteinRatio = 2.0;
  } else if (goal === 'Lose Weight') {
    proteinRatio = 1.8;
  }

  const targetProtein = Math.round(weight * proteinRatio);
  const proteinCalories = targetProtein * 4;

  // 5. Fats Target (25% of total calories, 9 kcal/g)
  const fatCalories = targetCalories * 0.25;
  const targetFats = Math.round(fatCalories / 9);

  // 6. Carbs Target (Remaining calories, 4 kcal/g)
  const carbCalories = Math.max(0, targetCalories - (proteinCalories + fatCalories));
  const targetCarbs = Math.round(carbCalories / 4);

  return {
    calories: targetCalories,
    protein: targetProtein,
    carbs: targetCarbs,
    fats: targetFats
  };
};

module.exports = { calculateMacroTargets };
