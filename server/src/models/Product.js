// Product Model Schema - Mongoose schema for product inventory management
const mongoose = require("mongoose");

// Product Schema Definition - Comprehensive product data structure
const productSchema = new mongoose.Schema({

    // Product Core Information
    product: {
        title: {
            type: String,
            required: true,
        },
        subtitle: {
            type: String,
            required: false,
        },
        description: {
            type: String,
            required: true,
        }
    },
    
    // Supplier Information
    supplier: {
        type: String,
        required: true
    },
    
    // Category Classification
    category: {
        type: String,
        required: true
        // Note: Removed unique constraint - multiple products can share categories
    },
    
    // Dual Image System: Supports both file uploads and external URLs
    image: {
        // File Upload Fields (when imageType = 'upload')
        filename: {
            type: String,
            required: false // Optional - used for uploaded files only
        },
        originalName: {
            type: String,  
            required: false // Original filename from client
        },
        path: {
            type: String,
            required: false // Local file system path for uploaded files
        },
        mimetype: {
            type: String,
            required: false // MIME type: image/jpeg, image/png, etc.
        },
        size: {
            type: Number,
            required: false // File size in bytes for uploaded files
        },
        
        // External URL Field (when imageType = 'url')
        url: {
            type: String,
            required: false // Optional - for external image links
        },
        // Common fields for both options
        alt: {
            type: String,
            default: "Product image"
        },
        imageType: {
            type: String,
            enum: ['upload', 'url'], // Specify which type of image this is
            required: false
        },
        // Security validation fields for uploaded files
        securityValidated: {
            type: Boolean,
            default: false // True if file passed security validation
        },
        validationTimestamp: {
            type: Date,
            required: false // When security validation was performed
        }
    },
    branch_address: {
        state: {
            type: String
        },
        country: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        houseNumber: {
            type: Number,
            required: true
        },
        zip: {
            type: Number,
            required: true
        }
    },
    quantity: {
        type: Number, // Changed from Boolean to Number for actual quantity
        required: true,
        default: 0,
        min: 0
    },
    // Track which user/branch created this product
    createdBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users', // Reference to User model
            required: true
        },
        username: {
            type: String,
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'main_brunch', 'user'],
            required: true
        },
        branchName: {
            type: String,
            required: false,
            default: 'Main Branch'
        }
    },
}, {
    timestamps: true // add createdAt and updatedAt fields
});


const Product = mongoose.model("products", productSchema);
module.exports = Product;
