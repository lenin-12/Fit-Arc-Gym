const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  muscle: {
    type: String,
    default: ''
  },
  sets: {
    type: Number,
    default: 3
  },
  reps: {
    type: String,
    default: '10'
  },
  rest: {
    type: String,
    default: '60 sec'
  },
  instructions: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  img: {
    type: String,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  }
});

const workoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    title: {
      type: String,
      required: true
    },
    splitName: {
      type: String,
      default: ''
    },
    difficulty: {
      type: String,
      default: 'Intermediate'
    },
    durationMinutes: {
      type: Number,
      default: 45
    },
    caloriesBurned: {
      type: Number,
      default: 350
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    exercises: [exerciseSchema],
    // Frontend compatibility virtual/real fields
    simpleTitle: {
      type: String,
      default: ''
    },
    programDay: {
      type: String,
      default: ''
    },
    overallDifficulty: {
      type: String,
      default: ''
    },
    warmup: {
      type: String,
      default: ''
    },
    cooldown: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Workout', workoutSchema);
