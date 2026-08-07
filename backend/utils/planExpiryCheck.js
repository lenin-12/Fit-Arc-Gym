const mockUsersStore = require('../services/mockDbStore');

const checkAndResetExpiredPlan = async (user) => {
  if (user && user.currentPlan !== 'basic' && user.planExpiryDate) {
    const expiryDate = new Date(user.planExpiryDate);
    if (new Date() > expiryDate) {
      user.currentPlan = 'basic';
      user.plan = 'Basic Plan';
      user.paymentStatus = 'free';
      user.planStartDate = null;
      user.planExpiryDate = null;
      
      if (user.save && typeof user.save === 'function') {
        await user.save();
      } else {
        mockUsersStore[user._id || user.id] = user;
        if (user.email) {
          mockUsersStore[user.email.toLowerCase().trim()] = user;
        }
      }
    }
  }
  return user;
};

module.exports = checkAndResetExpiredPlan;
