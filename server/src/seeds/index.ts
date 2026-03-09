import mongoose from 'mongoose';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { connectForSeeding, disconnectDB } from '../config/database';
const User = require('../models/User');
const Product = require('../models/Product');
import { seedUsers } from './userSeeds';
import { seedProducts } from './productSeeds';

// Load development environment variables
dotenv.config({ 
  path: path.resolve(process.cwd(), '.env.development') 
});

class DatabaseSeeder {
  async run(): Promise<void> {
    try {
      console.log(chalk.blue('🌱 Starting database seeding...'));
      
      // Check if we're in development environment
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('Seeding is only allowed in development environment');
      }

      // Connect to database
      await connectForSeeding();

      // Clear existing data (optional - be careful!)
      if (process.argv.includes('--clear')) {
        console.log(chalk.yellow('🗑️  Clearing existing data...'));
        await this.clearDatabase();
      }

      // Run seeders
      await this.seedUsers();
      await this.seedProducts();

      console.log(chalk.green('✅ Database seeding completed successfully!'));
      
      // Show seeded data summary
      await this.showSummary();

    } catch (error) {
      console.error(chalk.red('❌ Seeding failed:'), error);
      process.exit(1);
    } finally {
      await disconnectDB();
    }
  }

  private async clearDatabase(): Promise<void> {
    try {
      await User.deleteMany({});
      console.log(chalk.gray('   - Users cleared'));
      await Product.deleteMany({});
      console.log(chalk.gray('   - Products cleared'));
    } catch (error) {
      console.error(chalk.red('Error clearing database:'), error);
      throw error;
    }
  }

  private async seedUsers(): Promise<void> {
    try {
      console.log(chalk.blue('👥 Seeding users...'));
      
      const userData = await seedUsers();
      
      // Check if users already exist (to avoid duplicates)
      const existingUsers = await User.find({ 
        email: { $in: userData.map(user => user.email) } 
      });
      
      if (existingUsers.length > 0 && !process.argv.includes('--force')) {
        console.log(chalk.yellow('⚠️  Users already exist. Use --force to override.'));
        console.log(chalk.gray(`   Found ${existingUsers.length} existing users`));
        return;
      }

      // Remove existing users if force flag is used
      if (process.argv.includes('--force')) {
        await User.deleteMany({ 
          email: { $in: userData.map(user => user.email) } 
        });
      }

      // Insert seed users
      const createdUsers = await User.insertMany(userData);
      console.log(chalk.green(`   ✅ Created ${createdUsers.length} users`));
      
      // Log created users (without passwords)
      createdUsers.forEach((user: any) => {
        console.log(chalk.gray(`      - ${user.email} (${user.role})`));
      });

    } catch (error) {
      console.error(chalk.red('Error seeding users:'), error);
      throw error;
    }
  }

  private async seedProducts(): Promise<void> {
    try {
      console.log(chalk.blue('📦 Seeding products...'));
      
      const productData = await seedProducts();
      
      // Check if products already exist (to avoid duplicates)
      const existingProducts = await Product.find({ 
        'product.title': { $in: productData.map(product => product.product?.title) } 
      });
      
      if (existingProducts.length > 0 && !process.argv.includes('--force')) {
        console.log(chalk.yellow('⚠️  Products already exist. Use --force to override.'));
        console.log(chalk.gray(`   Found ${existingProducts.length} existing products`));
        return;
      }

      // Remove existing products if force flag is used
      if (process.argv.includes('--force')) {
        await Product.deleteMany({ 
          'product.title': { $in: productData.map(product => product.product?.title) } 
        });
      }

      // Insert seed products
      const createdProducts = await Product.insertMany(productData);
      console.log(chalk.green(`   ✅ Created ${createdProducts.length} products`));
      
      // Log created products
      createdProducts.forEach((product: any) => {
        console.log(chalk.gray(`      - ${product.product.title} ($${product.price})`));
      });

    } catch (error) {
      console.error(chalk.red('Error seeding products:'), error);
      throw error;
    }
  }

  private async showSummary(): Promise<void> {
    try {
      console.log(chalk.blue('\n📊 Database Summary:'));
      
      const userCount = await User.countDocuments();
      const adminCount = await User.countDocuments({ role: 'admin' });
      const branchCount = await User.countDocuments({ role: 'main_brunch' });
      const regularUserCount = await User.countDocuments({ role: 'user' });
      
      const productCount = await Product.countDocuments();
      const inStockCount = await Product.countDocuments({ in_stock: true });
      const electronicsCount = await Product.countDocuments({ category: 'electronics' });

      console.log(chalk.gray(`   Total Users: ${userCount}`));
      console.log(chalk.gray(`   Admins: ${adminCount}`));
      console.log(chalk.gray(`   Branch Managers: ${branchCount}`));
      console.log(chalk.gray(`   Regular Users: ${regularUserCount}`));
      
      console.log(chalk.gray(`   Total Products: ${productCount}`));
      console.log(chalk.gray(`   In Stock: ${inStockCount}`));
      console.log(chalk.gray(`   Electronics: ${electronicsCount}`));

      // Show login credentials for testing
      console.log(chalk.blue('\n🔑 Test Login Credentials:'));
      console.log(chalk.gray('   Admin: admin@company.com / admin123'));
      console.log(chalk.gray('   Branch: branch.manager@company.com / branch123'));
      console.log(chalk.gray('   User: john.doe@example.com / password123'));

    } catch (error) {
      console.error(chalk.red('Error generating summary:'), error);
    }
  }
}

// Run seeder if called directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.run();
}

export default DatabaseSeeder;