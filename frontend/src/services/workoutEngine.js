import { exerciseDatabase } from '../data/exerciseDatabase';

/**
 * AI Workout Generation Engine
 * Deterministic, rule-based generation system matching the app's Rule Engine pattern.
 */
export function generateAIWorkout(user) {
  // Check experienceLevel first, then fall back to activityLevel (e.g. 'Advanced', 'Intermediate', 'Beginner')
  const rawLevel = user?.experienceLevel || user?.activityLevel || 'Intermediate';

  // Normalize level string (e.g., 'Advanced' if string contains 'Advanced', 'Beginner' if 'Beginner', else 'Intermediate')
  let level = 'Intermediate';
  if (typeof rawLevel === 'string') {
    if (rawLevel.toLowerCase().includes('advanced')) level = 'Advanced';
    else if (rawLevel.toLowerCase().includes('beginner')) level = 'Beginner';
  }

  const history = user?.workoutHistory || [];

  // Determine volume target & structure based on D2 tier spec
  let targetCount = 6;
  let setsMultiplier = 1;
  let defaultRest = '75 sec';

  if (level === 'Beginner') {
    targetCount = 4;
    defaultRest = '90-120 sec';
  } else if (level === 'Advanced') {
    targetCount = 8;
    setsMultiplier = 1.25; // Higher volume: 4-5 sets
    defaultRest = '45-60 sec'; // Shorter rest
  }

  // Compute Recovery Status: Days since last trained per muscle category (D4)
  const lastTrainedMap = {};
  const today = new Date();

  history.forEach((w) => {
    if (w.date && w.category) {
      const wDate = new Date(w.date);
      const diffDays = Math.floor((today - wDate) / (1000 * 60 * 60 * 24));
      const cat = w.category.toLowerCase();
      if (lastTrainedMap[cat] === undefined || diffDays < lastTrainedMap[cat]) {
        lastTrainedMap[cat] = diffDays;
      }
    }
  });

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

  // Fill up to targetCount from exerciseDatabase
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
      id: idx + 1,
      name: ex.name,
      muscle: ex.targetMuscle,
      muscleCategory: ex.muscleCategory,
      sets: finalSets,
      reps: ex.reps,
      rest: finalRest,
      difficulty: level === 'Advanced' ? 'Advanced' : ex.difficulty,
      instructions: ex.instructions,
      completed: false,
      img: ex.img,
      calories: ex.caloriesPerSet * finalSets
    };
  });

  const totalCalories = formattedExercises.reduce((sum, e) => sum + e.calories, 0);
  const totalDuration = targetCount * 7 + 10;

  return {
    title: splitTitle,
    simpleTitle: simpleTitle,
    splitName: `${targetCategories.join(' & ')} Focus`,
    programDay: `Day ${dayIndex} of Program`,
    durationMinutes: totalDuration,
    caloriesBurned: totalCalories,
    overallDifficulty: level,
    exercises: formattedExercises,
    warmup: level === 'Advanced' ? '8 mins explosive treadmill sprints & rotator cuff mobility.' : '5 mins light treadmill jog & arm circles.',
    cooldown: '5 mins deep static stretching for primary muscle groups.'
  };
}
