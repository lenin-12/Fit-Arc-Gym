const Workout = require('../models/Workout');
const User = require('../models/User');
const { exerciseDatabase } = require('../data/exerciseDatabase');

/**
 * Generate today's AI workout for a user and save it in MongoDB.
 */
const generateTodayWorkout = async (user) => {
  // Normalize experience/activity level
  const rawLevel = user.experienceLevel || user.activityLevel || 'Intermediate';
  let level = 'Intermediate';
  if (typeof rawLevel === 'string') {
    if (rawLevel.toLowerCase().includes('advanced')) level = 'Advanced';
    else if (rawLevel.toLowerCase().includes('beginner')) level = 'Beginner';
  }

  const history = user.workoutHistory || [];

  // Determine volume target and rest based on level
  let targetCount = 6;
  let defaultRest = '75 sec';

  if (level === 'Beginner') {
    targetCount = 4;
    defaultRest = '90-120 sec';
  } else if (level === 'Advanced') {
    targetCount = 8;
    defaultRest = '45-60 sec';
  }

  // Determine today's split rotation
  const dayIndex = (history.length % 6) + 1;
  let splitTitle = `${level} Push Hypertrophy Split`;
  let simpleTitle = 'Chest + Triceps';
  let targetCategories = ['Chest', 'Shoulders', 'Arms'];

  if (dayIndex === 2 || dayIndex === 5) {
    splitTitle = `${level} Pull & Lats Power Split`;
    simpleTitle = 'Back + Biceps';
    targetCategories = ['Back', 'Arms', 'Core'];
  } else if (dayIndex === 3 || dayIndex === 6) {
    splitTitle = `${level} Legs & Lower Body Split`;
    simpleTitle = 'Legs';
    targetCategories = ['Legs', 'Core'];
  }

  // Filter exercises matching target categories
  let selected = exerciseDatabase.filter((ex) => targetCategories.includes(ex.muscleCategory));

  // Fill up/slice to targetCount
  if (selected.length > targetCount) {
    selected = selected.slice(0, targetCount);
  } else if (selected.length < targetCount) {
    const extra = exerciseDatabase.filter((ex) => !selected.includes(ex));
    selected = [...selected, ...extra.slice(0, targetCount - selected.length)];
  }

  // Format exercise list with tier-specific volume & rest values
  const formattedExercises = selected.map((ex, idx) => {
    const finalSets = level === 'Advanced' ? Math.min(5, ex.sets + 1) : level === 'Beginner' ? Math.max(3, ex.sets - 1) : ex.sets;
    const finalRest = level === 'Advanced' ? '45-60 sec' : level === 'Beginner' ? '90-120 sec' : ex.rest;

    return {
      id: String(idx + 1),
      name: ex.name,
      muscle: ex.targetMuscle,
      sets: finalSets,
      reps: ex.reps,
      rest: finalRest,
      instructions: ex.instructions,
      image: ex.img,
      img: ex.img, // backend store copy for frontend compatibility
      completed: false,
      completedAt: null
    };
  });

  const totalCalories = formattedExercises.reduce((sum, e) => {
    // find matching database exercise for calories count
    const baseEx = exerciseDatabase.find((dbEx) => dbEx.name === e.name) || { caloriesPerSet: 20 };
    return sum + (baseEx.caloriesPerSet * e.sets);
  }, 0);

  const totalDuration = targetCount * 7 + 10;
  const warmup = level === 'Advanced' ? '8 mins explosive treadmill sprints & rotator cuff mobility.' : '5 mins light treadmill jog & arm circles.';
  const cooldown = '5 mins deep static stretching for primary muscle groups.';

  const workout = new Workout({
    userId: user._id,
    date: new Date(),
    title: splitTitle,
    simpleTitle,
    splitName: `${targetCategories.join(' & ')} Focus`,
    difficulty: level,
    durationMinutes: totalDuration,
    caloriesBurned: totalCalories,
    exercises: formattedExercises,
    programDay: `Day ${dayIndex} of Program`,
    overallDifficulty: level,
    warmup,
    cooldown,
    completed: false,
    completedAt: null
  });

  await workout.save();
  return workout;
};

/**
 * Get today's workout for a user, or generate a new one if it doesn't exist.
 */
const getTodayWorkout = async (userId, user) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  let workout = await Workout.findOne({
    userId,
    date: { $gte: startOfToday, $lte: endOfToday }
  });

  if (!workout) {
    workout = await generateTodayWorkout(user);
  }

  // Auto-repair inconsistency: If the overall workout is finalized, all its exercises must be marked completed.
  if (workout.completed) {
    let hasInconsistency = false;
    workout.exercises.forEach((ex) => {
      if (!ex.completed) {
        ex.completed = true;
        ex.completedAt = ex.completedAt || new Date();
        hasInconsistency = true;
      }
    });
    if (hasInconsistency) {
      await workout.save();
    }
  }

  return workout;
};

/**
 * Toggle an exercise's completion status in today's workout.
 */
const updateExerciseCompletion = async (userId, exerciseId, completed) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const workout = await Workout.findOne({
    userId,
    date: { $gte: startOfToday, $lte: endOfToday }
  });

  if (!workout) {
    throw new Error("No active workout found for today.");
  }

  if (workout.completed) {
    throw new Error("Today's workout has already been completed and finalized. Exercises cannot be modified.");
  }

  const exercise = workout.exercises.find((ex) => ex.id === String(exerciseId));
  if (!exercise) {
    throw new Error(`Exercise with ID ${exerciseId} not found in today's workout.`);
  }

  exercise.completed = !!completed;
  exercise.completedAt = completed ? new Date() : null;

  await workout.save();
  return workout;
};

/**
 * Complete today's workout and update user metrics (XP, streak, completed count, history).
 */
const finishWorkout = async (userId) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const workout = await Workout.findOne({
    userId,
    date: { $gte: startOfToday, $lte: endOfToday }
  });

  if (!workout) {
    throw new Error("No active workout found for today.");
  }

  if (workout.completed) {
    throw new Error("Today's workout has already been completed.");
  }

  // Validate every exercise is completed
  const allCompleted = workout.exercises.every((ex) => ex.completed);
  if (!allCompleted) {
    throw new Error("Cannot finish workout: not all exercises are completed.");
  }

  // Update workout completion fields
  workout.completed = true;
  workout.completedAt = new Date();
  await workout.save();

  // Retrieve user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  // Update streak logic
  const currentStreak = user.currentStreak || 0;
  if (!user.workoutHistory || user.workoutHistory.length === 0) {
    user.currentStreak = 1;
  } else {
    // Get date of last completed workout
    const lastWorkoutDate = new Date(user.workoutHistory[0].date);
    lastWorkoutDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - lastWorkoutDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      user.currentStreak = currentStreak + 1;
    } else if (diffDays === 0) {
      // Same day, streak remains unchanged
    } else {
      // Streak broken, reset to 1
      user.currentStreak = 1;
    }
  }

  // Create simple history log entry
  const workoutEntry = {
    title: workout.title,
    category: workout.splitName || 'Strength',
    durationMinutes: workout.durationMinutes,
    caloriesBurned: workout.caloriesBurned,
    date: new Date()
  };

  user.workoutHistory = user.workoutHistory || [];
  user.workoutHistory.unshift(workoutEntry);
  user.completedWorkoutCount = (user.completedWorkoutCount || 0) + 1;
  user.currentXP = (user.currentXP || 0) + 50;

  await user.save();

  // Return updated user and workout
  return {
    workout,
    user
  };
};

module.exports = {
  getTodayWorkout,
  updateExerciseCompletion,
  finishWorkout
};
