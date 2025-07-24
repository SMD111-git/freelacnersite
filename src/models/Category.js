const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  slug: {
    type: String,
    unique: true,
  },
  color: {
    type: String,
    default: '#3B82F6',
  },
  icon: {
    type: String,
    default: '💼',
  },
  threadsCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Create category slug from the name
categorySchema.pre('save', function(next) {
  this.slug = this.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  next();
});

module.exports = mongoose.model('Category', categorySchema);