const User = require('../models/User');
const Workout = require('../models/Workout');
const DailyNutrition = require('../models/DailyNutrition');
const ChatHistory = require('../models/ChatHistory');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { generateAICoachResponse, generateStructuredWorkout } = require('../services/openaiService');
const mockUsersStore = require('../services/mockDbStore');

/**
 * Builds the comprehensive personalized AI Coach system prompt from MongoDB context
 */
const buildSystemContextPrompt = async (userId, user) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // 1. Fetch today's workout
  let workout = null;
  try {
    workout = await Workout.findOne({
      userId,
      date: { $gte: startOfToday, $lte: endOfToday }
    });
  } catch (err) {
    console.error('Error loading workout for system context:', err);
  }

  // 2. Fetch today's nutrition
  let nutrition = null;
  try {
    nutrition = await DailyNutrition.findOne({
      userId,
      date: { $gte: startOfToday, $lte: endOfToday }
    });
  } catch (err) {
    console.error('Error loading nutrition for system context:', err);
  }

  // 3. Build detailed prompt with User profile, Workout, Nutrition, Progress, Plan, Goal, Age, Weight, Height, Experience, Current Day, Sleep, Water
  const userProfile = {
    name: user.name || 'Athlete',
    gender: user.gender || 'Male',
    age: user.age || 25,
    height: user.height || 175,
    weight: user.weight || 70,
    fitnessGoal: user.fitnessGoal || 'Gain Muscle',
    experience: user.activityLevel || 'Intermediate',
    sleepHours: user.sleepHours || 7.5,
    waterIntake: user.waterIntake || 4
  };

  const planInfo = {
    currentPlan: user.currentPlan || 'basic',
    planName: user.plan || 'Basic Plan',
    paymentStatus: user.paymentStatus || 'free',
    daysRemaining: user.planExpiryDate ? Math.max(0, Math.ceil((new Date(user.planExpiryDate) - Date.now()) / (1000 * 60 * 60 * 24))) : 0
  };

  const workoutContext = workout
    ? {
        title: workout.title,
        splitName: workout.splitName,
        difficulty: workout.difficulty,
        durationMinutes: workout.durationMinutes,
        caloriesBurned: workout.caloriesBurned,
        completed: workout.completed,
        exercises: (workout.exercises || []).map(e => `${e.name} (${e.sets}x${e.reps}, ${e.completed ? 'Completed' : 'Pending'})`).join(', ')
      }
    : null;

  const nutritionContext = nutrition
    ? {
        caloriesConsumed: nutrition.caloriesConsumed,
        caloriesTarget: nutrition.caloriesTarget,
        proteinConsumed: nutrition.proteinConsumed,
        proteinTarget: nutrition.proteinTarget,
        carbsConsumed: nutrition.carbsConsumed,
        carbsTarget: nutrition.carbsTarget,
        fatConsumed: nutrition.fatConsumed,
        fatTarget: nutrition.fatTarget,
        meals: (nutrition.meals || []).map(m => `${m.mealName} [${m.mealType}] (${m.calories} kcal, ${m.protein}g P)`).join(', ')
      }
    : null;

  const weightLogs = (user.weightHistory || []).map(w => `${w.weight}kg on ${new Date(w.date).toLocaleDateString()}`).join(', ') || 'None';
  const workoutHistoryList = (user.workoutHistory || []).map(w => `"${w.title}" on ${new Date(w.date).toLocaleDateString()}`).join(', ') || 'None';

  return `You are an expert AI Fitness & Nutrition Coach at FIT-ARC-GYM.
You MUST personalize every response. Do NOT give general advice. Speak directly to the user's specific context.

USER CURRENT CONTEXT (from MongoDB):
- User Profile:
  - Name: ${userProfile.name}
  - Goal: ${userProfile.fitnessGoal}
  - Age: ${userProfile.age} years
  - Weight: ${userProfile.weight} kg
  - Height: ${userProfile.height} cm
  - Experience Level: ${userProfile.experience}
- Lifestyle (Today):
  - Sleep: ${userProfile.sleepHours} hours
  - Water Intake: ${userProfile.waterIntake} glasses
- Plan details:
  - Plan name: ${planInfo.planName} (Tier: ${planInfo.currentPlan})
  - Days Remaining: ${planInfo.daysRemaining} days (Status: ${planInfo.paymentStatus})
- Today's Workout:
  ${workoutContext ? `- Title: ${workoutContext.title} (Split: ${workoutContext.splitName})
  - Duration: ${workoutContext.durationMinutes} mins
  - Difficulty: ${workoutContext.difficulty}
  - Status: ${workoutContext.completed ? 'Completed' : 'Active'}
  - Exercises: ${workoutContext.exercises}` : '- No workout generated yet today.'}
- Today's Nutrition (DailyNutrition):
  ${nutritionContext ? `- Calories Consumed: ${nutritionContext.caloriesConsumed} / ${nutritionContext.caloriesTarget} kcal
  - Protein: ${nutritionContext.proteinConsumed} / ${nutritionContext.proteinTarget}g
  - Carbs: ${nutritionContext.carbsConsumed} / ${nutritionContext.carbsTarget}g
  - Fat: ${nutritionContext.fatConsumed} / ${nutritionContext.fatTarget}g
  - Meals Logged: ${nutritionContext.meals}` : '- No meals logged yet today (0 kcal consumed).'}
- Progress Logs:
  - Current Streak: ${user.currentStreak || 0} days
  - Total XP: ${user.currentXP || 0} XP
  - Total Workouts Completed: ${user.completedWorkoutCount || 0}
  - Historical Weight Logs: ${weightLogs}
  - Past Workout History: ${workoutHistoryList}

- Current Day: ${new Date().toDateString()}

Guidelines:
1. Address the user's questions utilizing all of the above parameters.
2. If the user asks about a meal, look at their logged meals, daily calorie limit, and fitness goal.
3. If they ask about training, look at today's workout split, their completed exercises, and experience level.
4. Keep the tone motivational, authoritative, and direct. Use bullet points where appropriate.
5. End with a one-sentence personalized coach sign-off.`;
};

/**
 * Standard AI Coach Query Endpoint (non-streaming fallback)
 */
const askAICoach = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return sendError(res, 'Question prompt is required', 400);

    const userId = req.user._id || req.user.id;
    const user = req.user;

    const userPlan = (user.currentPlan || 'basic').toLowerCase();
    if (userPlan === 'basic') {
      const today = new Date().toDateString();
      const chat = await ChatHistory.findOne({ userId });
      const todayUserQueries = chat
        ? chat.messages.filter(
            (m) => m.role === 'user' && new Date(m.timestamp).toDateString() === today
          ).length
        : 0;

      if (todayUserQueries >= 3) {
        return res.status(403).json({
          success: false,
          message: 'Daily AI Coach limit reached for Basic plan (3/3 queries). Upgrade to Premium for Unlimited AI access!',
          upgradeRequired: true,
          redirect: '/dashboard/plan'
        });
      }
    }

    const systemContextPrompt = await buildSystemContextPrompt(userId, user);
    let aiResponseText = null;

    try {
      aiResponseText = await generateAICoachResponse({ systemContextPrompt, prompt });
    } catch (openAiErr) {
      console.warn('OpenAI Call Error:', openAiErr.message);
    }

    // Fallback response builder if OpenAI key is omitted/invalid
    if (!aiResponseText) {
      aiResponseText = `Based on your profile as an ${user.activityLevel} athlete aiming to ${user.fitnessGoal}, let's make sure we hit today's targets! Keep pushing!`;
    }

    // Save Chat Message to ChatHistory in MongoDB
    let chat = await ChatHistory.findOne({ userId });
    if (!chat) {
      chat = new ChatHistory({ userId, messages: [] });
    }
    chat.messages.push({ role: 'user', content: prompt, timestamp: new Date() });
    chat.messages.push({ role: 'assistant', content: aiResponseText, timestamp: new Date() });
    await chat.save();

    return sendSuccess(res, 'AI Coach response generated via OpenAI', {
      response: aiResponseText,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AICoach Error:', error);
    return sendError(res, error.message || 'Error executing AI Coach query', 500);
  }
};

/**
 * Server-Sent Events (SSE) Streaming AI Coach Response
 */
const askAICoachStreaming = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Question prompt is required' });
    }

    const userId = req.user._id || req.user.id;
    const user = req.user;

    const userPlan = (user.currentPlan || 'basic').toLowerCase();
    if (userPlan === 'basic') {
      const today = new Date().toDateString();
      const chat = await ChatHistory.findOne({ userId });
      const todayUserQueries = chat
        ? chat.messages.filter(
            (m) => m.role === 'user' && new Date(m.timestamp).toDateString() === today
          ).length
        : 0;

      if (todayUserQueries >= 3) {
        return res.status(403).json({
          success: false,
          message: 'Daily AI Coach limit reached for Basic plan (3/3 queries). Upgrade to Premium for Unlimited AI access!',
          upgradeRequired: true
        });
      }
    }

    const systemContextPrompt = await buildSystemContextPrompt(userId, user);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const openai = require('../config/openai');
    let fullText = "";

    if (!openai) {
      // Stream mock response if OpenAI key is missing
      const mockText = `Based on your profile as an ${user.activityLevel} athlete aiming to ${user.fitnessGoal}, let's make sure we hit today's targets! Keep pushing!`;
      const words = mockText.split(' ');
      for (const word of words) {
        fullText += word + " ";
        res.write(`data: ${JSON.stringify({ text: word + " " })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 80));
      }
    } else {
      const responseStream = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: [
          { role: 'system', content: systemContextPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 600,
        stream: true
      });

      for await (const chunk of responseStream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullText += text;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

    // Save Chat Messages to ChatHistory collection in MongoDB
    let chat = await ChatHistory.findOne({ userId });
    if (!chat) {
      chat = new ChatHistory({ userId, messages: [] });
    }
    chat.messages.push({ role: 'user', content: prompt, timestamp: new Date() });
    chat.messages.push({ role: 'assistant', content: fullText, timestamp: new Date() });
    await chat.save();

  } catch (error) {
    console.error('Streaming AI error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || 'Server streaming error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Server error generating streaming response' })}\n\n`);
      res.end();
    }
  }
};

/**
 * Get User Chat History from dedicated ChatHistory collection (/api/ai/history)
 */
const getChatHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const chat = await ChatHistory.findOne({ userId });
    return sendSuccess(res, 'Chat history retrieved', { chatHistory: chat ? chat.messages : [] });
  } catch (error) {
    return sendError(res, error.message || 'Error fetching chat history', 500);
  }
};

/**
 * Clear User Chat History document from MongoDB (/api/ai/history/clear)
 */
const clearChatHistory = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await ChatHistory.findOneAndDelete({ userId });
    return sendSuccess(res, 'Chat history cleared successfully');
  } catch (error) {
    return sendError(res, error.message || 'Error clearing chat history', 500);
  }
};

/**
 * Fitbod-style OpenAI Workout Generator
 */
const generateWorkout = async (req, res) => {
  try {
    const { muscleGroup, duration, difficulty } = req.body;
    const targetGroup = muscleGroup || 'Full Body';
    const level = difficulty || 'Intermediate';

    let openAiWorkout = null;
    try {
      openAiWorkout = await generateStructuredWorkout({ muscleGroup: targetGroup, difficulty: level, duration });
    } catch (e) {
      openAiWorkout = null;
    }

    if (openAiWorkout && openAiWorkout.exercises) {
      return sendSuccess(res, 'AI Workout routine generated via OpenAI', openAiWorkout);
    }

    const sampleWorkouts = {
      'Chest & Triceps': [
        { name: 'Barbell Bench Press', sets: 4, reps: '6-8', rest: '120s', equipment: 'Barbell' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '8-10', rest: '90s', equipment: 'Dumbbells' },
        { name: 'Cable Chest Flyes', sets: 3, reps: '12-15', rest: '60s', equipment: 'Cable Machine' },
        { name: 'Triceps Rope Pushdowns', sets: 4, reps: '10-12', rest: '60s', equipment: 'Cable Machine' }
      ],
      'Back & Biceps': [
        { name: 'Deadlifts', sets: 4, reps: '5', rest: '180s', equipment: 'Barbell' },
        { name: 'Lat Pulldowns', sets: 4, reps: '8-10', rest: '90s', equipment: 'Cable' },
        { name: 'Seated Cable Rows', sets: 3, reps: '10-12', rest: '60s', equipment: 'Cable' },
        { name: 'Barbell Bicep Curls', sets: 3, reps: '10-12', rest: '60s', equipment: 'Barbell' }
      ],
      'Legs & Abs': [
        { name: 'Barbell Back Squats', sets: 4, reps: '6-8', rest: '150s', equipment: 'Barbell' },
        { name: 'Romanian Deadlifts', sets: 3, reps: '8-10', rest: '90s', equipment: 'Barbell' },
        { name: 'Leg Press', sets: 3, reps: '10-12', rest: '90s', equipment: 'Machine' },
        { name: 'Hanging Leg Raises', sets: 3, reps: '15', rest: '45s', equipment: 'Pull-up Bar' }
      ]
    };

    const exercises = sampleWorkouts[targetGroup] || sampleWorkouts['Chest & Triceps'];

    return sendSuccess(res, 'AI Workout routine generated', {
      title: `AI Hypertrophy Split: ${targetGroup} (${level})`,
      targetGroup,
      difficulty: level,
      estimatedDurationMinutes: Number(duration) || 45,
      estimatedCaloriesBurned: 380,
      exercises
    });
  } catch (error) {
    return sendError(res, error.message || 'Error generating workout plan', 500);
  }
};

module.exports = {
  askAICoach,
  askAICoachStreaming,
  getChatHistory,
  clearChatHistory,
  generateWorkout
};
