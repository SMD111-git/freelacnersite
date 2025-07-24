const express = require('express');
const {
  getThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  voteThread,
  bookmarkThread,
} = require('../controllers/threadController');
const { protect } = require('../middleware/auth');
const {
  threadValidation,
  paginationValidation,
  mongoIdValidation,
} = require('../middleware/validation');

const router = express.Router();

router.route('/')
  .get(paginationValidation, getThreads)
  .post(protect, threadValidation, createThread);

router.route('/:id')
  .get(mongoIdValidation, getThread)
  .put(protect, mongoIdValidation, updateThread)
  .delete(protect, mongoIdValidation, deleteThread);

router.post('/:id/vote', protect, mongoIdValidation, voteThread);
router.post('/:id/bookmark', protect, mongoIdValidation, bookmarkThread);

module.exports = router;