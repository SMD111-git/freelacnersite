const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryThreads,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const {
  categoryValidation,
  paginationValidation,
  mongoIdValidation,
} = require('../middleware/validation');

const router = express.Router();

router.route('/')
  .get(getCategories)
  .post(protect, authorize('admin'), categoryValidation, createCategory);

router.route('/:id')
  .get(mongoIdValidation, getCategory)
  .put(protect, authorize('admin'), mongoIdValidation, updateCategory)
  .delete(protect, authorize('admin'), mongoIdValidation, deleteCategory);

router.get('/:id/threads', mongoIdValidation, paginationValidation, getCategoryThreads);

module.exports = router;