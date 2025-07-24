const Thread = require('../models/Thread');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    Get all threads
// @route   GET /api/threads
// @access  Public
const getThreads = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

  // Build query
  let query = Thread.find();

  // Filter by category
  if (req.query.category) {
    query = query.where('category').equals(req.query.category);
  }

  // Filter by status
  if (req.query.status) {
    query = query.where('status').equals(req.query.status);
  }

  // Search
  if (req.query.search) {
    query = query.where({
      $or: [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } },
      ],
    });
  }

  // Sort
  let sortBy = '-createdAt';
  if (req.query.sort) {
    switch (req.query.sort) {
      case 'popular':
        sortBy = '-upvotes -views';
        break;
      case 'oldest':
        sortBy = 'createdAt';
        break;
      case 'recent':
        sortBy = '-updatedAt';
        break;
      case 'most-commented':
        sortBy = '-commentsCount';
        break;
    }
  }

  const threads = await query
    .populate('createdBy', 'username name image role reputation')
    .populate('category', 'name color icon')
    .sort(sortBy)
    .limit(limit * 1)
    .skip(startIndex);

  const total = await Thread.countDocuments(query.getQuery());

  res.json({
    success: true,
    count: threads.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: threads,
  });
});

// @desc    Get single thread
// @route   GET /api/threads/:id
// @access  Public
const getThread = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.id)
    .populate('createdBy', 'username name image role bio reputation')
    .populate('category', 'name description color icon');

  if (!thread) {
    return res.status(404).json({
      success: false,
      message: 'Thread not found',
    });
  }

  // Increment views
  thread.views += 1;
  await thread.save();

  // Get comments
  const comments = await Comment.find({ threadId: thread._id, parentId: null })
    .populate('userId', 'username name image role reputation')
    .populate({
      path: 'mentions',
      select: 'username name',
    })
    .sort('createdAt');

  // Get replies for each comment
  for (let comment of comments) {
    const replies = await Comment.find({ parentId: comment._id })
      .populate('userId', 'username name image role reputation')
      .sort('createdAt');
    comment.replies = replies;
  }

  res.json({
    success: true,
    data: {
      thread,
      comments,
    },
  });
});

// @desc    Create thread
// @route   POST /api/threads
// @access  Private
const createThread = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { title, description, categoryId, tags, budget, deadline, priority } = req.body;

  // Check if category exists
  const category = await Category.findById(categoryId);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  const thread = await Thread.create({
    title,
    description,
    category: categoryId,
    createdBy: req.user.id,
    tags: tags || [],
    budget,
    deadline,
    priority: priority || 'medium',
  });

  // Update category thread count
  await Category.findByIdAndUpdate(categoryId, {
    $inc: { threadsCount: 1 },
  });

  // Populate the created thread
  const populatedThread = await Thread.findById(thread._id)
    .populate('createdBy', 'username name image role')
    .populate('category', 'name color icon');

  res.status(201).json({
    success: true,
    data: populatedThread,
  });
});

// @desc    Update thread
// @route   PUT /api/threads/:id
// @access  Private
const updateThread = asyncHandler(async (req, res) => {
  let thread = await Thread.findById(req.params.id);

  if (!thread) {
    return res.status(404).json({
      success: false,
      message: 'Thread not found',
    });
  }

  // Check ownership
  if (thread.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this thread',
    });
  }

  const allowedUpdates = ['title', 'description', 'tags', 'budget', 'deadline', 'priority', 'status'];
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  thread = await Thread.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'username name image role')
   .populate('category', 'name color icon');

  res.json({
    success: true,
    data: thread,
  });
});

// @desc    Delete thread
// @route   DELETE /api/threads/:id
// @access  Private
const deleteThread = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.id);

  if (!thread) {
    return res.status(404).json({
      success: false,
      message: 'Thread not found',
    });
  }

  // Check ownership
  if (thread.createdBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this thread',
    });
  }

  // Delete all comments
  await Comment.deleteMany({ threadId: thread._id });

  // Update category thread count
  await Category.findByIdAndUpdate(thread.category, {
    $inc: { threadsCount: -1 },
  });

  await thread.deleteOne();

  res.json({
    success: true,
    message: 'Thread deleted successfully',
  });
});

// @desc    Vote on thread
// @route   POST /api/threads/:id/vote
// @access  Private
const voteThread = asyncHandler(async (req, res) => {
  const { voteType } = req.body;
  const thread = await Thread.findById(req.params.id);

  if (!thread) {
    return res.status(404).json({
      success: false,
      message: 'Thread not found',
    });
  }

  if (!['up', 'down'].includes(voteType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid vote type',
    });
  }

  // Check if user already voted
  const existingVote = thread.votedBy.find(
    vote => vote.user.toString() === req.user.id
  );

  if (existingVote) {
    if (existingVote.voteType === voteType) {
      // Remove vote
      thread.votedBy = thread.votedBy.filter(
        vote => vote.user.toString() !== req.user.id
      );
      
      if (voteType === 'up') {
        thread.upvotes -= 1;
      } else {
        thread.downvotes -= 1;
      }
    } else {
      // Change vote
      existingVote.voteType = voteType;
      
      if (voteType === 'up') {
        thread.upvotes += 1;
        thread.downvotes -= 1;
      } else {
        thread.upvotes -= 1;
        thread.downvotes += 1;
      }
    }
  } else {
    // New vote
    thread.votedBy.push({
      user: req.user.id,
      voteType,
    });
    
    if (voteType === 'up') {
      thread.upvotes += 1;
    } else {
      thread.downvotes += 1;
    }

    // Create notification for thread owner (only for upvotes)
    if (voteType === 'up' && thread.createdBy.toString() !== req.user.id) {
      await Notification.create({
        userId: thread.createdBy,
        type: 'thread_upvote',
        title: 'Your thread received an upvote',
        message: `Someone upvoted your thread "${thread.title}"`,
        data: {
          threadId: thread._id,
          fromUserId: req.user.id,
          actionUrl: `/threads/${thread._id}`,
        },
      });
    }
  }

  await thread.save();

  res.json({
    success: true,
    upvotes: thread.upvotes,
    downvotes: thread.downvotes,
  });
});

// @desc    Bookmark thread
// @route   POST /api/threads/:id/bookmark
// @access  Private
const bookmarkThread = asyncHandler(async (req, res) => {
  const thread = await Thread.findById(req.params.id);

  if (!thread) {
    return res.status(404).json({
      success: false,
      message: 'Thread not found',
    });
  }

  const isBookmarked = thread.bookmarks.includes(req.user.id);

  if (isBookmarked) {
    // Remove bookmark
    thread.bookmarks = thread.bookmarks.filter(
      id => id.toString() !== req.user.id
    );
    
    await thread.save();
    
    res.json({
      success: true,
      message: 'Thread unbookmarked',
      isBookmarked: false,
    });
  } else {
    // Add bookmark
    thread.bookmarks.push(req.user.id);
    await thread.save();
    
    res.json({
      success: true,
      message: 'Thread bookmarked',
      isBookmarked: true,
    });
  }
});

module.exports = {
  getThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  voteThread,
  bookmarkThread,
};