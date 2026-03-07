require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const chalk = require("chalk");

const User = require("./models/User");
const Card = require("./models/Product");

// Sample users data
const usersData = [
    {
        name: {
            first: "Avi",
            middle: "",
            last: "Bitter"
        },
        phone: "0521234567",
        email: "avi@gmail.com",
        password: "Password123!",
        image: {
            url: "https://pics.craiyon.com/2023-11-05/c2d45408dd0848a0a6366c1dd75e9e22.webp",
            alt: "Avi at the "
        },
        address: {
            state: "Merkaz",
            country: "Israel",
            city: "Tel Aviv",
            street: "Rotshild Street",
            houseNumber: 5,
            zip: 12345
        },
        isBusiness: false,
        isAdmin: false
    },
    {
        name: {
            first: "Margol",
            middle: "Noa",
            last: "Fisher"
        },
        phone: "0527654321",
        email: "Margol@business.com",
        password: "Business123!",
        image: {
            url: "https://media.craiyon.com/2025-10-04/GaiyJ_ocSYOuvlMDf6Jr9Q.webp",
            alt: "Margol at the forest"
        },
        address: {
            state: "Ha Tzafon",
            country: "Israel",
            city: "Haifa",
            street: "Hertzl Street",
            houseNumber: 90,
            zip: 10001
        },
        isBusiness: true,
        isAdmin: false
    },
    {
        name: {
            first: "Admin",
            middle: "",
            last: "User"
        },
        phone: "0529999999",
        email: "admin@admin.com",
        password: "Admin123!",
        image: {
            url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            alt: "Admin user profile picture"
        },
        address: {
            state: "Ha Darom",
            country: "Israel",
            city: "Beer-Sheva",
            street: "Admin Avenue",
            houseNumber: 789,
            zip: 73301
        },
        isBusiness: true,
        isAdmin: true
    }
];

// Sample cards data (will be updated with actual user IDs after user creation)
const cardsData = [
    {
        title: "Tech Solutions Pro",
        subtitle: "Professional IT Services",
        description: "We provide comprehensive IT solutions for businesses of all sizes. From web development to cloud services.",
        phone: "0527654321",
        email: "Margol@business.com",
        web: "https://margolBusiness.com",
        image: {
            url: "https://media.craiyon.com/2025-09-25/WUnPDqp5TAe0ggEFAj1X2A.webp",
            alt: "Tech Solutions Pro office"
        },
        address: {
            state: "Merkaz",
            country: "Israel",
            city: "Tel Aviv",
            street: "Moshe Dayan",
            houseNumber: 83,
            zip: 10001
        },
        bizNumber: 1000001,
        user_id: "", // Will be filled with actual user ID
        likes: []
    },
    {
        title: "Creative Design Studio",
        subtitle: "Graphic Design & Branding",
        description: "Award-winning design studio specializing in brand identity, web design, and marketing materials.",
        phone: "0529999999",
        email: "admin@admin.com",
        web: "https://creativedesignstudio.com",
        image: {
            url: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=400",
            alt: "Creative Design Studio workspace"
        },
        address: {
            state: "Ha Darom",
            country: "Israel",
            city: "Arad",
            street: "Admin street",
            houseNumber: 6,
            zip: 73301
        },
        bizNumber: 1000002,
        user_id: "", // Will be filled with actual user ID
        likes: []
    },
    {
        title: "Digital Marketing Hub",
        subtitle: "Online Marketing Solutions",
        description: "Full-service digital marketing agency helping businesses grow their online presence through SEO, social media, and PPC advertising.",
        phone: "0521111111",
        email: "info@digitalmarketinghub.com",
        web: "https://digitalmarketinghub.com",
        image: {
            url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
            alt: "Digital Marketing Hub team"
        },
        address: {
            state: "Ha Tzafon",
            country: "Israel",
            city: "Nesher",
            street: "First street",
            houseNumber: 8,
            zip: 33101
        },
        bizNumber: 1000003,
        user_id: "", // Will be filled with business user ID
        likes: []
    },
    {
        title: "Green Energy Solutions",
        subtitle: "Renewable Energy Consulting",
        description: "Leading renewable energy consultancy helping businesses transition to sustainable energy solutions with solar, wind, and battery storage systems.",
        phone: "0522222222",
        email: "contact@greenenergy.com",
        web: "https://greenenergysolutions.com",
        image: {
            url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400",
            alt: "Solar panels and green energy"
        },
        address: {
            state: "Colorado",
            country: "USA",
            city: "Denver",
            street: "Green Street",
            houseNumber: 555,
            zip: 80202
        },
        bizNumber: 1000004,
        user_id: "", // Will be filled with business user ID
        likes: []
    },
    {
        title: "Gourmet Catering Co.",
        subtitle: "Premium Event Catering",
        description: "Luxury catering service for corporate events, weddings, and private parties. Farm-to-table ingredients and exceptional presentation.",
        phone: "0523333333",
        email: "events@gourmetcatering.com",
        web: "https://gourmetcatering.com",
        image: {
            url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400",
            alt: "Gourmet catering food presentation"
        },
        address: {
            state: "Nevada",
            country: "USA",
            city: "Las Vegas",
            street: "Culinary Boulevard",
            houseNumber: 888,
            zip: 89101
        },
        bizNumber: 1000005,
        user_id: "", // Will be filled with admin user ID
        likes: []
    }
];

// Seed function
// Simple seed function - just check data and create if needed
async function seedDatabase() {
    try {
        console.log(chalk.blue("Checking database for test data..."));

        // Check if data already exists
        const existingUsers = await User.countDocuments();
        if (existingUsers > 0) {
            console.log(chalk.yellow(`Database already contains ${existingUsers} users - skipping seed operation`));
            return { success: true, message: "Database already seeded", skipped: true };
        }

        // Database is empty - create test data
        console.log(chalk.blue("Database is empty - creating test data..."));

        // Create users with hashed passwords
        console.log(chalk.yellow("Creating users..."));
        const createdUsers = [];
        
        for (let userData of usersData) {
            const salt = await bcrypt.genSalt(10);
            userData.password = await bcrypt.hash(userData.password, salt);
            const user = new User(userData);
            const savedUser = await user.save();
            createdUsers.push(savedUser);
            console.log(chalk.cyan(`   Created user: ${userData.name.first} ${userData.name.last} (${userData.email})`));
        }

        // Update cards with actual user IDs
        console.log(chalk.yellow("Creating business cards..."));
        
        // Assign cards to users (business and admin users get cards)
        const businessUser = createdUsers.find(user => user.isBusiness && !user.isAdmin);
        const adminUser = createdUsers.find(user => user.isAdmin);
        
        // Update card user_ids
        cardsData[0].user_id = businessUser._id.toString(); // Sarah's card
        cardsData[1].user_id = adminUser._id.toString();    // Admin's card
        cardsData[2].user_id = businessUser._id.toString(); // Additional card for Sarah
        cardsData[3].user_id = businessUser._id.toString(); // Another card for Sarah
        cardsData[4].user_id = adminUser._id.toString();    // Additional card for Admin

        // Create cards
        const createdCards = [];
        for (let cardData of cardsData) {
            const card = new Card(cardData);
            const savedCard = await card.save();
            createdCards.push(savedCard);
            console.log(chalk.cyan(`   Created card: ${cardData.title}`));
        }

        console.log(chalk.green("\nDatabase seeding completed successfully!"));
        console.log(chalk.blue("\nSeeding Summary:"));
        console.log(chalk.white(`   • Users created: ${createdUsers.length}`));
        console.log(chalk.white(`   • Cards created: ${createdCards.length}`));
        
        console.log(chalk.blue("\nTest Users Created:"));
        console.log(chalk.white("   Regular User:"));
        console.log(chalk.gray("      Email: avi@gmail.com"));
        console.log(chalk.gray("      Password: Password123!"));
        
        console.log(chalk.white("   Business User:"));
        console.log(chalk.gray("      Email: Margol@business.com"));
        console.log(chalk.gray("      Password: Business123!"));
        
        console.log(chalk.white("   Admin User:"));
        console.log(chalk.gray("      Email: admin@admin.com"));
        console.log(chalk.gray("      Password: Admin123!"));

        console.log(chalk.yellow("\nYou can now start your server with: npm start"));
        
        return { success: true, message: "Database seeded successfully", skipped: false };
        
    } catch (error) {
        console.error(chalk.red("Seeding failed:"), error);
        return { success: false, message: error.message, skipped: false };
    }
}

// Export the function so it can be used by server.js
module.exports = seedDatabase;