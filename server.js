const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const connectDB = require('./src/config/database');
const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const { socketAuth } = require('./src/middleware/auth');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static('public/uploads'));

// Socket.io middleware
io.use(socketAuth);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });
  
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
  });
  
  socket.on('send-message', async (data) => {
    const { receiverId, content, threadId } = data;
    
    // Emit to receiver
    socket.to(`user-${receiverId}`).emit('new-message', {
      senderId: socket.userId,
      content,
      threadId,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;