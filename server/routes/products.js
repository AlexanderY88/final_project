// Product Management Routes - CRUD operations with security
const express = require('express');
const joi = require('joi');
const Product = require('../src/models/Product');
const { uploadWithSecurity } = require('../src/middleware/fileUpload');
const authMiddleware = require('../src/middleware/auth');
const { recordQuantityChange } = require('../src/utils/quantityHistory');
const { logProductOperation, logQuantityChange } = require('../src/middleware/logging');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Joi Schema for Product Validation
const checkProductBody = joi.object({
    title: joi.string().required().min(2).max(100),
    subtitle: joi.string().optional().max(200),
    description: joi.string().required().min(10).max(1000),
    supplier: joi.string().required().min(2).max(100),
    category: joi.string().required().min(2).max(50),
    quantity: joi.number().integer().min(0).default(0),
    // Address fields
    state: joi.string().optional().max(50),
    country: joi.string().required().min(2).max(50),
    city: joi.string().required().min(2).max(50),
    street: joi.string().required().min(2).max(100),
    houseNumber: joi.number().integer().required().min(1),
    zip: joi.number().integer().required().min(10000).max(99999),
    // Image options - either URL or file upload
    imageUrl: joi.string().uri().optional(), // External image URL
    imageAlt: joi.string().optional().max(200),
    imageType: joi.string().valid('upload', 'url').optional() // Specify image type
});

// Create Product Route - POST /api/products/create
router.post('/create', authMiddleware, logProductOperation('create'), uploadWithSecurity, async (req, res) => {
    try {
        // File upload and security validation already handled by uploadWithSecurity middleware
        console.log('🛡️  File upload and security validation completed');
        
        const currentUser = req.user;
        
        // Role-based access control: admin, main_brunch, and child branches (user) can create products
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch' && currentUser.role !== 'user') {
            // Clean up uploaded file if user doesn't have permission
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(403).json({ message: "Access denied: Only admins, main branch managers, and child branches can create products" });
        }
        
        // Validate product data using Joi schema
        const { error, value } = checkProductBody.validate(req.body);
        if (error) {
            // Clean up uploaded file on validation error
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(400).json({ message: error.details[0].message });
        }
        
        // Prepare product data structure
        const productData = {
            product: {
                title: value.title,
                subtitle: value.subtitle,
                description: value.description
            },
            supplier: value.supplier,
            category: value.category,
            branch_address: {
                state: value.state,
                country: value.country,
                city: value.city,
                street: value.street,
                houseNumber: value.houseNumber,
                zip: value.zip
            },
            quantity: value.quantity
        };
        
        // Handle dual image system - either secure file upload or external URL
        if (req.file) {
            // Secure file upload provided and validated by uploadWithSecurity middleware
            console.log('🔒 Secure file upload successful:', {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                security: req.fileSecurity?.securityChecks || 'validated'
            });
            
            productData.image = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size,
                alt: value.imageAlt || `Image for ${value.title}`,
                imageType: 'upload',
                // Store security validation info for audit trail
                securityValidated: true,
                validationTimestamp: new Date()
            };
        } else if (value.imageUrl) {
            // External URL provided - no file upload needed
            productData.image = {
                url: value.imageUrl,
                alt: value.imageAlt || `Image for ${value.title}`,
                imageType: 'url'
            };
        } else if (value.imageType === 'url' && !value.imageUrl) {
            // Error: imageType is 'url' but no URL provided
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(400).json({ message: "Image URL is required when imageType is 'url'" });
        }
        
        // Add creator information
        productData.createdBy = {
            userId: currentUser._id,
            username: currentUser.firstName + ' ' + currentUser.lastName,
            role: currentUser.role,
            branchName: currentUser.firstName + "'s Branch"
        };
        
        // Create and save new product to database
        const newProduct = new Product(productData);
        await newProduct.save();
        
        // Record initial quantity in history
        try {
            await recordQuantityChange({
                productId: newProduct._id,
                productInfo: {
                    title: newProduct.product.title,
                    category: newProduct.category,
                    supplier: newProduct.supplier
                },
                previousQuantity: 0,
                newQuantity: newProduct.quantity,
                changeType: 'initial_creation',
                changedBy: {
                    userId: currentUser._id,
                    username: currentUser.firstName + ' ' + currentUser.lastName,
                    role: currentUser.role,
                    branchName: currentUser.firstName + "'s Branch"
                },
                notes: 'Initial product creation'
            });
        } catch (historyError) {
            console.error('⚠️  Failed to record quantity history:', historyError);
            // Don't fail the whole operation if history recording fails
        }
        
        res.status(201).json({
            message: "Product created successfully",
            product: newProduct,
            imageUploaded: !!(req.file || value.imageUrl),
            imageType: req.file ? 'upload' : (value.imageUrl ? 'url' : 'none'),
            securityValidation: req.fileSecurity ? 'passed' : 'not applicable'
        });
        
    } catch (error) {
        console.error('❌ Error creating product:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        
        res.status(500).json({ message: "Server error during product creation" });
    }
});

// Get all products (with pagination)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const products = await Product.find()
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });
            
        const total = await Product.countDocuments();
        
        res.status(200).json({
            products,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalProducts: total
        });
        
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        
        res.status(200).json(product);
        
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: "Server error" });
    }
});

// Update product with secure image upload - Available to: admin, main_brunch, user (child branches)
// Security features: File type validation, virus scanning, size limits, filename sanitization
router.put('/:id', authMiddleware, uploadWithSecurity, async (req, res) => {
    try {
        // File upload and security validation already handled by uploadWithSecurity middleware
        console.log('🛡️  File upload and security validation completed for update');
        
        const currentUser = req.user;
        const { id } = req.params;
        
        // Admin, main_brunch, and child branches (user) can update products
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch' && currentUser.role !== 'user') {
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(403).json({ message: "Access denied: Only admins, main branch managers, and child branches can update products" });
        }
        
        const product = await Product.findById(id);
        if (!product) {
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(404).json({ message: "Product not found" });
        }
        
        // Validate update data
        const { error, value } = checkProductBody.validate(req.body);
        if (error) {
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(400).json({ message: error.details[0].message });
        }
        
        // Prepare update data
        const updateData = {
            product: {
                title: value.title,
                subtitle: value.subtitle,
                description: value.description
            },
            supplier: value.supplier,
            category: value.category,
            branch_address: {
                state: value.state,
                country: value.country,
                city: value.city,
                street: value.street,
                houseNumber: value.houseNumber,
                zip: value.zip
            },
            quantity: value.quantity
        };
        
        // Check if quantity changed for history tracking
        const quantityChanged = product.quantity !== value.quantity;
        const previousQuantity = product.quantity;
        
        // Handle secure image update - either file upload, URL, or keep existing
        if (req.file) {
            // New secure file upload provided and validated
            console.log('🔒 Secure file upload for update successful:', {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                security: req.fileSecurity?.securityChecks || 'validated'
            });
            
            // Delete old image file if it exists (only for uploaded files)
            if (product.image && product.image.path && product.image.imageType === 'upload') {
                fs.unlink(product.image.path, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
            
            // Set new uploaded image data with security validation
            updateData.image = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                path: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size,
                alt: value.imageAlt || `Image for ${value.title}`,
                imageType: 'upload',
                // Store security validation info for audit trail
                securityValidated: true,
                validationTimestamp: new Date()
            };
        } else if (value.imageUrl) {
            // New external URL provided
            // Delete old image file if it exists (only for uploaded files)
            if (product.image && product.image.path && product.image.imageType === 'upload') {
                fs.unlink(product.image.path, (err) => {
                    if (err) console.error('Error deleting old image:', err);
                });
            }
            
            // Set new URL image data
            updateData.image = {
                url: value.imageUrl,
                alt: value.imageAlt || `Image for ${value.title}`,
                imageType: 'url'
            };
        } else if (value.imageType === 'url' && !value.imageUrl) {
            // imageType is url but no URL provided
            return res.status(400).json({ message: "Image URL is required when imageType is 'url'" });
        } else {
            // Keep existing image if no new upload or URL
            updateData.image = product.image;
            // Update alt text if provided
            if (value.imageAlt && updateData.image) {
                updateData.image.alt = value.imageAlt;
            }
        }
        
        await Product.updateOne({ _id: id }, updateData);
        const updatedProduct = await Product.findById(id);
        
        // Record quantity change in history if quantity was changed
        if (quantityChanged) {
            try {
                await recordQuantityChange({
                    productId: id,
                    productInfo: {
                        title: updatedProduct.product.title,
                        category: updatedProduct.category,
                        supplier: updatedProduct.supplier
                    },
                    previousQuantity: previousQuantity,
                    newQuantity: value.quantity,
                    changeType: 'manual_update',
                    changedBy: {
                        userId: currentUser._id,
                        username: currentUser.firstName + ' ' + currentUser.lastName,
                        role: currentUser.role,
                        branchName: currentUser.firstName + "'s Branch"
                    },
                    notes: `Product updated: quantity changed from ${previousQuantity} to ${value.quantity}`
                });
            } catch (historyError) {
                console.error('⚠️  Failed to record quantity history during update:', historyError);
            }
        }
        
        res.status(200).json({
            message: "Product updated successfully",
            product: updatedProduct,
            imageUpdated: !!(req.file || value.imageUrl),
            imageType: req.file ? 'upload' : (value.imageUrl ? 'url' : 'none'),
            securityValidation: req.fileSecurity ? 'passed' : 'not applicable'
        });
        
    } catch (error) {
        console.error('❌ Error updating product:', error);
        
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
        }
        
        res.status(500).json({ message: "Server error during product update" });
    }
});

// Delete product
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;
        
        // Admin, main_brunch, and child branches (user) can delete products
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch' && currentUser.role !== 'user') {
            return res.status(403).json({ message: "Access denied: Only admins, main branch managers, and child branches can delete products" });
        }
        
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        
        // Delete associated image file (only for uploaded files)
        if (product.image && product.image.path && product.image.imageType === 'upload') {
            fs.unlink(product.image.path, (err) => {
                if (err) console.error('Error deleting image file:', err);
            });
        }
        
        await Product.deleteOne({ _id: id });
        
        res.status(200).json({
            message: "Product deleted successfully",
            deletedProduct: {
                id: product._id,
                title: product.product.title
            }
        });
        
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: "Server error during product deletion" });
    }
});

// Update product quantity only - Available to: admin, main_brunch, user (child branches)
router.patch('/:id/quantity', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        const { id } = req.params;
        const { quantity } = req.body;
        
        // Admin, main_brunch, and child branches (user) can update quantity
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch' && currentUser.role !== 'user') {
            return res.status(403).json({ message: "Access denied: Only admins, main branch managers, and child branches can update product quantity" });
        }
        
        // Validate quantity
        if (quantity === undefined || quantity === null) {
            return res.status(400).json({ message: "Quantity is required" });
        }
        
        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({ message: "Quantity must be a non-negative integer" });
        }
        
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        
        // Store previous quantity for history tracking
        const previousQuantity = product.quantity;
        
        // Update only the quantity field
        await Product.updateOne({ _id: id }, { quantity: quantity });
        const updatedProduct = await Product.findById(id);
        
        // Record quantity change in history
        try {
            await recordQuantityChange({
                productId: id,
                productInfo: {
                    title: product.product.title,
                    category: product.category,
                    supplier: product.supplier
                },
                previousQuantity: previousQuantity,
                newQuantity: quantity,
                changeType: 'manual_update',
                changedBy: {
                    userId: currentUser._id,
                    username: currentUser.firstName + ' ' + currentUser.lastName,
                    role: currentUser.role,
                    branchName: currentUser.firstName + "'s Branch"
                },
                notes: `Quantity updated from ${previousQuantity} to ${quantity}`
            });
        } catch (historyError) {
            console.error('⚠️  Failed to record quantity history:', historyError);
        }
        
        res.status(200).json({
            message: "Product quantity updated successfully",
            product: {
                id: updatedProduct._id,
                title: updatedProduct.product.title,
                previousQuantity: product.quantity,
                newQuantity: updatedProduct.quantity
            }
        });
        
    } catch (error) {
        console.error('❌ Error updating product quantity:', error);
        res.status(500).json({ message: "Server error during quantity update" });
    }
});

// Get all child branches with their products and quantities - Available to: main_brunch only  
router.get('/branches/report', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Only main_brunch users can access this report (admin could also be allowed if needed)
        if (currentUser.role !== 'main_brunch' && currentUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Only main branch managers can view child branches report" });
        }
        
        // Import User model to find child branches
        const User = require('../src/models/User');
        
        // Find all child branch users (users with role 'user')
        const childBranches = await User.find({ isAdmin: false, isMainBrunch: false }).select('_id name email phone createdAt');
        
        if (childBranches.length === 0) {
            return res.status(200).json({
                message: "No child branches found",
                totalChildBranches: 0,
                childBranches: []
            });
        }
        
        // For each child branch, get their products
        const branchReports = await Promise.all(
            childBranches.map(async (branch) => {
                try {
                    // Find all products created by this child branch
                    const products = await Product.find({ 'createdBy.userId': branch._id });
                    
                    // Calculate totals
                    const totalProducts = products.length;
                    const totalQuantity = products.reduce((sum, product) => sum + (product.quantity || 0), 0);
                    
                    // Product details with quantity
                    const productDetails = products.map(product => ({
                        productId: product._id,
                        title: product.product.title,
                        category: product.category,
                        supplier: product.supplier,
                        quantity: product.quantity,
                        createdAt: product.createdAt
                    }));
                    
                    return {
                        branchInfo: {
                            branchId: branch._id,
                            branchName: `${branch.name.first} ${branch.name.last}'s Branch`,
                            managerName: `${branch.name.first} ${branch.name.last}`,
                            email: branch.email,
                            createdAt: branch.createdAt
                        },
                        productSummary: {
                            totalProducts: totalProducts,
                            totalQuantity: totalQuantity
                        },
                        products: productDetails
                    };
                } catch (error) {
                    console.error(`Error fetching products for branch ${branch._id}:`, error);
                    return {
                        branchInfo: {
                            branchId: branch._id,
                            branchName: `${branch.name.first} ${branch.name.last}'s Branch`,
                            managerName: `${branch.name.first} ${branch.name.last}`,
                            email: branch.email,
                            createdAt: branch.createdAt
                        },
                        productSummary: {
                            totalProducts: 0,
                            totalQuantity: 0
                        },
                        products: [],
                        error: "Failed to fetch products for this branch"
                    };
                }
            })
        );
        
        // Calculate overall totals
        const overallTotals = branchReports.reduce((totals, branch) => {
            totals.totalProducts += branch.productSummary.totalProducts;
            totals.totalQuantity += branch.productSummary.totalQuantity;
            return totals;
        }, { totalProducts: 0, totalQuantity: 0 });
        
        res.status(200).json({
            message: "Child branches report generated successfully",
            reportGeneratedAt: new Date(),
            summary: {
                totalChildBranches: childBranches.length,
                overallTotalProducts: overallTotals.totalProducts,
                overallTotalQuantity: overallTotals.totalQuantity
            },
            childBranches: branchReports
        });
        
    } catch (error) {
        console.error('❌ Error generating child branches report:', error);
        res.status(500).json({ message: "Server error during report generation" });
    }
});

// Get product quantity statistics for specific product - Available to: admin, main_brunch, user (with restrictions)
router.get('/statistics/:productId', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        const { productId } = req.params;
        
        // Role-based access control for statistics
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch' && currentUser.role !== 'user') {
            return res.status(403).json({ message: "Access denied: Insufficient permissions to view statistics" });
        }
        
        // Import statistics service
        const ProductStatisticsService = require('../src/services/ProductStatisticsService');
        
        // Extract filter parameters from query
        const {
            timePeriod = 'last_6_months', // last_3_months, last_6_months, last_year, last_2_years, current_month, current_year, custom_range
            customStartDate = null, // For custom_range
            customEndDate = null,   // For custom_range
            branchId = null,        // Filter by specific branch
            branchName = null,      // Filter by branch name
            groupBy = 'month',      // day, week, month, year
            includeDetails = 'true' // Include detailed change history
        } = req.query;
        
        // Convert string boolean to actual boolean
        const includeDetailsBoolean = includeDetails === 'true';
        
        // Apply role-based restrictions
        let filterOptions = {
            timePeriod,
            customStartDate,
            customEndDate,
            groupBy,
            includeDetails: includeDetailsBoolean
        };
        
        // Branch filtering based on user role
        if (currentUser.role === 'user') {
            // Child branch users can only see their own statistics
            filterOptions.branchId = currentUser._id;
        } else if (currentUser.role === 'main_brunch' || currentUser.role === 'admin') {
            // Main branch and admin can filter by any branch
            if (branchId) filterOptions.branchId = branchId;
            if (branchName) filterOptions.branchName = branchName;
        }
        
        // Validate product exists and user has access
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        
        // For child branch users, check if they created this product
        if (currentUser.role === 'user' && product.createdBy.userId.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Access denied: You can only view statistics for products you created" });
        }
        
        // Get statistics
        const statistics = await ProductStatisticsService.getProductStatistics(productId, filterOptions);
        
        res.status(200).json({
            message: "Product quantity statistics retrieved successfully",
            requestedBy: {
                userId: currentUser._id,
                role: currentUser.role,
                branchName: currentUser.branchName || 'Main Branch'
            },
            statistics
        });
        
    } catch (error) {
        console.error('❌ Error getting product statistics:', error);
        
        if (error.message.includes('not found') || error.message.includes('date')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ message: "Server error during statistics retrieval" });
    }
});

// Get all branches statistics overview - Available to: admin, main_brunch
router.get('/statistics/branches/overview', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Only admin and main_brunch can view all branches statistics
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch') {
            return res.status(403).json({ message: "Access denied: Only admins and main branch managers can view all branches statistics" });
        }
        
        // Import statistics service
        const ProductStatisticsService = require('../src/services/ProductStatisticsService');
        
        // Extract filter parameters from query
        const {
            timePeriod = 'last_6_months', 
            customStartDate = null,
            customEndDate = null,
            branchId = null,
            branchName = null,
            groupBy = 'month',
            includeProductDetails = 'false'
        } = req.query;
        
        // Convert string boolean to actual boolean
        const includeProductDetailsBoolean = includeProductDetails === 'true';
        
        const filterOptions = {
            timePeriod,
            customStartDate,
            customEndDate,
            branchId,
            branchName,
            groupBy,
            includeProductDetails: includeProductDetailsBoolean
        };
        
        // Get statistics
        const statistics = await ProductStatisticsService.getBranchStatistics(filterOptions);
        
        res.status(200).json({
            message: "All branches statistics retrieved successfully",
            requestedBy: {
                userId: currentUser._id,
                role: currentUser.role,
                branchName: currentUser.branchName || 'Main Branch'
            },
            statistics
        });
        
    } catch (error) {
        console.error('❌ Error getting branches statistics:', error);
        
        if (error.message.includes('date')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ message: "Server error during statistics retrieval" });
    }
});

// Get branch comparison statistics - Available to: admin, main_brunch
router.get('/statistics/branches/compare', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Only admin and main_brunch can compare branches
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch') {
            return res.status(403).json({ message: "Access denied: Only admins and main branch managers can compare branches" });
        }
        
        // Import statistics service
        const ProductStatisticsService = require('../src/services/ProductStatisticsService');
        
        // Extract parameters
        const {
            branchIds, // Comma-separated list of branch IDs
            timePeriod = 'last_6_months',
            customStartDate = null,
            customEndDate = null,
            groupBy = 'month'
        } = req.query;
        
        if (!branchIds) {
            return res.status(400).json({ message: "Branch IDs are required for comparison. Use ?branchIds=id1,id2,id3" });
        }
        
        // Parse branch IDs
        const branchIdArray = branchIds.split(',').map(id => id.trim());
        
        if (branchIdArray.length < 2) {
            return res.status(400).json({ message: "At least 2 branches are required for comparison" });
        }
        
        const filterOptions = {
            timePeriod,
            customStartDate,
            customEndDate,
            groupBy
        };
        
        // Get comparison statistics
        const comparison = await ProductStatisticsService.getBranchComparison(branchIdArray, filterOptions);
        
        res.status(200).json({
            message: "Branch comparison statistics retrieved successfully",
            requestedBy: {
                userId: currentUser._id,
                role: currentUser.role,
                branchName: currentUser.branchName || 'Main Branch'
            },
            comparison
        });
        
    } catch (error) {
        console.error('❌ Error getting branch comparison:', error);
        
        if (error.message.includes('date') || error.message.includes('required')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ message: "Server error during comparison retrieval" });
    }
});

// Get current user's branch statistics - Available to: user (child branches)
router.get('/statistics/my-branch', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // All authenticated users can view their own branch statistics
        if (!currentUser._id) {
            return res.status(403).json({ message: "Access denied: Authentication required" });
        }
        
        // Import statistics service
        const ProductStatisticsService = require('../src/services/ProductStatisticsService');
        
        // Extract filter parameters
        const {
            timePeriod = 'last_3_months', // Default to 3 months for personal view
            customStartDate = null,
            customEndDate = null,
            groupBy = 'month',
            includeProductDetails = 'false'
        } = req.query;
        
        const includeProductDetailsBoolean = includeProductDetails === 'true';
        
        const filterOptions = {
            timePeriod,
            customStartDate,
            customEndDate,
            branchId: currentUser._id, // Filter to current user's activities only
            groupBy,
            includeProductDetails: includeProductDetailsBoolean
        };
        
        // Get user's branch statistics
        const statistics = await ProductStatisticsService.getBranchStatistics(filterOptions);
        
        // Add user information to response
        const userInfo = {
            userId: currentUser._id,
            username: `${currentUser.firstName} ${currentUser.lastName}`,
            email: currentUser.email,
            role: currentUser.role,
            branchName: currentUser.firstName + "'s Branch"
        };
        
        res.status(200).json({
            message: "Personal branch statistics retrieved successfully",
            userInfo,
            statistics
        });
        
    } catch (error) {
        console.error('❌ Error getting personal branch statistics:', error);
        
        if (error.message.includes('date')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ message: "Server error during personal statistics retrieval" });
    }
});

module.exports = router;
