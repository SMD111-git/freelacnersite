const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Please add message content'],
    maxlength: [1000, 'Message cannot be more than 1000 characters'],
  },
  threadId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Thread',
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image'],
    default: 'text',
  },
  attachments: [{
    filename: String,
    originalName: String,
    size: Number,
    mimetype: String,
  }],
  read: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedBy: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

// Index for better performance
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });

module.exports = mongoose.model('Message', messageSchema);