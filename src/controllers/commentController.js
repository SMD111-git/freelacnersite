const Comment = require('../models/Comment');
const Thread = require('../models/Thread');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    Get comments for a thread
// @route   GET /api/comments?threadId=:threadId
// @access  Public
const getComments = asyncHandler(async (req, res) => {
  const { threadId } = req.query;

  if (!threadId) {
    return res.status(400).json({
      success: false,
      message: 'Thread ID is required',
    });
  }

  const comments = await Comment.find({ threadId, parentId: null })
    .populate('userId', 'username name image role reputation')
    .populate('mentions', 'username name')
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
    count: comments.length,
    data: comments,
  });
});

// @desc    Create comment
// @route   POST /api/comments
// @access  Private
const createComment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { threadId, body, parentId, mentions } = req.body;

  // Check if thread exists
  const thread = await Thread.findById(threadId);
  if (!thread) {
    return res.status(404).json({
      success: false,
      message: 'Thread not found',
    });
  }

  // Check if thread is locked
  if (thread.isLocked) {
    return res.status(403).json({
      success: false,
      message: 'Thread is locked',
    });
  }

  // If parentId provided, check if parent comment exists
  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found',
      });
    }
  }

  const comment = await Comment.create({
    threadId,
    userId: req.user.id,
    body,
    parentId: parentId || null,
    mentions: mentions || [],
  });

  // Update thread comment count
  await Thread.findByIdAndUpdate(threadId, {
    $inc: { commentsCount: 1 },
  });

  // Create notifications
  if (!parentId) {
    // Notify thread owner
    if (thread.createdBy.toString() !== req.user.id) {
      await Notification.create({
        userId: thread.createdBy,
        type: 'thread_reply',
        title: 'New comment on your thread',
        message: `${req.user.name} commented on your thread "${thread.title}"`,
        data: {
          threadId: thread._id,
          commentId: comment._id,
          fromUserId: req.user.id,
          actionUrl: `/threads/${thread._id}#comment-${comment._id}`,
        },
      });
    }
  } else {
    // Notify parent comment owner
    const parentComment = await Comment.findById(parentId);
    if (parentComment.userId.toString() !== req.user.id) {
      await Notification.create({
        userId: parentComment.userId,
        type: 'comment_reply',
        title: 'Reply to your comment',
        message: `${req.user.name} replied to your comment`,
        data: {
          threadId: thread._id,
          commentId: comment._id,
          fromUserId: req.user.id,
          actionUrl: `/threads/${thread._id}#comment-${comment._id}`,
        },
      });
    }
  }

  // Notify mentioned users
  if (mentions && mentions.length > 0) {
    for (const mentionedUserId of mentions) {
      if (mentionedUserId !== req.user.id) {
        const mentionedUser = await User.findById(mentionedUserId);
        if (mentionedUser) {
          await Notification.create({
            userId: mentionedUserId,
            type: 'comment_mention',
            title: 'You were mentioned in a comment',
            message: `${req.user.name} mentioned you in a comment on "${thread.title}"`,
            data: {
              threadId: thread._id,
              commentId: comment._id,
              fromUserId: req.user.id,
              actionUrl: `/threads/${thread._id}#comment-${comment._id}`,
            },
          });
        }
      }
    }
  }

  // Populate and return the created comment
  const populatedComment = await Comment.findById(comment._id)
    .populate('userId', 'username name image role reputation')
    .populate('mentions', 'username name');

  res.status(201).json({
    success: true,
    data: populatedComment,
  });
});

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private
const updateComment = asyncHandler(async (req, res) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found',
    });
  }

  // Check ownership
  if (comment.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this comment',
    });
  }

  const { body, mentions } = req.body;

  comment = await Comment.findByIdAndUpdate(
    req.params.id,
    {
      body,
      mentions: mentions || [],
      isEdited: true,
      editedAt: Date.now(),
    },
    {
      new: true,
      runValidators: true,
    }
  ).populate('userId', 'username name image role reputation')
   .populate('mentions', 'username name');

  res.json({
    success: true,
    data: comment,
  });
});

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found',
    });
  }

  // Check ownership
  if (comment.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this comment',
    });
  }

  // Delete all replies
  await Comment.deleteMany({ parentId: comment._id });

  // Update thread comment count
  const replyCount = await Comment.countDocuments({ parentId: comment._id });
  await Thread.findByIdAndUpdate(comment.threadId, {
    $inc: { commentsCount: -(replyCount + 1) },
  });

  await comment.deleteOne();

  res.json({
    success: true,
    message: 'Comment deleted successfully',
  });
});

// @desc    Vote on comment
// @route   POST /api/comments/:id/vote
// @access  Private
const voteComment = asyncHandler(async (req, res) => {
  const { voteType } = req.body;
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Comment not found',
    });
  }

  if (!['up', 'down'].includes(voteType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid vote type',
    });
  }

  // Check if user already voted
  const existingVote = comment.votedBy.find(
    vote => vote.user.toString() === req.user.id
  );

  if (existingVote) {
    if (existingVote.voteType === voteType) {
      // Remove vote
      comment.votedBy = comment.votedBy.filter(
        vote => vote.user.toString() !== req.user.id
      );
      
      if (voteType === 'up') {
        comment.upvotes -= 1;
      } else {
        comment.downvotes -= 1;
      }
    } else {
      // Change vote
      existingVote.voteType = voteType;
      
      if (voteType === 'up') {
        comment.upvotes += 1;
        comment.downvotes -= 1;
      } else {
        comment.upvotes -= 1;
        comment.downvotes += 1;
      }
    }
  } else {
    // New vote
    comment.votedBy.push({
      user: req.user.id,
      voteType,
    });
    
    if (voteType === 'up') {
      comment.upvotes += 1;
    } else {
      comment.downvotes += 1;
    }

    // Create notification for comment owner (only for upvotes)
    if (voteType === 'up' && comment.userId.toString() !== req.user.id) {
      await Notification.create({
        userId: comment.userId,
        type: 'comment_upvote',
        title: 'Your comment received an upvote',
        message: `Someone upvoted your comment`,
        data: {
          commentId: comment._id,
          threadId: comment.threadId,
          fromUserId: req.user.id,
          actionUrl: `/threads/${comment.threadId}#comment-${comment._id}`,
        },
      });
    }
  }

  await comment.save();

  res.json({
    success: true,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
  });
});

module.exports = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  voteComment,
};