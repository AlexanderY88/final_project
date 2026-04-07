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
export const connectDB = async (): Promise<void> => {
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
 * Check and Auto-Seed Database in Development
 * Runs incremental seed script in development mode to ensure baseline data exists.
 */
export const checkAndAutoSeed = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  try {
    console.log(chalk.yellow('🌱 Development mode detected, running incremental seed...'));
    const { stdout, stderr } = await execAsync('node seed.js', {
      cwd: process.cwd()
    });

    if (stdout) {
      console.log(chalk.gray(stdout.trim()));
    }

    if (stderr) {
      console.error(chalk.red('⚠️  Seed script warnings:'), stderr);
    }

    console.log(chalk.green('✅ Incremental seed completed'));
  } catch (error) {
    console.error(chalk.red('❌ Auto-seeding failed:'), error);
  }
};