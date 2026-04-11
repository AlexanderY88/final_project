// Import required packages
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const chalk = require("chalk"); // For colored console output

const dotenvPath = path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development');
dotenv.config({ path: dotenvPath });

// Import our route files
const users = require("./routes/users");
const cards = require("./routes/products");

// Import seed function
const seedDatabase = require("./seed");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/products', cards);
app.use('/api/users', users);

app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;