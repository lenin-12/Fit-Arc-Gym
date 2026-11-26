const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const { generateToken } = require('../../utils/jwt');

let counter = 0;


async function createUser(overrides = {}) {
  counter += 1;
  const user = await User.create({
    name: `Test User ${counter}`,
    email: `user${counter}_${Date.now()}@test.com`,
    mobile: '9876543210',
    password: await bcrypt.hash('password123', 4),
    firstSchoolName: 'Test School',
    role: 'user',
    walletBalance: 15000,
    currentPlan: 'basic',
    plan: 'Basic Plan',
    paymentStatus: 'free',
    planStartDate: null,
    planExpiryDate: null,
    ...overrides
  });
  return { user, token: generateToken(user._id.toString()) };
}

const createAdmin = (overrides = {}) => createUser({ role: 'admin', ...overrides });

const newKey = () => `KEY_${crypto.randomUUID()}`;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { createUser, createAdmin, newKey, auth };