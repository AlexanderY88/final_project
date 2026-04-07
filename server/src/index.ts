import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import route handlers
const userRoutes = require('../routes/users');  // User authentication and management routes
const productRoutes = require('../routes/products');  // Product management routes
const logRoutes = require('../routes/logs');  // Logging and analytics routes
const messageRoutes = require('../routes/messages');  // Contact-us mailbox routes

// Import middleware
const { requestLogger, errorLogger } = require('./middleware/logging');

// Import database configuration
import { connectDB } from './config/database';

/**
 * Environment Configuration Setup
 * Loads environment variables based on NODE_ENV
 * Falls back to default .env if specific environment file doesn't exist
 */
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Fallback to .env if specific environment file doesn't exist
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
  dotenv.config();
}

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

/**
 * Security and CORS Middleware Configuration
 */
// Helmet: Sets various HTTP headers for security.
// Allow cross-origin resource loading so the frontend (localhost:3000)
// can render images served from the API host (localhost:5000).
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

/**
 * Rate Limiting Middleware - Brute Force Protection
 * Restrict only login attempts by IP to prevent brute force attacks
 */
// Strict login rate limiting: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// CORS: Configure cross-origin resource sharing
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',  // Allow frontend URL
  credentials: true  // Allow cookies and credentials
}));

/**
 * Request Parsing Middleware
 */
app.use(express.json());  // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded request bodies

/**
 * Request Logging Middleware
 * Automatically logs all API requests with business intelligence
 */
app.use('/api', requestLogger());

/**
 * Static File Serving
 * Serve uploaded product images at /api/images endpoint
 */
app.use('/api/images', express.static(path.resolve(__dirname, '../uploads')));

/**
 * API Route Configuration
 */
// Apply strict rate limiting only to login attempts, not all user endpoints.
app.use('/api/users/login', loginLimiter);
app.use('/api/users', userRoutes);      // User authentication and profile routes
app.use('/api/products', productRoutes); // Product management routes
app.use('/api/logs', logRoutes);         // Logging and analytics routes
app.use('/api/messages', messageRoutes); // Contact-us mailbox routes

/**
 * Health Check Endpoint
 * Provides server status and basic information
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Error Logging Middleware
 * Logs all errors before handling them
 */
app.use(errorLogger);

/**
 * Global Error Handler
 * Catches unhandled errors and sends appropriate responses
 */
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled Error:', error);

  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'Image file is too large. Maximum allowed source file size is 10MB before compression.'
    });
  }
  
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

/**
 * 404 Handler
 * Handle requests to non-existent endpoints
 */
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

/**
 * Server Startup Function
 * Connects to database and starts the Express server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB database
    await connectDB();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
      console.log(`📁 Static files: http://localhost:${PORT}/api/images`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;