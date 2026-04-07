// Product Management Routes - CRUD operations with security
const express = require('express');
const joi = require('joi');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
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
    state: joi.string().allow('').optional().max(50),
    country: joi.string().required().min(2).max(50),
    city: joi.string().required().min(2).max(50),
    street: joi.string().required().min(2).max(100),
    houseNumber: joi.number().integer().required().min(1),
    zip: joi.number().integer().required().min(10000).max(99999),
    // Image options - either URL or file upload
    imageUrl: joi.string().uri().allow('').optional(), // External image URL
    imageAlt: joi.string().allow('').optional().max(200),
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

        const hasUploadedFile = !!req.file;
        const hasImageUrl = !!value.imageUrl?.trim();
        const hasImageInput = hasUploadedFile || hasImageUrl;

        if (hasImageInput && !value.imageAlt?.trim()) {
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(400).json({ message: 'Image description (alt text) is required when an image is provided.' });
        }

        const normalizedImageAlt = hasImageInput ? value.imageAlt.trim() : 'No image uploaded';
        
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
                state: value.state || undefined,
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
                alt: normalizedImageAlt,
                imageType: 'upload',
                // Store security validation info for audit trail
                securityValidated: true,
                validationTimestamp: new Date()
            };
        } else if (value.imageUrl) {
            // External URL provided - no file upload needed
            productData.image = {
                url: value.imageUrl,
                alt: normalizedImageAlt,
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
        } else {
            productData.image = {
                alt: normalizedImageAlt
            };
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

// Get all products (with pagination and filtering)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const skip = (page - 1) * limit;

        const currentUser = req.user;
        const { search, category, supplier, minQty, userId } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { "product.title": { $regex: search, $options: 'i' } },
                { "product.subtitle": { $regex: search, $options: 'i' } },
                { "product.description": { $regex: search, $options: 'i' } }
            ];
        }

        if (category) query.category = category;
        if (supplier) query.supplier = supplier;
        if (minQty) query.quantity = { $gte: parseInt(minQty) };

        // Scope products by viewing context
        if (currentUser.role === 'admin' && userId) {
            const contextUser = await User.findById(userId).select('_id isAdmin isMainBrunch');
            if (!contextUser) {
                return res.status(404).json({ message: 'Selected user context not found' });
            }

            if (!contextUser.isAdmin) {
                if (contextUser.isMainBrunch) {
                    const childUsers = await User.find({
                        brunches: contextUser._id,
                        isMainBrunch: false,
                        isAdmin: false,
                    }).select('_id');

                    const allowedIds = [
                        contextUser._id,
                        ...childUsers.map((u) => u._id),
                    ];

                    query['createdBy.userId'] = { $in: allowedIds };
                } else {
                    query['createdBy.userId'] = contextUser._id;
                }
            }
        } else if (currentUser.role === 'main_brunch') {
            const childUsers = await User.find({
                brunches: currentUser._id,
                isMainBrunch: false,
                isAdmin: false,
            }).select('_id');

            const allowedIds = [
                currentUser._id,
                ...childUsers.map((u) => u._id),
            ];

            query['createdBy.userId'] = { $in: allowedIds };
        } else if (currentUser.role === 'user') {
            query['createdBy.userId'] = currentUser._id;
        }

        const products = await Product.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Product.countDocuments(query);

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

        // Ownership Check
        if (currentUser.role !== 'admin') {
            const productOwnerId = product.user_id ? product.user_id.toString() : null;
            
            if (currentUser.role === 'main_brunch') {
                if (productOwnerId !== currentUser._id.toString() && 
                    (!currentUser.brunches || !currentUser.brunches.includes(productOwnerId))) {
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(403).json({ message: "Access denied: You do not manage this branch" });
                }
            } else if (currentUser.role === 'user') {
                if (productOwnerId !== currentUser._id.toString()) {
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(403).json({ message: "Access denied: You can only edit your own products" });
                }
            }
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

        const hasUploadedFile = !!req.file;
        const hasImageUrl = !!value.imageUrl?.trim();
        const hasExistingImage = !!product.image && !!(product.image.url || product.image.filename || product.image.alt);
        const hasImageInput = hasUploadedFile || hasImageUrl || hasExistingImage;

        if (hasImageInput && !value.imageAlt?.trim()) {
            if (req.file) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Error deleting file:', err);
                });
            }
            return res.status(400).json({ message: 'Image description (alt text) is required when an image is provided.' });
        }

        const normalizedImageAlt = hasImageInput ? value.imageAlt.trim() : 'No image uploaded';
        
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
                state: value.state || undefined,
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
                alt: normalizedImageAlt,
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
                alt: normalizedImageAlt,
                imageType: 'url'
            };
        } else if (value.imageType === 'url' && !value.imageUrl) {
            // imageType is url but no URL provided
            return res.status(400).json({ message: "Image URL is required when imageType is 'url'" });
        } else {
            // Keep existing image if no new upload or URL
            updateData.image = product.image || { alt: normalizedImageAlt };
            if (updateData.image) {
                updateData.image.alt = normalizedImageAlt;
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

        // Ownership Check: 
        // Admin sees all. 
        // Main branch sees their own and their child branches'.
        // Child branch (user) only sees their own.
        if (currentUser.role !== 'admin') {
            const productOwnerId = product.user_id ? product.user_id.toString() : null;
            
            if (currentUser.role === 'main_brunch') {
                // Main branch must be either the owner or the parent of the owner
                if (productOwnerId !== currentUser._id.toString() && 
                    (!currentUser.brunches || !currentUser.brunches.includes(productOwnerId))) {
                    return res.status(403).json({ message: "Access denied: You do not manage this branch" });
                }
            } else if (currentUser.role === 'user') {
                // Child branch must be the owner
                if (productOwnerId !== currentUser._id.toString()) {
                    return res.status(403).json({ message: "Access denied: You can only delete your own products" });
                }
            }
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

        req.logData = {
            ...(req.logData || {}),
            operation: 'quantity_change',
            productId: id,
            productTitle: updatedProduct.product.title,
            productName: updatedProduct.product.title,
            quantity,
            oldQuantity: previousQuantity,
            newQuantity: updatedProduct.quantity,
            quantityChange: updatedProduct.quantity - previousQuantity,
            quantityChangeType:
                updatedProduct.quantity > previousQuantity
                    ? 'increase'
                    : updatedProduct.quantity < previousQuantity
                        ? 'decrease'
                        : 'no_change',
            endpoint: `/api/products/${id}/quantity`,
        };
        
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

module.exports = router;
