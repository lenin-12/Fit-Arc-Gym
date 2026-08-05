const mongoose = require('mongoose');

const nutritionTargetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    calories: {
      type: Number,
      required: true,
      default: 2200
    },
    protein: {
      type: Number,
      required: true,
      default: 140
    },
    carbs: {
      type: Number,
      required: true,
      default: 250
    },
    fat: {
      type: Number,
      required: true,
      default: 60
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('NutritionTarget', nutritionTargetSchema);
