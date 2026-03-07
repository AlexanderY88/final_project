const mongoose = require("mongoose");

// Model for tracking product quantity changes over time
const productQuantityHistorySchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'products',
        required: true
    },
    // Product basic info for faster queries (denormalized data)
    productInfo: {
        title: {
            type: String,
            required: true
        },
        category: {
            type: String,
            required: true
        },
        supplier: {
            type: String,
            required: true
        }
    },
    // Quantity change details
    previousQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    newQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    quantityChange: {
        type: Number,
        required: true // Can be negative (decrease) or positive (increase)
    },
    // Change metadata
    changeType: {
        type: String,
        enum: ['manual_update', 'initial_creation', 'bulk_update', 'sale', 'restock'],
        required: true,
        default: 'manual_update'
    },
    // Branch/User who made the change
    changedBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
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
    // Time-based aggregation fields for easier querying
    aggregationFields: {
        year: {
            type: Number,
            required: true
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        day: {
            type: Number,
            required: true,
            min: 1,
            max: 31
        },
        yearMonth: {
            type: String, // Format: "2026-03"
            required: true
        }
    },
    // Additional metadata
    notes: {
        type: String,
        required: false,
        maxLength: 500
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Indexes for better query performance
productQuantityHistorySchema.index({ productId: 1, createdAt: -1 });
productQuantityHistorySchema.index({ 'changedBy.userId': 1, createdAt: -1 });
productQuantityHistorySchema.index({ 'aggregationFields.yearMonth': 1 });
productQuantityHistorySchema.index({ 'aggregationFields.year': 1, 'aggregationFields.month': 1 });

const ProductQuantityHistory = mongoose.model("productQuantityHistory", productQuantityHistorySchema);
module.exports = ProductQuantityHistory;