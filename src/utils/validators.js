const validator = require('validator');

// Validate email
const isValidEmail = (email) => {
  return validator.isEmail(email);
};

// Validate URL
const isValidURL = (url) => {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
  });
};

// Validate password strength
const isStrongPassword = (password) => {
  return validator.isStrongPassword(password, {
    minLength: 6,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0,
  });
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return validator.isMongoId(id);
};

// Validate username
const isValidUsername = (username) => {
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
};

// Validate file type
const isValidFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

// Validate file size
const isValidFileSize = (size, maxSize) => {
  return size <= maxSize;
};

// Sanitize input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return validator.escape(input.trim());
};

// Validate hex color
const isValidHexColor = (color) => {
  return /^#[0-9A-F]{6}$/i.test(color);
};

// Validate date
const isValidDate = (date) => {
  return validator.isISO8601(date);
};

// Validate phone number
const isValidPhoneNumber = (phone) => {
  return validator.isMobilePhone(phone, 'any');
};

module.exports = {
  isValidEmail,
  isValidURL,
  isStrongPassword,
  isValidObjectId,
  isValidUsername,
  isValidFileType,
  isValidFileSize,
  sanitizeInput,
  isValidHexColor,
  isValidDate,
  isValidPhoneNumber,
};