const socketIO = require('socket.io');
const logger = require('../utils/Logger');

let io;

// Connected users map: userId -> socketId
const connectedUsers = new Map();

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    logger.info('🔌 New socket connection:', socket.id);

    // User authentication and registration
    socket.on('user:register', (userId) => {
      connectedUsers.set(userId.toString(), socket.id);
      socket.userId = userId;
      socket.join(`user:${userId}`);
      logger.info(`✅ User ${userId} registered with socket ${socket.id}`);
      
      // Notify online status
      socket.broadcast.emit('user:online', { userId });
    });

    // Join room for chat
    socket.on('chat:join', (roomId) => {
      socket.join(`chat:${roomId}`);
      logger.info(`💬 User joined chat room: ${roomId}`);
    });

    // Send message
    socket.on('chat:message', (data) => {
      io.to(`chat:${data.roomId}`).emit('chat:newMessage', data);
    });

    // Typing indicator
    socket.on('chat:typing', (data) => {
      socket.to(`chat:${data.roomId}`).emit('chat:userTyping', {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    });

    // Visitor approval request
    socket.on('visitor:request', (data) => {
      // Send to specific resident
      io.to(`user:${data.residentId}`).emit('visitor:newRequest', data);
    });

    // Visitor approval/denial
    socket.on('visitor:response', (data) => {
      // Send to all guards
      io.emit('visitor:statusUpdate', data);
    });

    // Guard location update
    socket.on('location:update', (data) => {
      // Broadcast to management users
      io.emit('location:guardUpdate', {
        guardId: socket.userId,
        ...data
      });
    });

    // SOS alert
    socket.on('sos:trigger', (data) => {
      logger.info('🆘 SOS Alert triggered:', data);
      // Send to all guards and management
      io.emit('sos:alert', {
        ...data,
        triggeredBy: socket.userId,
        timestamp: new Date()
      });
    });

    // SOS acknowledgment
    socket.on('sos:acknowledge', (data) => {
      io.emit('sos:acknowledged', {
        ...data,
        acknowledgedBy: socket.userId
      });
    });

    // Notice broadcast
    socket.on('notice:publish', (data) => {
      io.emit('notice:new', data);
    });

    // Complaint status update
    socket.on('complaint:update', (data) => {
      io.to(`user:${data.residentId}`).emit('complaint:statusChanged', data);
    });

    // Bill payment notification
    socket.on('bill:paid', (data) => {
      io.emit('bill:paymentReceived', data);
    });

    // Amenity booking
    socket.on('amenity:book', (data) => {
      io.emit('amenity:newBooking', data);
    });

    // Staff entry/exit notification
    socket.on('staff:entry', (data) => {
      io.to(`user:${data.residentId}`).emit('staff:entered', data);
    });

    socket.on('staff:exit', (data) => {
      io.to(`user:${data.residentId}`).emit('staff:exited', data);
    });

    // Overstay alert
    socket.on('visitor:overstay', (data) => {
      // Send to resident and all guards
      io.to(`user:${data.residentId}`).emit('visitor:overstayAlert', data);
      io.emit('visitor:overstayAlert', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId.toString());
        socket.broadcast.emit('user:offline', { userId: socket.userId });
        logger.info(`❌ User ${socket.userId} disconnected`);
      }
      logger.info('🔌 Socket disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

const getConnectedUsers = () => {
  return connectedUsers;
};

module.exports = { initializeSocket, getIO, getConnectedUsers };