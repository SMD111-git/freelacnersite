onst mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'thread_reply',
      'comment_reply', 
      'thread_upvote',
      'comment_upvote',
      'thread_bookmark',
      'new_message',
      'thread_mention',
      'comment_mention',
      'system',
      'newsletter'
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot be more than 500 characters'],
  },
  data: {
    threadId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Thread',
    },
    commentId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Comment',
    },
    messageId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Message',
    },
    fromUserId: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    actionUrl: String,
  },
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for better performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = mongoose.model('Notification', notificationSchema);