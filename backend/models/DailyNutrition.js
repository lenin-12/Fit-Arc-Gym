const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  mealName: {
    type: String,
    required: true
  },
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    default: 'Snack'
  },
  calories: {
    type: Number,
    required: true,
    default: 0
  },
  protein: {
    type: Number,
    required: true,
    default: 0
  },
  carbs: {
    type: Number,
    required: true,
    default: 0
  },
  fat: {
    type: Number,
    required: true,
    default: 0
  },
  fats: {
    type: Number,
    required: true,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const dailyNutritionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    caloriesTarget: {
      type: Number,
      required: true,
      default: 2200
    },
    proteinTarget: {
      type: Number,
      required: true,
      default: 140
    },
    carbsTarget: {
      type: Number,
      required: true,
      default: 250
    },
    fatTarget: {
      type: Number,
      required: true,
      default: 60
    },
    caloriesConsumed: {
      type: Number,
      required: true,
      default: 0
    },
    proteinConsumed: {
      type: Number,
      required: true,
      default: 0
    },
    carbsConsumed: {
      type: Number,
      required: true,
      default: 0
    },
    fatConsumed: {
      type: Number,
      required: true,
      default: 0
    },
    meals: [mealSchema]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DailyNutrition', dailyNutritionSchema);
