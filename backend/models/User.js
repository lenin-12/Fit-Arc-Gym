const mongoose = require('mongoose');

const workoutHistorySchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String },
  durationMinutes: { type: Number },
  caloriesBurned: { type: Number },
  date: { type: Date, default: Date.now }
});

const dietHistorySchema = new mongoose.Schema({
  mealName: { type: String, required: true },
  mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], default: 'Snack' },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fats: { type: Number, default: 0 },
  isLogged: { type: Boolean, default: true },
  date: { type: Date, default: Date.now }
});

const weightHistorySchema = new mongoose.Schema({
  weight: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male'
    },
    age: {
      type: Number,
      default: 25
    },
    height: {
      type: Number, // in cm
      default: 175
    },
    weight: {
      type: Number, // in kg
      default: 70
    },
    fitnessGoal: {
      type: String,
      enum: ['Lose Weight', 'Gain Muscle', 'Body Recomposition', 'Maintain Fitness', 'Improve Endurance'],
      default: 'Gain Muscle'
    },
    activityLevel: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Intermediate'
    },
    currentPlan: {
      type: String,
      enum: ['basic', 'premium', 'pro_ai_vip'],
      default: 'basic'
    },
    plan: {
      type: String,
      default: 'Basic Plan'
    },
    planDuration: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['free', 'active', 'pending', 'failed', 'expired'],
      default: 'free'
    },
    lastPaymentDate: {
      type: Date,
      default: null
    },
    planStartDate: {
      type: Date,
      default: null
    },
    planExpiryDate: {
      type: Date,
      default: null
    },

    dailyTargets: {
      calories: { type: Number, default: 2200 },
      protein: { type: Number, default: 140 },
      carbs: { type: Number, default: 250 },
      fats: { type: Number, default: 60 }
    },
    dietPreference: {
      type: String,
      enum: ['Veg', 'Non-Veg', 'Vegan'],
      default: 'Non-Veg'
    },
    profilePicture: {
      type: String,
      default: ''
    },
    workoutHistory: [workoutHistorySchema],
    dietHistory: [dietHistorySchema],
    weightHistory: [weightHistorySchema],
    chatHistory: [chatMessageSchema],
    waterIntake: {
      type: Number,
      default: 4
    },
    sleepHours: {
      type: Number,
      default: 7.5
    },
    currentStreak: {
      type: Number,
      default: 7
    },
    currentXP: {
      type: Number,
      default: 850
    },
    healthScore: {
      type: Number,
      default: 94
    },
    dailySteps: {
      type: Number,
      default: 7420
    },
    completedWorkoutCount: {
      type: Number,
      default: 14
    },
    achievements: {
      type: [String],
      default: ['First Workout Completed', '7-Day Streak', 'Hydration Hero', 'Goal Setter']
    },
    resetPasswordOTP: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordOTP;
  delete obj.resetPasswordExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
