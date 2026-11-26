const dotenv = require('dotenv');
dotenv.config(); 


if (process.env.NODE_ENV === 'production') {
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  if (!process.env.CORS_ORIGIN) missing.push('CORS_ORIGIN');
  if (missing.length > 0) {
    console.error(
      `[Startup Error] Missing required environment variable(s): ${missing.join(', ')}`
    );
    console.error('Set them in your hosting dashboard / .env and redeploy. Exiting.');
    process.exit(1);
  }
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { auditUsersPlan } = require('./utils/auditUsersPlan');

const app = express();

// Trust reverse proxy (Nginx) headers for client IP and protocol determination
app.set('trust proxy', 1);

// Never let the background audit crash the process
const runAudit = () => {
  Promise.resolve()
    .then(() => auditUsersPlan())
    .catch((err) => console.error('[auditUsersPlan] failed:', err.message));
};

if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_AUTO_CONNECT !== 'true') {
  connectDB()
    .then(runAudit)
    .catch((err) => {
      console.error('[connectDB] failed:', err.message);
      runAudit();
    });
}

if (process.env.CORS_ORIGIN) {
  const allowedOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        const err = new Error('Not allowed by CORS');
        err.statusCode = 403;
        return callback(err);
      },
      credentials: true
    })
  );
} else {
  app.use(cors());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const aiRoutes = require('./routes/aiRoutes');
const planRoutes = require('./routes/planRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const walletRoutes = require('./routes/walletRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/workout', workoutRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api', planRoutes);
app.use('/api', walletRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FIT-ARC-GYM API Server operational 🚀' });
});

app.get('/api/health/db', (req, res) => {
  const readyState = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const stateString = stateMap[readyState] || 'unknown';

  if (readyState === 1) {
    return res.status(200).json({ status: 'OK', database: stateString, readyState });
  }
  return res.status(503).json({ status: 'UNAVAILABLE', database: stateString, readyState });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;