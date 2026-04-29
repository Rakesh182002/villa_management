const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const { initializeSocket } = require('./src/config/socket');
const db = require('./src/config/database');

// Import routes
const authRoutes = require('./src/routers/authRoutes');
const visitorRoutes = require('./src/routers/visitorRoutes');
const staffRoutes = require('./src/routers/staffRoutes');
const complaintRoutes = require('./src/routers/complaintRoutes');
const locationRoutes = require('./src/routers/locationRoutes');
const billRoutes = require('./src/routers/billRoutes');
const amenityRoutes = require('./src/routers/amenityRoutes');
const paymentRoutes = require('./src/routers/paymentRoutes');
const communicationRoutes = require('./src/routers/communicationRoutes');
const managementRoutes = require('./src/routers/managementRoutes');
const logger = require('./src/utils/Logger');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Society Management API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/payment', paymentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const initializeDatabase = require('./src/scripts/init-db');
const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    // 1. Initialize Database (Schema Sync)
    await initializeDatabase();
    
    // 2. Start Listening
    server.listen(PORT, () => {
      logger.info(`
 ╔═══════════════════════════════════════════════════════╗
 ║                                                       ║
 ║   🏘️  SOCIETY MANAGEMENT SYSTEM API                    ║
 ║   🌐  Port: ${PORT}                                      ║
 ║   🚀  Status: Operational                             ║
 ║                                                       ║
 ╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();


// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };