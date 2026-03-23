require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const chalk = require("chalk");

// Import models using current paths
const User = require("./src/models/User");
const Product = require("./src/models/Product");

/**
 * Seed data for the inventory system.
 * This script will:
 * 1. Wipe existing Users and Products
 * 2. Create an Admin, a Main Branch, and a Child Branch
 * 3. Create sample Products linked to the Main Branch
 */
async function seedDatabase() {
    try {
        console.log(chalk.blue("Starting inventory system seed operation..."));

        // 1. Clean existing data
        await User.deleteMany({});
        await Product.deleteMany({});
        console.log(chalk.yellow("Cleared existing Users and Products."));

        // 2. Hash sensitive passwords
        const salt = await bcrypt.genSalt(10);
        const adminPass = await bcrypt.hash("Admin123!", salt);
        const mainPass = await bcrypt.hash("Business123!", salt);
        const userPass = await bcrypt.hash("User123!", salt);

        // 3. Create Admin
        const admin = new User({
            name: { first: "Admin", last: "System" },
            phone: "0529999999",
            email: "admin@admin.com",
            password: adminPass,
            address: { country: "Israel", city: "Tel Aviv", street: "Main St", houseNumber: 1, zip: 12345 },
            isMainBrunch: true,
            isAdmin: true
        });
        await admin.save();
        console.log(chalk.green("   Created Admin User (admin@admin.com / Admin123!)"));

        // 4. Create Main Branch
        const mainBranch = new User({
            name: { first: "Main", last: "Warehouse" },
            phone: "0521111111",
            email: "main@branch.com",
            password: mainPass,
            address: { country: "Israel", city: "Netanya", street: "Logistics Way", houseNumber: 50, zip: 54321 },
            isMainBrunch: true,
            isAdmin: false,
            brunches: [] 
        });
        // Important: main branches should include their own ID for some lookups
        mainBranch.brunches = [mainBranch._id];
        await mainBranch.save();
        console.log(chalk.green("   Created Main Branch Manager (main@branch.com / Business123!)"));

        // 5. Create Child Branch
        const childBranch = new User({
            name: { first: "North", last: "Store" },
            phone: "0522222222",
            email: "north@branch.com",
            password: userPass,
            address: { country: "Israel", city: "Haifa", street: "Mountain Rd", houseNumber: 12, zip: 99887 },
            isMainBrunch: false,
            isAdmin: false
        });
        await childBranch.save();
        
        // Link child to main
        mainBranch.brunches.push(childBranch._id);
        await mainBranch.save();
        console.log(chalk.green("   Created Child Branch (north@branch.com / User123!) and linked to Main."));

        // 6. Create Products
        const productsData = [
            {
                product: { title: "Laptop Pro 14", subtitle: "Latest Generation", description: "High performance laptop for developers." },
                supplier: "TechCorp",
                category: "Electronics",
                image: { url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500", imageType: "url", alt: "Laptop image" },
                branch_address: { country: "Israel", city: "Netanya", street: "Warehouse", houseNumber: 1, zip: 12345 },
                quantity: { current_quantity: 50, critical_quantity: 10, target_quantity: 100 },
                user_id: mainBranch._id
            },
            {
                product: { title: "Ergonomic Chair", subtitle: "Office Essentials", description: "Comfortable seating for long work hours." },
                supplier: "HomeStyle",
                category: "Furniture",
                image: { url: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=500", imageType: "url", alt: "Chair image" },
                branch_address: { country: "Israel", city: "Netanya", street: "Warehouse", houseNumber: 1, zip: 12345 },
                quantity: { current_quantity: 20, critical_quantity: 5, target_quantity: 40 },
                user_id: mainBranch._id
            }
        ];

        await Product.insertMany(productsData);
        console.log(chalk.green(`   Inserted ${productsData.length} sample products.`));

        console.log(chalk.blue.bold("\nInventory system successfully seeded!"));
        return { success: true, message: "Inventory system seeded successfully" };

    } catch (error) {
        console.error(chalk.red("Seeding failed:"), error);
        return { success: false, message: error.message };
    }
}

// Support both CLI running and Module importing
if (require.main === module) {
    const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/inventory_system";
    mongoose.connect(mongoURI)
        .then(() => seedDatabase())
        .then(() => process.exit(0))
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = seedDatabase;
