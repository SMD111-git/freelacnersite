const { body, query, param } = require('express-validator');

// Auth validation
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .trim(),
  
  body('role')
    .isIn(['client', 'freelancer'])
    .withMessage('Role must be either client or freelancer'),
];

const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username or email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Thread validation
const threadValidation = [
  body('title')
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters')
    .trim(),
  
  body('description')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters')
    .trim(),
  
  body('categoryId')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('budget.min')
    .optional()
    .isNumeric()
    .withMessage('Budget minimum must be a number'),
  
  body('budget.max')
    .optional()
    .isNumeric()
    .withMessage('Budget maximum must be a number'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
];

// Comment validation
const commentValidation = [
  body('threadId')
    .isMongoId()
    .withMessage('Valid thread ID is required'),
  
  body('body')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
    .trim(),
  
  body('parentId')
    .optional()
    .isMongoId()
    .withMessage('Valid parent comment ID is required'),
  
  body('mentions')
    .optional()
    .isArray()
    .withMessage('Mentions must be an array'),
];

// Message validation
const messageValidation = [
  body('receiverId')
    .isMongoId()
    .withMessage('Valid receiver ID is required'),
  
  body('content')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
    .trim(),
  
  body('threadId')
    .optional()
    .isMongoId()
    .withMessage('Valid thread ID is required'),
  
  body('messageType')
    .optional()
    .isIn(['text', 'file', 'image'])
    .withMessage('Message type must be text, file, or image'),
];

// Category validation
const categoryValidation = [
  body('name')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters')
    .trim(),
  
  body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters')
    .trim(),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('Color must be a valid hex code'),
  
  body('icon')
    .optional()
    .isLength({ max: 10 })
    .withMessage('Icon must be less than 10 characters'),
];

// Query validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Param validation
const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid MongoDB ID is required'),
];

module.exports = {
  registerValidation,
  loginValidation,
  threadValidation,
  commentValidation,
  messageValidation,
  categoryValidation,
  paginationValidation,
  mongoIdValidation,
};
```

**`backend/src/middleware/errorHandler.js`**

```javascript
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;