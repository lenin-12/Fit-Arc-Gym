const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { validateLogin, validateRegisterStep1, validateEmail } = require('../validators/authValidator');
const mockUsersStore = require('../services/mockDbStore');
const checkAndResetExpiredPlan = require('../utils/planExpiryCheck');
const { calculateMacroTargets } = require('../utils/macroCalculator');
const { calculateTodayNutrition } = require('../services/nutritionService');

// Helper to seed initial sample profile if store is fresh
const createDefaultUserData = (override = {}) => {
  return {
    _id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: override.name || 'Alex Morgan',
    email: override.email ? override.email.toLowerCase() : 'user@fitarcgym.com',
    mobile: override.mobile || '+1 987 654 3210',
    firstSchoolName: override.firstSchoolName || 'Fit Arc Academy',
    gender: override.gender || 'Male',
    age: Number(override.age) || 26,
    height: Number(override.height) || 180,
    weight: Number(override.weight) || 75,
    fitnessGoal: override.fitnessGoal || 'Gain Muscle',
    activityLevel: override.activityLevel || 'Intermediate',
    currentPlan: 'basic',
    plan: 'Basic Plan',
    paymentStatus: 'free',
    profilePicture: override.profilePicture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    waterIntake: 2.8,
    sleepHours: 7.5,
    currentStreak: 7,
    currentXP: 850,
    healthScore: 94,
    achievements: ['First Workout Completed', '7-Day Streak', 'Hydration Master', 'Peak Performer'],
    workoutHistory: [
      { id: 'w1', title: 'Chest & Triceps Hypertrophy', category: 'Strength', durationMinutes: 45, caloriesBurned: 380, date: new Date() },
      { id: 'w2', title: 'HIIT Cardio Blast', category: 'Cardio', durationMinutes: 30, caloriesBurned: 420, date: new Date(Date.now() - 86400000) }
    ],
    dietHistory: [],
    workoutProgress: [
      { date: 'Mon', workoutCount: 1, calories: 420, duration: 45 },
      { date: 'Tue', workoutCount: 1, calories: 380, duration: 40 },
      { date: 'Wed', workoutCount: 0, calories: 0, duration: 0 },
      { date: 'Thu', workoutCount: 2, calories: 610, duration: 60 },
      { date: 'Fri', workoutCount: 1, calories: 490, duration: 50 },
      { date: 'Sat', workoutCount: 1, calories: 520, duration: 55 },
      { date: 'Sun', workoutCount: 1, calories: 400, duration: 45 }
    ],
    planStartDate: null,
    planExpiryDate: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

/**
 * REGISTER USER (2-Step complete handler)
 */
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      confirmPassword,
      firstSchoolName,
      gender,
      age,
      height,
      weight,
      fitnessGoal,
      activityLevel
    } = req.body;

    // Validate Step 1
    const validation = validateRegisterStep1({ name, email, mobile, password, confirmPassword, firstSchoolName });
    if (!validation.isValid) {
      return sendError(res, validation.errors.join(', '), 400, validation.errors);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user in Mongo or mock store
    let existingUser = null;
    try {
      existingUser = await User.findOne({ email: normalizedEmail });
    } catch (e) {
      existingUser = Object.values(mockUsersStore).find(u => u.email === normalizedEmail);
    }

    if (existingUser) {
      return sendError(res, 'An account with this email address already exists', 400);
    }

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(password);

    const calculatedTargets = calculateMacroTargets({
      weight: Number(weight) || 70,
      height: Number(height) || 175,
      age: Number(age) || 25,
      gender: gender || 'Male',
      fitnessGoal: fitnessGoal || 'Gain Muscle',
      activityLevel: activityLevel || 'Intermediate'
    });

    // Save to Mongo if available
    let newUser;
    try {
      newUser = await User.create({
        name,
        email: normalizedEmail,
        mobile,
        password: hashedPassword,
        firstSchoolName,
        gender: gender || 'Male',
        age: Number(age) || 0,
        height: Number(height) || 0,
        weight: Number(weight) || 0,
        fitnessGoal: fitnessGoal || 'Gain Muscle',
        activityLevel: activityLevel || 'Intermediate',
        dailyTargets: calculatedTargets,
        currentPlan: 'basic',
        plan: 'Basic Plan',
        paymentStatus: 'free',
        waterIntake: 0,
        sleepHours: 0,
        currentStreak: 0,
        currentXP: 0,
        healthScore: 0,
        completedWorkoutCount: 0,
        workoutHistory: [],
        dietHistory: [],
        planStartDate: null,
        planExpiryDate: null
      });
    } catch (dbErr) {
      // Fallback to mock store if database connection is offline
      const mockObj = createDefaultUserData({
        name,
        email: normalizedEmail,
        mobile,
        firstSchoolName,
        gender,
        age,
        height,
        weight,
        fitnessGoal,
        activityLevel
      });
      mockObj.dailyTargets = calculatedTargets;
      mockObj.waterIntake = 0;
      mockObj.currentStreak = 0;
      mockObj.currentXP = 0;
      mockObj.workoutHistory = [];
      mockObj.dietHistory = [];
      mockObj.currentPlan = 'basic';
      mockObj.plan = 'Basic Plan';
      mockObj.paymentStatus = 'free';
      mockObj.planStartDate = null;
      mockObj.planExpiryDate = null;
      mockObj.hashedPassword = hashedPassword;
      mockUsersStore[mockObj._id] = mockObj;
      mockUsersStore[normalizedEmail] = mockObj;
      newUser = mockObj;
    }


    const token = generateToken(newUser._id || newUser.id);

    return sendSuccess(
      res,
      'User registered successfully! Welcome to FIT-ARC-GYM.',
      {
        token,
        user: typeof newUser.toJSON === 'function' ? newUser.toJSON() : newUser
      },
      201
    );
  } catch (error) {
    console.error('Registration Error:', error);
    return sendError(res, error.message || 'Server error during registration', 500);
  }
};

// Seed default demo user in mockUsersStore for offline/testing mode
(async () => {
  try {
    const demoHashed = await hashPassword('password123');
    const defaultUser = createDefaultUserData({ email: 'user@fitarcgym.com', name: 'Alex Morgan' });
    defaultUser.hashedPassword = demoHashed;
    mockUsersStore[defaultUser._id] = defaultUser;
    mockUsersStore['user@fitarcgym.com'] = defaultUser;
  } catch (e) {
    console.error('Failed to seed demo user', e);
  }
})();

/**
 * LOGIN USER
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const validation = validateLogin({ email, password });
    if (!validation.isValid) {
      return sendError(res, validation.errors.join(', '), 400, validation.errors);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    try {
      user = await User.findOne({ email: normalizedEmail });
    } catch (e) {
      user = null;
    }

    if (!user) {
      // Check in-memory mock store
      user = mockUsersStore[normalizedEmail] || Object.values(mockUsersStore).find(u => u.email === normalizedEmail);
    }

    // Unregistered users are NOT allowed to log in automatically
    if (!user) {
      return sendError(res, 'Account not found. Please create an account.', 404);
    }

    // Verify Password with bcrypt
    const storedHash = user.password || user.hashedPassword;
    if (storedHash) {
      const isMatch = await comparePassword(password, storedHash);
      if (!isMatch) {
        return sendError(res, 'Invalid password. Please check your credentials.', 401);
      }
    }

    // Automatically check and reset plan if expired
    await checkAndResetExpiredPlan(user);

    const token = generateToken(user._id || user.id);
    const userPayload = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete userPayload.password;
    delete userPayload.hashedPassword;

    return sendSuccess(res, 'Login successful!', {
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Login Error:', error);
    return sendError(res, error.message || 'Server error during login', 500);
  }
};

/**
 * FORGOT PASSWORD - Generate OTP
 */
/**
 * FORGOT PASSWORD - Verify Security Question & Reset Password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email, firstSchoolName, newPassword } = req.body;
    if (!email) return sendError(res, 'Email address is required', 400);
    if (!firstSchoolName) return sendError(res, 'First school name is required', 400);
    if (!newPassword) return sendError(res, 'New password is required', 400);

    if (newPassword.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!validateEmail(normalizedEmail)) {
      return sendError(res, 'Valid email address is required', 400);
    }

    let user = null;
    try {
      user = await User.findOne({ email: normalizedEmail });
    } catch (e) {
      user = null;
    }

    if (!user) {
      // Check in-memory mock store
      user = mockUsersStore[normalizedEmail] || Object.values(mockUsersStore).find(u => u.email === normalizedEmail);
    }

    if (!user) {
      return sendError(res, 'Account not found. Please check the email address or register.', 404);
    }

    // Verify security question (case insensitive trim comparison)
    const dbSchool = (user.firstSchoolName || '').trim().toLowerCase();
    const inputSchool = firstSchoolName.trim().toLowerCase();

    if (!dbSchool || dbSchool !== inputSchool) {
      return sendError(res, 'Incorrect answer to the security question.', 400);
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Save the new password
    if (user.save && typeof user.save === 'function') {
      user.password = hashedPassword;
      user.resetPasswordOTP = null;
      user.resetPasswordExpires = null;
      await user.save();
    } else {
      user.hashedPassword = hashedPassword;
      user.resetPasswordOTP = null;
      user.resetPasswordExpires = null;
      mockUsersStore[normalizedEmail] = user;
    }

    return sendSuccess(res, 'Password reset successful! You can now log in with your new password.');
  } catch (error) {
    return sendError(res, error.message || 'Server error resetting password', 500);
  }
};

/**
 * GET CURRENT USER SESSION (/api/auth/me)
 */
const getMe = async (req, res) => {
  try {
    const userPayload = typeof req.user.toJSON === 'function' ? req.user.toJSON() : { ...req.user };
    delete userPayload.password;
    delete userPayload.hashedPassword;

    return sendSuccess(res, 'Authenticated user profile retrieved', { user: userPayload });
  } catch (error) {
    return sendError(res, error.message || 'Error fetching user session', 500);
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  getMe
};
