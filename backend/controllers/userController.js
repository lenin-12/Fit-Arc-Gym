const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/hashPassword');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const mockUsersStore = require('../services/mockDbStore');
const { calculateMacroTargets } = require('../utils/macroCalculator');
const { calculateTodayNutrition } = require('../services/nutritionService');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

/**
 * Update Profile Biometrics & Settings
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, mobile, age, height, weight, gender, fitnessGoal, activityLevel, waterIntake, sleepHours, dietPreference } = req.body;

    // Calculate new macro targets from updated profile
    const mergedProfile = {
      weight: weight !== undefined ? Number(weight) : req.user.weight,
      height: height !== undefined ? Number(height) : req.user.height,
      age: age !== undefined ? Number(age) : req.user.age,
      gender: gender || req.user.gender,
      fitnessGoal: fitnessGoal || req.user.fitnessGoal,
      activityLevel: activityLevel || req.user.activityLevel
    };
    const dailyTargets = calculateMacroTargets(mergedProfile);

    // Sync macro targets to NutritionTarget database collection
    try {
      const NutritionTarget = require('../models/NutritionTarget');
      await NutritionTarget.findOneAndUpdate(
        { userId },
        {
          calories: dailyTargets.calories,
          protein: dailyTargets.protein,
          carbs: dailyTargets.carbs,
          fat: dailyTargets.fats || dailyTargets.fat || 60
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn('Error syncing profile targets to NutritionTarget:', e.message);
    }

    let updatedUser = null;
    try {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            dailyTargets,
            ...(name && { name }),
            ...(mobile && { mobile }),
            ...(age && { age: Number(age) }),
            ...(height && { height: Number(height) }),
            ...(weight && { weight: Number(weight) }),
            ...(gender && { gender }),
            ...(fitnessGoal && { fitnessGoal }),
            ...(activityLevel && { activityLevel }),
            ...(dietPreference && { dietPreference }),
            ...(waterIntake !== undefined && { waterIntake: Number(waterIntake) }),
            ...(sleepHours !== undefined && { sleepHours: Number(sleepHours) })
          }
        },
        { new: true, runValidators: true }
      ).select('-password');

      if (updatedUser && weight) {
        updatedUser.weightHistory = updatedUser.weightHistory || [];
        updatedUser.weightHistory.unshift({ weight: Number(weight), date: new Date() });
        await updatedUser.save();
      }
    } catch (e) {
      updatedUser = null;
    }

    if (!updatedUser && mockUsersStore[userId]) {
      const u = mockUsersStore[userId];
      u.dailyTargets = dailyTargets;
      if (name) u.name = name;
      if (mobile) u.mobile = mobile;
      if (age) u.age = Number(age);
      if (height) u.height = Number(height);
      if (weight) u.weight = Number(weight);
      if (gender) u.gender = gender;
      if (fitnessGoal) u.fitnessGoal = fitnessGoal;
      if (activityLevel) u.activityLevel = activityLevel;
      if (dietPreference) u.dietPreference = dietPreference;
      if (waterIntake !== undefined) u.waterIntake = Number(waterIntake);
      if (sleepHours !== undefined) u.sleepHours = Number(sleepHours);
      updatedUser = u;
    }

    const payload = typeof updatedUser.toJSON === 'function' ? updatedUser.toJSON() : { ...updatedUser };
    delete payload.password;
    delete payload.hashedPassword;

    return sendSuccess(res, 'Profile updated successfully!', { user: payload });
  } catch (error) {
    return sendError(res, error.message || 'Server error updating profile', 500);
  }
};

/**
 * Increment Water Intake (+1 Glass)
 */
const incrementWater = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let newWater = (req.user.waterIntake || 4) + 1;
    if (newWater > 12) newWater = 12;

    let user = null;
    try {
      user = await User.findByIdAndUpdate(userId, { waterIntake: newWater }, { new: true }).select('-password');
    } catch (e) {
      user = null;
    }

    if (!user && mockUsersStore[userId]) {
      mockUsersStore[userId].waterIntake = newWater;
      user = mockUsersStore[userId];
    }

    const payload = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete payload.password;

    return sendSuccess(res, 'Water intake updated! +1 Glass 💧', { user: payload });
  } catch (error) {
    return sendError(res, error.message || 'Error updating water intake', 500);
  }
};

/**
 * Toggle Veg / Non-Veg Diet Preference
 */
const toggleDietPreference = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const currentPref = req.user.dietPreference || 'Non-Veg';
    const newPref = currentPref === 'Veg' ? 'Non-Veg' : 'Veg';

    let user = null;
    try {
      user = await User.findByIdAndUpdate(userId, { dietPreference: newPref }, { new: true }).select('-password');
    } catch (e) {
      user = null;
    }

    if (!user && mockUsersStore[userId]) {
      mockUsersStore[userId].dietPreference = newPref;
      user = mockUsersStore[userId];
    }

    const payload = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete payload.password;

    return sendSuccess(res, `Diet preference switched to ${newPref}`, { user: payload });
  } catch (error) {
    return sendError(res, error.message || 'Error toggling diet preference', 500);
  }
};

/**
 * Log Completed Workout
 */
const logWorkout = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title, category, durationMinutes, caloriesBurned } = req.body;

    if (!title) return sendError(res, 'Workout title is required', 400);

    const workoutEntry = {
      title,
      category: category || 'Strength',
      durationMinutes: Number(durationMinutes) || 45,
      caloriesBurned: Number(caloriesBurned) || 380,
      date: new Date()
    };

    let user = null;
    try {
      user = await User.findById(userId);
    } catch (e) {
      user = null;
    }

    if (user) {
      user.workoutHistory.unshift(workoutEntry);
      user.completedWorkoutCount = (user.completedWorkoutCount || 14) + 1;
      user.currentXP = (user.currentXP || 850) + 50;
      await user.save();
    } else if (mockUsersStore[userId]) {
      user = mockUsersStore[userId];
      user.workoutHistory = user.workoutHistory || [];
      user.workoutHistory.unshift(workoutEntry);
      user.completedWorkoutCount = (user.completedWorkoutCount || 14) + 1;
      user.currentXP = (user.currentXP || 850) + 50;
    }

    return sendSuccess(res, 'Workout completed & saved to database! +50 XP 🔥', {
      workout: workoutEntry,
      newCompletedCount: user ? user.completedWorkoutCount : 15,
      newXP: user ? user.currentXP : 900
    });
  } catch (error) {
    return sendError(res, error.message || 'Error logging workout', 500);
  }
};

/**
 * Log Meal Entry
 */
const logMeal = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { mealName, mealType, calories, protein, carbs, fats } = req.body;

    if (!mealName) return sendError(res, 'Meal name is required', 400);

    const mealEntry = {
      mealName,
      mealType: mealType || 'Snack',
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      date: new Date()
    };

    let user = null;
    try {
      user = await User.findById(userId);
    } catch (e) {
      user = null;
    }

    if (user) {
      user.dietHistory.unshift(mealEntry);
      await user.save();
    } else if (mockUsersStore[userId]) {
      user = mockUsersStore[userId];
      user.dietHistory = user.dietHistory || [];
      user.dietHistory.unshift(mealEntry);
    }

    const payload = user && typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete payload?.password;

    return sendSuccess(res, 'Meal logged successfully!', { user: payload, meal: mealEntry });
  } catch (error) {
    return sendError(res, error.message || 'Error logging meal', 500);
  }
};

/**
 * Update/Replace Daily Diet History
 */
const updateDietDay = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { dietEntries } = req.body;

    if (!Array.isArray(dietEntries)) {
      return sendError(res, 'dietEntries array is required', 400);
    }

    const formattedEntries = dietEntries.map((m) => ({
      mealName: m.mealName || m.name || 'Meal',
      mealType: m.mealType || 'Snack',
      calories: Number(m.calories || m.cals) || 0,
      protein: Number(m.protein) || 0,
      carbs: Number(m.carbs) || 0,
      fats: Number(m.fats || m.fat) || 0,
      isLogged: m.isLogged !== undefined ? Boolean(m.isLogged) : true,
      date: m.date ? new Date(m.date) : new Date()
    }));

    let user = null;
    try {
      user = await User.findById(userId);
    } catch (e) {
      user = null;
    }

    if (user) {
      // Remove today's existing entries and replace with updated set
      const today = new Date();
      user.dietHistory = user.dietHistory.filter((m) => {
        if (!m.date) return false;
        const mDate = new Date(m.date);
        return !(
          mDate.getDate() === today.getDate() &&
          mDate.getMonth() === today.getMonth() &&
          mDate.getFullYear() === today.getFullYear()
        );
      });
      user.dietHistory.unshift(...formattedEntries);
      await user.save();
    } else if (mockUsersStore[userId]) {
      user = mockUsersStore[userId];
      user.dietHistory = user.dietHistory || [];
      const today = new Date();
      user.dietHistory = user.dietHistory.filter((m) => {
        if (!m.date) return false;
        const mDate = new Date(m.date);
        return !(
          mDate.getDate() === today.getDate() &&
          mDate.getMonth() === today.getMonth() &&
          mDate.getFullYear() === today.getFullYear()
        );
      });
      user.dietHistory.unshift(...formattedEntries);
    }

    const payload = user && typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete payload?.password;

    return sendSuccess(res, 'Diet updated successfully!', { user: payload });
  } catch (error) {
    return sendError(res, error.message || 'Error updating diet', 500);
  }
};

/**
 * Upload Avatar
 */
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 'No image file uploaded', 400);

    const userId = req.user._id || req.user.id;
    let imagePath = `/uploads/${req.file.filename}`;

    // Upload to Cloudinary if credentials are provided in .env
    const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

    if (hasCloudinary) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'fit-arc-gym/avatars',
          use_filename: true,
          unique_filename: true
        });
        imagePath = result.secure_url;

        // Delete the temporary local file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (uploadErr) {
        console.error('Cloudinary upload error:', uploadErr);
        if (process.env.NODE_ENV === 'production') {
          // Clean up local file even on failure
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return sendError(res, 'Failed to upload profile picture to cloud storage.', 500);
        }
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        // Enforce Cloudinary in production - do not allow local disk fallback
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, 'Cloud storage is not configured. Profile picture upload is disabled in production.', 500);
      }
    }

    let user = null;
    try {
      user = await User.findByIdAndUpdate(userId, { profilePicture: imagePath }, { new: true }).select('-password');
    } catch (e) {
      user = null;
    }

    if (!user && mockUsersStore[userId]) {
      mockUsersStore[userId].profilePicture = imagePath;
      user = mockUsersStore[userId];
    }

    const userPayload = user ? (typeof user.toJSON === 'function' ? user.toJSON() : { ...user }) : null;
    if (userPayload) {
      delete userPayload.password;
      delete userPayload.hashedPassword;
    }

    return sendSuccess(res, 'Profile picture uploaded successfully!', {
      profilePicture: imagePath,
      user: userPayload
    });
  } catch (error) {
    return sendError(res, error.message || 'Error uploading profile picture', 500);
  }
};

/**
 * Change Password
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return sendError(res, 'Old and new password are required', 400);
    if (newPassword.length < 6) return sendError(res, 'New password must be at least 6 characters', 400);

    const userId = req.user._id || req.user.id;
    let user = null;

    try {
      user = await User.findById(userId);
    } catch (e) {
      user = mockUsersStore[userId];
    }

    const storedHash = user?.password || user?.hashedPassword;
    if (storedHash) {
      const match = await comparePassword(oldPassword, storedHash);
      if (!match) return sendError(res, 'Incorrect current password', 400);
    }

    const newHash = await hashPassword(newPassword);

    if (user && typeof user.save === 'function') {
      user.password = newHash;
      await user.save();
    } else if (mockUsersStore[userId]) {
      mockUsersStore[userId].hashedPassword = newHash;
    }

    return sendSuccess(res, 'Password changed successfully!');
  } catch (error) {
    return sendError(res, error.message || 'Error changing password', 500);
  }
};

/**
 * Delete Account
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    try {
      await User.findByIdAndDelete(userId);
    } catch (e) {}
    delete mockUsersStore[userId];

    return sendSuccess(res, 'Account permanently deleted.');
  } catch (error) {
    return sendError(res, error.message || 'Error deleting account', 500);
  }
};

/**
 * GET Today's Nutrition Summary (recalculated fresh from MongoDB source of truth)
 */
const getTodayNutrition = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let user = null;
    try {
      user = await User.findById(userId).select('-password');
    } catch (e) {
      user = null;
    }
    if (!user && mockUsersStore[userId]) {
      user = mockUsersStore[userId];
    }

    const summary = calculateTodayNutrition(user || {});
    return sendSuccess(res, "Today's nutrition summary calculated from single source of truth", summary);
  } catch (error) {
    return sendError(res, error.message || "Error fetching today's nutrition", 500);
  }
};

/**
 * RESET Diet Data (Clear old test/demo meal logs)
 */
const resetDietData = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    let user = null;
    try {
      user = await User.findById(userId);
    } catch (e) {
      user = null;
    }

    if (user) {
      user.dietHistory = [];
      await user.save();
    } else if (mockUsersStore[userId]) {
      mockUsersStore[userId].dietHistory = [];
      user = mockUsersStore[userId];
    }

    const summary = calculateTodayNutrition(user || {});
    const payload = user && typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
    delete payload?.password;
    payload.todayNutrition = summary;

    return sendSuccess(res, 'Diet logs cleared. Starting with clean 0 state!', { user: payload, todayNutrition: summary });
  } catch (error) {
    return sendError(res, error.message || 'Error resetting diet logs', 500);
  }
};

module.exports = {
  updateProfile,
  incrementWater,
  toggleDietPreference,
  logWorkout,
  logMeal,
  updateDietDay,
  uploadProfilePicture,
  changePassword,
  deleteAccount,
  getTodayNutrition,
  resetDietData
};
