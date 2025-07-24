const express = require('express');
const {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  voteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const {
  commentValidation,
  mongoIdValidation,
} = require('../middleware/validation');

const router = express.Router();

router.route('/')
  .get(getComments)
  .post(protect, commentValidation, createComment);

router.route('/:id')
  .put(protect, mongoIdValidation, updateComment)
  .delete(protect, mongoIdValidation, deleteComment);

router.post('/:id/vote', protect, mongoIdValidation, voteComment);

module.exports = router;