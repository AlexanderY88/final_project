/**
 * Database Seed File
 * Creates comprehensive test data for development and testing environments
 * 
 * Data Structure:
 * - 1 Admin user
 * - 3 Main branch managers:
 *   • Main 1: No children, 5 products
 *   • Main 2: 2 children, 5+5+5=15 products total  
 *   • Main 3: 3 children, 5×3=15 products total
 * - 5 Child branch users total
 * - 35 Products total with realistic categories and suppliers
 * 
 * Usage: npm run seed
 */

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
// Support both development and production environments
const envFile = process.env.NODE_ENV === 'production' 
    ? path.resolve(process.cwd(), '.env.production')
    : path.resolve(process.cwd(), '.env.development');

dotenv.config({ path: envFile });

// If specific env file doesn't exist, try default .env
if (!process.env.MONGODB_URI && !process.env.MONGODB_URI_LOCAL) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

// Now require models and config
const User = require('../models/User');
const Product = require('../models/Product');

// Sample categories for realistic product distribution
const CATEGORIES = [
    'Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports',
    'Toys', 'Beauty', 'Food & Beverage', 'Automotive', 'Health'
];

// Sample suppliers for variety
const SUPPLIERS = [
    'TechCorp Ltd', 'Fashion Forward Inc', 'BookWorld Publishing', 'Garden Paradise',
    'SportZone', 'ToyLand Manufacturing', 'Beauty Essentials', 'Fresh Foods Co',
    'AutoParts Express', 'HealthFirst Suppliers', 'Global Trading Co', 'Premium Goods Inc'
];

// Israeli cities for realistic addresses
const CITIES = [
    { city: 'Tel Aviv', state: 'Tel Aviv District' },
    { city: 'Jerusalem', state: 'Jerusalem District' },
    { city: 'Haifa', state: 'Haifa District' },
    { city: 'Rishon LeZion', state: 'Central District' },
    { city: 'Petah Tikva', state: 'Central District' },
    { city: 'Ashdod', state: 'Southern District' },
    { city: 'Netanya', state: 'Central District' },
    { city: 'Beersheva', state: 'Southern District' }
];

/**
 * Generate realistic product data
 */
function generateProduct(title, category, supplier, createdBy, branchLocation) {
    const randomCity = CITIES[Math.floor(Math.random() * CITIES.length)];
    
    return {
        product: {
            title: title,
            subtitle: `Premium ${category} Product`,
            description: `High-quality ${title.toLowerCase()} from ${supplier}. Perfect for professional and personal use. Manufactured with the highest standards and comes with full warranty support.`
        },
        supplier: supplier,
        category: category,
        quantity: Math.floor(Math.random() * 200) + 50, // Random quantity 50-250
        branch_address: {
            state: randomCity.state,
            country: 'Israel',
            city: randomCity.city,
            street: `${Math.floor(Math.random() * 50) + 1} ${randomCity.city} Street`,
            houseNumber: Math.floor(Math.random() * 200) + 1,
            zip: Math.floor(Math.random() * 90000) + 10000
        },
        image: {
            url: `https://via.placeholder.com/400x300?text=${encodeURIComponent(title)}`,
            alt: `Image of ${title}`,
            imageType: 'url'
        },
        createdBy: {
            userId: createdBy._id,
            username: `${createdBy.firstName} ${createdBy.lastName}`,
            role: createdBy.role,
            branchName: branchLocation || 'Main Branch'
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

/**
 * Generate product names by category
 */
function getProductNames(category) {
    const productsByCategory = {
        'Electronics': [
            'Smart Wireless Headphones', 'Professional Laptop Stand', 'USB-C Hub Station', 
            'Bluetooth Mechanical Keyboard', 'HD Webcam Pro'
        ],
        'Clothing': [
            'Premium Cotton T-Shirt', 'Designer Denim Jacket', 'Professional Blazer', 
            'Comfortable Running Shoes', 'Luxury Silk Scarf'
        ],
        'Books': [
            'Complete Programming Guide', 'Business Strategy Handbook', 'Creative Writing Masterclass',
            'History of Modern Art', 'Science Fiction Collection'
        ],
        'Home & Garden': [
            'Smart LED Light Bulbs', 'Ergonomic Office Chair', 'Indoor Plant Collection',
            'Kitchen Appliance Set', 'Decorative Wall Art'
        ],
        'Sports': [
            'Professional Tennis Racket', 'Fitness Tracker Watch', 'Yoga Mat Premium',
            'Basketball Official Size', 'Swimming Goggles Pro'
        ],
        'Toys': [
            'Educational Building Blocks', 'Remote Control Drone', 'Interactive Robot Pet',
            'Puzzle Game Collection', 'Art & Craft Kit Deluxe'
        ],
        'Beauty': [
            'Skincare Routine Set', 'Professional Makeup Brushes', 'Anti-Aging Serum',
            'Hair Care Treatment Kit', 'Luxury Perfume Collection'
        ],
        'Food & Beverage': [
            'Gourmet Coffee Beans', 'Organic Honey Set', 'Premium Tea Collection',
            'Artisan Chocolate Box', 'Healthy Snack Variety Pack'
        ],
        'Automotive': [
            'Car Phone Mount Pro', 'Dashboard Camera HD', 'Tire Pressure Monitor',
            'Car Cleaning Kit Complete', 'Emergency Toolkit'
        ],
        'Health': [
            'Digital Blood Pressure Monitor', 'Vitamin D3 Supplements', 'First Aid Kit Complete',
            'Fitness Resistance Bands', 'Sleep Quality Tracker'
        ]
    };
    
    return productsByCategory[category] || ['Generic Product 1', 'Generic Product 2', 'Generic Product 3', 'Generic Product 4', 'Generic Product 5'];
}

/**
 * Helper function to create complete address object
 */
function createAddress(city, street, houseNumber, zip) {
    return {
        city,
        country: 'Israel',
        street,
        houseNumber,
        zip
    };
}

/**
 * Connect to MongoDB for seeding
 */
async function connectForSeeding() {
    const isProduction = process.env.NODE_ENV === 'production';
    const mongoURI = isProduction 
        ? process.env.MONGODB_URI 
        : (process.env.MONGODB_URI_LOCAL || 'mongodb://localhost:27017/the_storage');
    
    if (!mongoURI) {
        throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(mongoURI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
    
    console.log(`✅ Connected to MongoDB: ${mongoose.connection.db?.databaseName}`);
}

/**
 * Main seeding function
 */
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Connect to database
        await connectForSeeding();
        
        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Product.deleteMany({});
        
        // Hash password for all users
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123!', salt);
        
        console.log('👤 Creating users...');
        
        // 1. Create Admin User
        const admin = new User({
            name: {
                first: 'Alexander',
                last: 'Admin'
            },
            phone: '+972-50-1234567',
            email: 'admin@company.com',
            password: hashedPassword,
            address: {
                city: 'Tel Aviv',
                country: 'Israel',
                street: 'Rothschild Blvd',
                houseNumber: 1,
                zip: 12345
            },
            role: 'admin',
            createdAt: new Date()
        });
        await admin.save();
        console.log('✅ Admin created: admin@company.com');
        
        // 2. Create Main Branch 1 (No children)
        const mainBranch1 = new User({
            name: {
                first: 'David',
                last: 'Cohen'
            },
            phone: '+972-52-1234567',
            email: 'main1@company.com',
            password: hashedPassword,
            address: createAddress('Tel Aviv', 'Ben Yehuda St', 12, 65432),
            role: 'main_brunch',
            branchName: 'Tel Aviv Main Branch',
            createdAt: new Date()
        });
        await mainBranch1.save();
        console.log('✅ Main Branch 1 created: main1@company.com (Tel Aviv)');
        
        // 3. Create Main Branch 2 (2 children)
        const mainBranch2 = new User({
            name: {
                first: 'Sarah',
                last: 'Levi'
            },
            phone: '+972-53-1234567',
            email: 'main2@company.com',
            password: hashedPassword,
            address: createAddress('Jerusalem', 'King George St', 15, 91234),
            role: 'main_brunch',
            branchName: 'Jerusalem Main Branch',
            createdAt: new Date()
        });
        await mainBranch2.save();
        console.log('✅ Main Branch 2 created: main2@company.com (Jerusalem)');
        
        // 4. Create Main Branch 3 (3 children)
        const mainBranch3 = new User({
            name: {
                first: 'Michael',
                last: 'Goldberg'
            },
            phone: '+972-54-1234567',
            email: 'main3@company.com',
            password: hashedPassword,
            address: createAddress('Haifa', 'Carmel Ave', 25, 34567),
            role: 'main_brunch',
            branchName: 'Haifa Main Branch',
            createdAt: new Date()
        });
        await mainBranch3.save();
        console.log('✅ Main Branch 3 created: main3@company.com (Haifa)');
        
        // 5. Create Child Branches for Main Branch 2 (2 children)
        const childBranch2_1 = new User({
            name: {
                first: 'Rachel',
                last: 'Stern'
            },
            phone: '+972-55-1234567',
            email: 'child2_1@company.com',
            password: hashedPassword,
            address: createAddress('Jerusalem', 'Hillel St', 20, 91567),
            role: 'user',
            branchName: 'Jerusalem Branch A',
            createdAt: new Date()
        });
        await childBranch2_1.save();
        
        const childBranch2_2 = new User({
            name: {
                first: 'Amit',
                last: 'Rosen'
            },
            phone: '+972-56-1234567',
            email: 'child2_2@company.com',
            password: hashedPassword,
            address: createAddress('Jerusalem', 'Jaffa Rd', 30, 91890),
            role: 'user',
            branchName: 'Jerusalem Branch B',
            createdAt: new Date()
        });
        await childBranch2_2.save();
        console.log('✅ Jerusalem child branches created (2 users)');
        
        // 6. Create Child Branches for Main Branch 3 (3 children)
        const childBranch3_1 = new User({
            name: {
                first: 'Yael',
                last: 'Katz'
            },
            phone: '+972-57-1234567',
            email: 'child3_1@company.com',
            password: hashedPassword,
            address: createAddress('Haifa', 'Herzl St', 40, 35123),
            role: 'user',
            branchName: 'Haifa Branch A',
            createdAt: new Date()
        });
        await childBranch3_1.save();
        
        const childBranch3_2 = new User({
            name: {
                first: 'Oren',
                last: 'Shapiro'
            },
            phone: '+972-58-1234567',
            email: 'child3_2@company.com',
            password: hashedPassword,
            address: createAddress('Haifa', 'Palmach St', 50, 35456),
            role: 'user',
            branchName: 'Haifa Branch B',
            createdAt: new Date()
        });
        await childBranch3_2.save();
        
        const childBranch3_3 = new User({
            name: {
                first: 'Noa',
                last: 'Avraham'
            },
            phone: '+972-59-1234567',
            email: 'child3_3@company.com',
            password: hashedPassword,
            address: createAddress('Haifa', 'Balfour St', 60, 35789),
            role: 'user',
            branchName: 'Haifa Branch C',
            createdAt: new Date()
        });
        await childBranch3_3.save();
        console.log('✅ Haifa child branches created (3 users)');
        
        console.log('🛍️  Creating products...');
        
        // 7. Create Products for Main Branch 1 (5 products)
        console.log('📦 Creating products for Tel Aviv Main Branch...');
        for (let i = 0; i < 5; i++) {
            const category = CATEGORIES[i % CATEGORIES.length];
            const supplier = SUPPLIERS[i % SUPPLIERS.length];
            const productNames = getProductNames(category);
            const productName = productNames[i % productNames.length];
            
            const product = new Product(generateProduct(
                productName,
                category,
                supplier,
                mainBranch1,
                'Tel Aviv Main Branch'
            ));
            await product.save();
        }
        
        // 8. Create Products for Main Branch 2 and its children (15 products total)
        console.log('📦 Creating products for Jerusalem branches...');
        
        // Main Branch 2 products (5)
        for (let i = 0; i < 5; i++) {
            const category = CATEGORIES[(i + 5) % CATEGORIES.length];
            const supplier = SUPPLIERS[(i + 5) % SUPPLIERS.length];
            const productNames = getProductNames(category);
            const productName = productNames[i % productNames.length];
            
            const product = new Product(generateProduct(
                productName,
                category,
                supplier,
                mainBranch2,
                'Jerusalem Main Branch'
            ));
            await product.save();
        }
        
        // Child Branch 2_1 products (5)
        for (let i = 0; i < 5; i++) {
            const category = CATEGORIES[(i + 2) % CATEGORIES.length];
            const supplier = SUPPLIERS[(i + 2) % SUPPLIERS.length];
            const productNames = getProductNames(category);
            const productName = productNames[(i + 1) % productNames.length];
            
            const product = new Product(generateProduct(
                productName,
                category,
                supplier,
                childBranch2_1,
                'Jerusalem Branch A'
            ));
            await product.save();
        }
        
        // Child Branch 2_2 products (5)
        for (let i = 0; i < 5; i++) {
            const category = CATEGORIES[(i + 3) % CATEGORIES.length];
            const supplier = SUPPLIERS[(i + 3) % SUPPLIERS.length];
            const productNames = getProductNames(category);
            const productName = productNames[(i + 2) % productNames.length];
            
            const product = new Product(generateProduct(
                productName,
                category,
                supplier,
                childBranch2_2,
                'Jerusalem Branch B'
            ));
            await product.save();
        }
        
        // 9. Create Products for Main Branch 3 children (15 products total)
        console.log('📦 Creating products for Haifa branches...');
        
        // Child Branch 3_1 products (5)
        for (let i = 0; i < 5; i++) {
            const category = CATEGORIES[(i + 1) % CATEGORIES.length];
            const supplier = SUPPLIERS[(i + 1) % SUPPLIERS.length];
            const productNames = getProductNames(category);
            const productName = productNames[(i + 3) % productNames.length];
            
            const product = new Product(generateProduct(
                productName,
                category,
                supplier,
                childBranch3_1,
                'Haifa Branch A'
            ));
            await product.save();
        }
        
        // Child Branch 3_2 products (5)
        for (let i = 0; i < 5; i++) {
            const category = CATEGORIES[(i + 4) % CATEGORIES.length];
            const supplier = SUPPLIERS[(i + 4) % SUPPLIERS.length];
            const productNames = getProductNames(category);
            const productName = productNames[(i + 4) % productNames.length];
            
            const product = new Product(generateProduct(
                productName,
                category,
                supplier,
                childBranch3_2,
                'Haifa Branch B'
            ));
            await product.save();
        }
        
        // Child Branch 3_3 products (5)
        for (let i = 0; i < 5; i++) {
            const category = CATEGORIES[(i + 6) % CATEGORIES.length];
            const supplier = SUPPLIERS[(i + 6) % SUPPLIERS.length];
            const productNames = getProductNames(category);
            const productName = productNames[i % productNames.length];
            
            const product = new Product(generateProduct(
                productName,
                category,
                supplier,
                childBranch3_3,
                'Haifa Branch C'
            ));
            await product.save();
        }
        
        // Final counts
        const userCount = await User.countDocuments();
        const productCount = await Product.countDocuments();
        
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📊 SEEDING SUMMARY:');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`👥 Users created: ${userCount}`);
        console.log('   • 1 Admin');
        console.log('   • 3 Main Branch Managers');
        console.log('   • 5 Child Branch Users');
        console.log('');
        console.log(`🛍️  Products created: ${productCount}`);
        console.log('   • Tel Aviv Main: 5 products');
        console.log('   • Jerusalem Main + 2 children: 15 products');
        console.log('   • Haifa 3 children: 15 products');
        console.log('');
        console.log('🔐 LOGIN CREDENTIALS (All users):');
        console.log('   Password: Password123!');
        console.log('');
        console.log('📧 USER ACCOUNTS:');
        console.log('   admin@company.com     (Admin)');
        console.log('   main1@company.com     (Tel Aviv Main)');
        console.log('   main2@company.com     (Jerusalem Main)');
        console.log('   main3@company.com     (Haifa Main)');
        console.log('   child2_1@company.com  (Jerusalem Branch A)');
        console.log('   child2_2@company.com  (Jerusalem Branch B)');
        console.log('   child3_1@company.com  (Haifa Branch A)');
        console.log('   child3_2@company.com  (Haifa Branch B)');
        console.log('   child3_3@company.com  (Haifa Branch C)');
        console.log('═══════════════════════════════════════════════════════');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run seeding
seedDatabase();