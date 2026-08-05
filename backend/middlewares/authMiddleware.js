const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const { sendError } = require('../utils/apiResponse');

// In-memory user database store fallback if MongoDB is offline or in local dev mode
const mockUsersStore = require('../services/mockDbStore');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = verifyToken(token);

      // Attempt Mongo search first
      try {
        req.user = await User.findById(decoded.id).select('-password');
      } catch (err) {
        req.user = null;
      }

      // Fallback to mock store if mongo not populated/available
      if (!req.user && mockUsersStore[decoded.id]) {
        req.user = mockUsersStore[decoded.id];
      }

      if (!req.user) {
        return sendError(res, 'User no longer exists', 401);
      }

      next();
    } catch (error) {
      return sendError(res, 'Not authorized, token invalid or expired', 401);
    }
  } else {
    return sendError(res, 'Not authorized, no token provided', 401);
  }
};

module.exports = { protect };
