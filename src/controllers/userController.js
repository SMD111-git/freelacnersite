const User = require('../models/User');
const Thread = require('../models/Thread');
const Comment = require('../models/Comment');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  const query = { isActive: true };
  
  // Filter by role
  if (req.query.role) {
    query.role = req.query.role;
  }

  // Search by name or username
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { username: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ reputation: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip(startIndex);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    count: users.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: users,
  });
});

// @desc    Get single user
// @route   GET /api/users/:username
// @access  Public
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ username: req.params.username })
    .select('-password')
    .populate('threadsFollowed', 'title slug')
    .populate('wishlist', 'name username image');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  // Get user's threads
  const threads = await Thread.find({ createdBy: user._id })
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get user's recent comments
  const comments = await Comment.find({ userId: user._id })
    .populate('threadId', 'title slug')
    .sort({ createdAt: -1 })
    .limit(5);

  // Calculate user stats
  const stats = {
    threadsCount: await Thread.countDocuments({ createdBy: user._id }),
    commentsCount: await Comment.countDocuments({ userId: user._id }),
    followersCount: await User.countDocuments({ wishlist: user._id }),
    followingCount: user.wishlist.length,
  };

  res.json({
    success: true,
    data: {
      user,
      threads,
      comments,
      stats,
    },
  });
});

// @desc    Follow/Unfollow user
// @route   POST /api/users/:id/follow
// @access  Private
const followUser = asyncHandler(async (req, res) => {
  const userToFollow = await User.findById(req.params.id);
  const currentUser = await User.findById(req.user.id);

  if (!userToFollow) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  if (userToFollow._id.toString() === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot follow yourself',
    });
  }

  const isFollowing = currentUser.wishlist.includes(userToFollow._id);

  if (isFollowing) {
    // Unfollow
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { wishlist: userToFollow._id },
    });
    
    res.json({
      success: true,
      message: 'User unfollowed successfully',
      isFollowing: false,
    });
  } else {
    // Follow
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { wishlist: userToFollow._id },
    });
    
    res.json({
      success: true,
      message: 'User followed successfully',
      isFollowing: true,
    });
  }
});

// @desc    Get user's followers
// @route   GET /api/users/:id/followers
// @access  Public
const getUserFollowers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const followers = await User.find({ wishlist: req.params.id })
    .select('username name image role reputation');

  res.json({
    success: true,
    count: followers.length,
    data: followers,
  });
});

// @desc    Get user's following
// @route   GET /api/users/:id/following
// @access  Public
const getUserFollowing = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('wishlist', 'username name image role reputation');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  res.json({
    success: true,
    count: user.wishlist.length,
    data: user.wishlist,
  });
});

module.exports = {
  getUsers,
  getUser,
  followUser,
  getUserFollowers,
  getUserFollowing,
};