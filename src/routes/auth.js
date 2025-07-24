const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
} = require('../middleware/validation');

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;