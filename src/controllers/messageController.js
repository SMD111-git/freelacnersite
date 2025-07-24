const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    Get user conversations
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [{ sender: userId }, { receiver: userId }],
        isDeleted: false,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', userId] },
            '$receiver',
            '$sender',
          ],
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiver', userId] },
                  { $eq: ['$read', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        user: {
          _id: 1,
          username: 1,
          name: 1,
          image: 1,
          role: 1,
          isActive: 1,
        },
        lastMessage: 1,
        unreadCount: 1,
      },
    },
    {
      $sort: { 'lastMessage.createdAt': -1 },
    },
  ]);

  res.json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});

// @desc    Get messages between two users
// @route   GET /api/messages/:userId
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const startIndex = (page - 1) * limit;

  // Check if the other user exists
  const otherUser = await User.findById(userId);
  if (!otherUser) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  const messages = await Message.find({
    $or: [
      { sender: currentUserId, receiver: userId },
      { sender: userId, receiver: currentUserId },
    ],
    isDeleted: false,
  })
    .populate('sender', 'username name image')
    .populate('receiver', 'username name image')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip(startIndex);

  // Mark messages as read
  await Message.updateMany(
    {
      sender: userId,
      receiver: currentUserId,
      read: false,
    },
    {
      read: true,
      readAt: Date.now(),
    }
  );

  const total = await Message.countDocuments({
    $or: [
      { sender: currentUserId, receiver: userId },
      { sender: userId, receiver: currentUserId },
    ],
    isDeleted: false,
  });

  res.json({
    success: true,
    count: messages.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: messages.reverse(), // Reverse to show oldest first
  });
});

// @desc    Send message
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { receiverId, content, threadId, messageType } = req.body;

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return res.status(404).json({
      success: false,
      message: 'Receiver not found',
    });
  }

  // Check if receiver allows messages
  if (!receiver.notificationPrefs.chat) {
    return res.status(403).json({
      success: false,
      message: 'User has disabled messages',
    });
  }

  const message = await Message.create({
    sender: req.user.id,
    receiver: receiverId,
    content,
    threadId: threadId || null,
    messageType: messageType || 'text',
  });

  // Create notification
  await Notification.create({
    userId: receiverId,
    type: 'new_message',
    title: 'New message',
    message: `${req.user.name} sent you a message`,
    data: {
      messageId: message._id,
      fromUserId: req.user.id,
      actionUrl: `/chat?user=${req.user.username}`,
    },
  });

  // Populate and return the created message
  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'username name image')
    .populate('receiver', 'username name image');

  // Emit real-time message via Socket.IO
  const io = req.app.get('io');
  io.to(`user-${receiverId}`).emit('new-message', {
    message: populatedMessage,
    sender: req.user,
  });

  res.status(201).json({
    success: true,
    data: populatedMessage,
  });
});

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const message = await Message.findOne({
    _id: req.params.id,
    receiver: req.user.id,
  });

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found',
    });
  }

  message.read = true;
  message.readAt = Date.now();
  await message.save();

  res.json({
    success: true,
    message: 'Message marked as read',
  });
});

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return res.status(404).json({
      success: false,
      message: 'Message not found',
    });
  }

  // Check if user is sender or receiver
  if (
    message.sender.toString() !== req.user.id &&
    message.receiver.toString() !== req.user.id
  ) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this message',
    });
  }

  // Add user to deletedBy array instead of actually deleting
  if (!message.deletedBy.includes(req.user.id)) {
    message.deletedBy.push(req.user.id);
  }

  // If both users deleted, mark as deleted
  if (message.deletedBy.length === 2) {
    message.isDeleted = true;
  }

  await message.save();

  res.json({
    success: true,
    message: 'Message deleted successfully',
  });
});

// @desc    Get unread message count
// @route   GET /api/messages/unread/count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Message.countDocuments({
    receiver: req.user.id,
    read: false,
    isDeleted: false,
  });

  res.json({
    success: true,
    count,
  });
});

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount,
};