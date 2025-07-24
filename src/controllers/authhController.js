const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { username, email, password, name, role } = req.body;

  // Check if user exists
  const userExists = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists',
    });
  }

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    name,
    role,
  });

  // Generate token
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { username, password } = req.body;

  // Check for user (by username or email)
  const user = await User.findOne({
    $or: [{ username }, { email: username }],
  }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  // Generate token
  const token = generateToken(user._id);

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      bio: user.bio,
      notificationPrefs: user.notificationPrefs,
    },
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      bio: user.bio,
      skills: user.skills,
      location: user.location,
      website: user.website,
      notificationPrefs: user.notificationPrefs,
      reputation: user.reputation,
      threadsFollowed: user.threadsFollowed,
      wishlist: user.wishlist,
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    bio: req.body.bio,
    skills: req.body.skills,
    location: req.body.location,
    website: req.body.website,
    notificationPrefs: req.body.notificationPrefs,
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      bio: user.bio,
      skills: user.skills,
      location: user.location,
      website: user.website,
      notificationPrefs: user.notificationPrefs,
    },
  });
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect',
    });
  }

  user.password = req.body.newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};