/**
 * Database Configuration and Connection Manager
 * Handles MongoDB connections with environment-specific settings
 * 
 * Features:
 * - Environment-based configuration (development vs production)
 * - Production-ready settings for Azure CosmosDB and MongoDB Atlas
 * - Local development MongoDB configuration
 * - Connection pooling and timeout management
 * - Comprehensive error handling and logging
 * - SSL/TLS support for cloud databases
 */

import mongoose from 'mongoose';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Database Configuration Interface
 * Defines the structure for database connection parameters
 */
interface DatabaseConfig {
  uri: string;                          // MongoDB connection string
  options: mongoose.ConnectOptions;     // Mongoose connection options
}

/**
 * Check and Auto-Seed Database in Development
 * Automatically runs seed script if database is empty in development mode
 * 
 * @returns {Promise<void>} Promise that resolves when seeding check is complete
 */
const checkAndAutoSeed = async (): Promise<void> => {
  // Only run auto-seeding in development environment
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  try {
    // Check if we have any existing data
    const collections = await mongoose.connection.db.listCollections().toArray();
    const userCollection = collections.find(col => col.name === 'users');
    
    if (userCollection) {
      // Check if users collection has any documents
      const userCount = await mongoose.connection.db.collection('users').countDocuments();
      if (userCount > 0) {
        console.log(chalk.blue('📊 Database already contains data, skipping auto-seeding'));
        return;
      }
    }

    // Database is empty, run seed script
    console.log(chalk.yellow('🌱 Empty database detected, running auto-seed...'));
    const { stdout, stderr } = await execAsync('node src/scripts/seedFull.js', {
      cwd: process.cwd()
    });

    if (stderr) {
      console.error(chalk.red('⚠️  Seed script warnings:'), stderr);
    }

    console.log(chalk.green('✅ Auto-seeding completed successfully'));
    console.log(chalk.gray('📝 Seed output:'), stdout);

  } catch (error) {
    console.error(chalk.red('❌ Auto-seeding failed:'), error);
    console.log(chalk.yellow('💡 You can manually run the seed script: node src/scripts/seedFull.js'));
  }
};

/**
 * Get Database Configuration Based on Environment
 * Returns appropriate database settings for development or production
 * 
 * @returns {DatabaseConfig} Configuration object with URI and options
 */
const getDatabaseConfig = (): DatabaseConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Base connection options shared across environments
  const baseOptions: mongoose.ConnectOptions = {
    maxPoolSize: 10,                    // Maximum number of connections in pool
    serverSelectionTimeoutMS: 5000,     // Timeout for server selection
    socketTimeoutMS: 45000,             // Socket timeout for operations
  };

  if (isProduction) {
    // Production Configuration for Azure CosmosDB or MongoDB Atlas
    return {
      uri: process.env.MONGODB_URI || '',
      options: {
        ...baseOptions,
        retryWrites: true,              // Enable retry writes for transactions
        w: 'majority',                  // Write concern for data consistency
        ssl: true,                      // Required for Azure CosmosDB and Atlas
        bufferCommands: false,          // Disable command buffering in production
      }
    };
  } else {
    // Development Configuration for Local MongoDB
    return {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/final_project_dev',
      options: {
        ...baseOptions,
        retryWrites: true,              // Enable retry writes
        w: 'majority',                  // Write concern for consistency
      }
    };
  }
};

/**
 * Connect to MongoDB Database
 * Establishes connection with environment-appropriate settings and error handling
 * 
 * @returns {Promise<void>} Promise that resolves when connection is established
 */
  try {
    const { uri, options } = getDatabaseConfig();
    
    if (!uri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    console.log(chalk.blue('🔗 Connecting to database...'));
    console.log(chalk.gray(`Environment: ${process.env.NODE_ENV || 'development'}`));
    
    await mongoose.connect(uri, options);
    
    const dbName = mongoose.connection.db?.databaseName;
    console.log(chalk.green(`✅ MongoDB Connected Successfully to: ${dbName}`));
    
    // Auto-seed database in development
    await checkAndAutoSeed();
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error(chalk.red('❌ MongoDB Connection Error:'), error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log(chalk.yellow('⚠️  MongoDB Disconnected'));
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log(chalk.yellow('\n🔄 Shutting down gracefully...'));
      await mongoose.connection.close();
      console.log(chalk.green('✅ Database connection closed'));
      process.exit(0);
    });
    
  } catch (error) {
    console.error(chalk.red('❌ MongoDB Connection Error:'), error);
    
    if (process.env.NODE_ENV === 'production') {
      // In production, exit if database connection fails
      process.exit(1);
    } else {
      // In development, provide helpful error messages
      console.log(chalk.yellow('\n💡 Development Tips:'));
      console.log(chalk.gray('   - Make sure MongoDB is running locally'));
      console.log(chalk.gray('   - Check your MONGODB_URI in .env.development'));
      console.log(chalk.gray('   - Try: brew services start mongodb-community (macOS)'));
      console.log(chalk.gray('   - Try: sudo systemctl start mongod (Linux)'));
      console.log(chalk.gray('   - Try: net start MongoDB (Windows)'));
      process.exit(1);
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log(chalk.green('✅ Database connection closed'));
  } catch (error) {
    console.error(chalk.red('❌ Error closing database connection:'), error);
  }
};

// Seeding helper - connects without server startup events
export const connectForSeeding = async (): Promise<void> => {
  try {
    const { uri, options } = getDatabaseConfig();
    
    if (!uri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    console.log(chalk.blue('🌱 Connecting to database for seeding...'));
    console.log(chalk.gray(`Environment: ${process.env.NODE_ENV || 'development'}`));
    
    await mongoose.connect(uri, options);
    
    const dbName = mongoose.connection.db?.databaseName;
    console.log(chalk.green(`✅ Connected to: ${dbName}`));
    
  } catch (error) {
    console.error(chalk.red('❌ Database Connection Error:'), error);
    throw error;
  }
};

/**
 * Auto-Seeding Function for Development
 * Checks if database is empty and runs comprehensive seeding if needed
 */
export const checkAndAutoSeed = async (): Promise<void> => {
  try {
    // Import models (dynamic import to avoid circular dependencies)
    const User = require('../models/User');
    const Product = require('../models/Product');
    
    // Check if database has any users
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log(chalk.yellow('🌱 Database is empty - running auto-seed...'));
      
      // Import and run the comprehensive seed function
      const seedFunction = require('../scripts/seedFull');
      
      // Note: The seedFull.js file exports the seed function, we need to call it
      // Since it's a standalone script, we'll use child_process to execute it
      const { exec } = require('child_process');
      const path = require('path');
      
      return new Promise((resolve, reject) => {
        const seedPath = path.join(__dirname, '../scripts/seedFull.js');
        exec(`node "${seedPath}"`, (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error(chalk.red('❌ Auto-seeding failed:'), error);
            reject(error);
            return;
          }
          
          console.log(chalk.green('✅ Auto-seeding completed successfully!'));
          console.log(chalk.blue('📊 Ready to use with test data'));
          resolve();
        });
      });
    } else {
      console.log(chalk.green(`✅ Database has ${userCount} users - skipping auto-seed`));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Auto-seeding error:'), error);
    // Don't throw error - let server continue even if seeding fails
  }
};