const Category = require('../models/Category');
const Thread = require('../models/Thread');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true })
    .sort({ threadsCount: -1, name: 1 });

  res.json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category || !category.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  // Get recent threads in this category
  const recentThreads = await Thread.find({ category: category._id })
    .populate('createdBy', 'username name image role')
    .sort({ createdAt: -1 })
    .limit(10);

  // Get category stats
  const stats = {
    totalThreads: await Thread.countDocuments({ category: category._id }),
    activeThreads: await Thread.countDocuments({ 
      category: category._id, 
      status: 'open' 
    }),
    completedThreads: await Thread.countDocuments({ 
      category: category._id, 
      status: 'completed' 
    }),
  };

  res.json({
    success: true,
    data: {
      category,
      recentThreads,
      stats,
    },
  });
});

// @desc    Create category
// @route   POST /api/categories
// @access  Private (Admin only)
const createCategory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  const { name, description, color, icon } = req.body;

  // Check if category already exists
  const existingCategory = await Category.findOne({ 
    name: { $regex: new RegExp(`^${name}$`, 'i') } 
  });

  if (existingCategory) {
    return res.status(400).json({
      success: false,
      message: 'Category already exists',
    });
  }

  const category = await Category.create({
    name,
    description,
    color: color || '#3B82F6',
    icon: icon || '💼',
  });

  res.status(201).json({
    success: true,
    data: category,
  });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  const { name, description, color, icon, isActive } = req.body;

  // Check if new name conflicts with existing category
  if (name && name !== category.name) {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: category._id },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists',
      });
    }
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: name || category.name,
      description: description || category.description,
      color: color || category.color,
      icon: icon || category.icon,
      isActive: isActive !== undefined ? isActive : category.isActive,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.json({
    success: true,
    data: updatedCategory,
  });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  // Check if category has threads
  const threadCount = await Thread.countDocuments({ category: category._id });
  
  if (threadCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete category with existing threads',
    });
  }

  await category.deleteOne();

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

// @desc    Get category threads
// @route   GET /api/categories/:id/threads
// @access  Public
const getCategoryThreads = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category || !category.isActive) {
    return res.status(404).json({
      success: false,
      message: 'Category not found',
    });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;

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

  const threads = await Thread.find({ category: category._id })
    .populate('createdBy', 'username name image role reputation')
    .populate('category', 'name color icon')
    .sort(sortBy)
    .limit(limit * 1)
    .skip(startIndex);

  const total = await Thread.countDocuments({ category: category._id });

  res.json({
    success: true,
    count: threads.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      category,
      threads,
    },
  });
});

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryThreads,
};