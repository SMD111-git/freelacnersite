const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    maxlength: [50, 'Username cannot be more than 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  name: {
    type: String,
    required: [true, 'Please add a name'],
    maxlength: [50, 'Name cannot be more than 50 characters'],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['client', 'freelancer'],
    required: [true, 'Please specify a role'],
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters'],
  },
  skills: [{
    type: String,
    trim: true,
  }],
  image: {
    type: String,
    default: 'no-photo.jpg',
  },
  location: {
    type: String,
    maxlength: [100, 'Location cannot be more than 100 characters'],
  },
  website: {
    type: String,
    match: [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
      'Please use a valid URL with HTTP or HTTPS',
    ],
  },
  notificationPrefs: {
    newsletter: {
      type: Boolean,
      default: true,
    },
    chat: {
      type: Boolean,
      default: true,
    },
    replies: {
      type: Boolean,
      default: true,
    },
    mentions: {
      type: Boolean,
      default: true,
    },
  },
  wishlist: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  }],
  threadsFollowed: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Thread',
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  reputation: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);