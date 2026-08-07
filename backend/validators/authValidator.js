const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

const validatePassword = (password) => {
  // At least 6 chars
  return typeof password === 'string' && password.length >= 6;
};

const validateRegisterStep1 = ({ name, email, mobile, password, confirmPassword, firstSchoolName }) => {
  const errors = [];

  if (!name || name.trim() === '') errors.push('Full Name is required');
  if (!email || !validateEmail(email)) errors.push('Valid Email Address is required');
  if (!mobile || mobile.trim().length < 7) errors.push('Valid Mobile Number is required');
  if (!firstSchoolName || firstSchoolName.trim() === '') errors.push('First school name is required');
  if (!password || !validatePassword(password)) errors.push('Password must be at least 6 characters');
  if (password !== confirmPassword) errors.push('Passwords do not match');

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateLogin = ({ email, password }) => {
  const errors = [];
  if (!email || !validateEmail(email)) errors.push('Valid Email Address is required');
  if (!password) errors.push('Password is required');

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateRegisterStep1,
  validateLogin
};
