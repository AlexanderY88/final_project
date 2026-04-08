const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const chalk = require("chalk");
const path = require("path");

// Load environment file similarly to the main server startup.
const envFile = process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

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
        if (process.env.NODE_ENV !== "development") {
            console.log(chalk.yellow("Skipping seed: only runs in development environment."));
            return { success: true, message: "Seed skipped outside development" };
        }

        console.log(chalk.blue("Starting inventory system seed operation..."));

        // 2. Hash sensitive passwords
        const salt = await bcrypt.genSalt(10);
        const defaultUsers = [
            {
                key: "admin",
                name: { first: "Admin", last: "System" },
                phone: "0529999999",
                email: "admin@admin.com",
                plainPassword: "Admin123!",
                address: { country: "Israel", city: "Tel Aviv", street: "Main St", houseNumber: 1, zip: 12345 },
                isMainBrunch: true,
                isAdmin: true
            },
            {
                key: "main",
                name: { first: "Main", last: "Warehouse" },
                phone: "0521111111",
                email: "main@branch.com",
                plainPassword: "Business123!",
                address: { country: "Israel", city: "Netanya", street: "Logistics Way", houseNumber: 50, zip: 54321 },
                isMainBrunch: true,
                isAdmin: false
            },
            {
                key: "child",
                name: { first: "North", last: "Store" },
                phone: "0522222222",
                email: "north@branch.com",
                plainPassword: "User123!",
                address: { country: "Israel", city: "Haifa", street: "Mountain Rd", houseNumber: 12, zip: 99887 },
                isMainBrunch: false,
                isAdmin: false
            }
        ];

        const usersByKey = {};

        // 3. Create missing users only (idempotent)
        for (const userSpec of defaultUsers) {
            const existing = await User.findOne({ email: userSpec.email });
            if (existing) {
                usersByKey[userSpec.key] = existing;
                console.log(chalk.blue(`   User exists, skipping: ${userSpec.email}`));
                continue;
            }

            const hashedPassword = await bcrypt.hash(userSpec.plainPassword, salt);
            const createdUser = new User({
                name: userSpec.name,
                phone: userSpec.phone,
                email: userSpec.email,
                password: hashedPassword,
                address: userSpec.address,
                isMainBrunch: userSpec.isMainBrunch,
                isAdmin: userSpec.isAdmin,
                brunches: userSpec.isMainBrunch ? [] : undefined
            });

            await createdUser.save();
            usersByKey[userSpec.key] = createdUser;
            console.log(chalk.green(`   Created user: ${userSpec.email}`));
        }

        const mainBranch = usersByKey.main || await User.findOne({ email: "main@branch.com" });
        const childBranch = usersByKey.child || await User.findOne({ email: "north@branch.com" });

        // 4. Ensure main branch links include self + child
        if (mainBranch) {
            const branchIds = (mainBranch.brunches || []).map((id) => id.toString());
            let changed = false;

            if (!branchIds.includes(mainBranch._id.toString())) {
                mainBranch.brunches = [...(mainBranch.brunches || []), mainBranch._id];
                changed = true;
            }

            if (childBranch && !branchIds.includes(childBranch._id.toString())) {
                mainBranch.brunches = [...(mainBranch.brunches || []), childBranch._id];
                changed = true;
            }

            if (changed) {
                await mainBranch.save();
                console.log(chalk.green("   Updated branch links for main branch."));
            }
        }

        // 5. Create sample products only if missing
        if (!mainBranch) {
            console.log(chalk.yellow("   Main branch user not found, skipping product seeding."));
        } else {
            const creatorRole = mainBranch.isAdmin ? "admin" : (mainBranch.isMainBrunch ? "main_brunch" : "user");
            const creatorName = `${mainBranch.name?.first || "Main"} ${mainBranch.name?.last || "Branch"}`.trim();

            const productsData = [
                {
                    product: { title: "Laptop Pro 14", subtitle: "Latest Generation", description: "High performance laptop for developers." },
                    supplier: "TechCorp",
                    category: "Electronics",
                    image: { url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500", imageType: "url", alt: "Laptop image" },
                    quantity: 50,
                    createdBy: {
                        userId: mainBranch._id,
                        username: creatorName,
                        role: creatorRole,
                        branchName: "Main Branch"
                    }
                },
                {
                    product: { title: "Ergonomic Chair", subtitle: "Office Essentials", description: "Comfortable seating for long work hours." },
                    supplier: "HomeStyle",
                    category: "Furniture",
                    image: { url: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=500", imageType: "url", alt: "Chair image" },
                    quantity: 20,
                    createdBy: {
                        userId: mainBranch._id,
                        username: creatorName,
                        role: creatorRole,
                        branchName: "Main Branch"
                    }
                }
            ];

            let addedProducts = 0;

            for (const productData of productsData) {
                const exists = await Product.findOne({
                    "product.title": productData.product.title,
                    "createdBy.userId": mainBranch._id
                });

                if (exists) {
                    console.log(chalk.blue(`   Product exists, skipping: ${productData.product.title}`));
                    continue;
                }

                await Product.create(productData);
                addedProducts += 1;
                console.log(chalk.green(`   Added product: ${productData.product.title}`));
            }

            if (addedProducts > 0) {
                console.log(chalk.green(`   Inserted ${addedProducts} sample products.`));
            }
        }

        console.log(chalk.blue.bold("\nInventory system successfully seeded!"));
        return { success: true, message: "Inventory system seeded successfully" };

    } catch (error) {
        console.error(chalk.red("Seeding failed:"), error);
        return { success: false, message: error.message };
    }
}

// Support both CLI running and Module importing
if (require.main === module) {
    const mongoURI = process.env.MONGODB_URI
        || process.env.MONGODB_URI_LOCAL
        || process.env.MONGO_URI
        || "mongodb://127.0.0.1:27017/the_storage";

    console.log(chalk.blue(`Connecting seed script to: ${mongoURI}`));

    mongoose.connect(mongoURI)
        .then(async () => {
            const result = await seedDatabase();
            await mongoose.disconnect();
            process.exit(result.success ? 0 : 1);
        })
        .catch(err => {
            console.error(err);
            process.exit(1);
        });
}

module.exports = seedDatabase;
