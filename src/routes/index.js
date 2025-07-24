const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const threadRoutes = require('./threads');
const commentRoutes = require('./comments');
const messageRoutes = require('./messages');
const categoryRoutes = require('./categories');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/threads', threadRoutes);
router.use('/comments', commentRoutes);
router.use('/messages', messageRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;