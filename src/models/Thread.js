const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters'],
  },
  slug: {
    type: String,
    unique: true,
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: 'Category',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  budget: {
    min: {
      type: Number,
      min: 0,
    },
    max: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },
  deadline: {
    type: Date,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'closed'],
    default: 'open',
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
  bookmarks: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  }],
  commentsCount: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: 0,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Create thread slug from the title
threadSchema.pre('save', function(next) {
  this.slug = this.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  next();
});

// Static method to get threads with advanced filtering
threadSchema.statics.getFilteredThreads = function(filters) {
  const query = this.find();
  
  if (filters.category) {
    query.where('category').equals(filters.category);
  }
  
  if (filters.status) {
    query.where('status').equals(filters.status);
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.where('tags').in(filters.tags);
  }
  
  if (filters.budget) {
    if (filters.budget.min) query.where('budget.min').gte(filters.budget.min);
    if (filters.budget.max) query.where('budget.max').lte(filters.budget.max);
  }
  
  return query;
};

module.exports = mongoose.model('Thread', threadSchema);