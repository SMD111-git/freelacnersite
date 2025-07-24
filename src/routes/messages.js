const express = require('express');
const {
  getConversations,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const {
  messageValidation,
  paginationValidation,
  mongoIdValidation,
} = require('../middleware/validation');

const router = express.Router();

router.get('/conversations', protect, getConversations);
router.get('/unread/count', protect, getUnreadCount);
router.get('/:userId', protect, paginationValidation, getMessages);
router.post('/', protect, messageValidation, sendMessage);
router.put('/:id/read', protect, mongoIdValidation, markAsRead);
router.delete('/:id', protect, mongoIdValidation, deleteMessage);

module.exports = router;