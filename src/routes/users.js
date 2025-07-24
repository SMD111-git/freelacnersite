const express = require('express');
const {
  getUsers,
  getUser,
  followUser,
  getUserFollowers,
  getUserFollowing,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { paginationValidation, mongoIdValidation } = require('../middleware/validation');

const router = express.Router();

router.get('/', paginationValidation, getUsers);
router.get('/:username', getUser);
router.post('/:id/follow', protect, mongoIdValidation, followUser);
router.get('/:id/followers', mongoIdValidation, getUserFollowers);
router.get('/:id/following', mongoIdValidation, getUserFollowing);

module.exports = router;