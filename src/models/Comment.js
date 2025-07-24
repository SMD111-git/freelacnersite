const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  threadId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Thread',
    required: true,
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  body: {
    type: String,
    required: [true, 'Please add a comment'],
    maxlength: [1000, 'Comment cannot be more than 1000 characters'],
  },
  parentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Comment',
    default: null,
  },
  upvotes: {
    type: Number,
    default: 0,
  },
  downvotes: {
    type: Number,
    default: 0,
  },
  votedBy: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    voteType: {
      type: String,
      enum: ['up', 'down'],
    },
  }],
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
  mentions: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  }],
  attachments: [{
    filename: String,
    originalName: String,
    size: Number,
    mimetype: String,
  }],
}, {
  timestamps: true,
});

// Index for better performance
commentSchema.index({ threadId: 1, createdAt: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ parentId: 1 });

module.exports = mongoose.model('Comment', commentSchema);