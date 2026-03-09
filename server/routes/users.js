/**
 * User Authentication and Management Routes
 * Handles user registration, login, profile management, and role-based operations
 * Supports three user roles: admin, main_brunch, and user
 */

const express = require('express');
const joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const authMiddleware = require('../src/middleware/auth');
const { logAuthEvent } = require('../src/middleware/logging');
const router = express.Router();

// Joi Schema for User Registration
const checkRegisterBody = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(), 
    email: joi.string().email().required(),
    // Password must contain: lowercase, uppercase, digit, special character, minimum 6 chars
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/),
    role: joi.string().valid('user', 'main_brunch', 'admin').default('user'),
});

// User Registration Route - POST /api/users/register
router.post("/register", logAuthEvent('register'), async (req,res) => {
    try {
        // Validate request body using Joi schema
        const { error } = checkRegisterBody.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);
        
        // Check if user already exists by email
        let user = await User.findOne({ email: req.body.email });
        if (user) return res.status(400).json({ message: "User already exists" });
        
        // Create new user instance
        user = new User(req.body);
        
        // Hash password with bcrypt (salt rounds: 10)
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        
        // Save user to database
        await user.save()
        
        // Generate JWT token with user information (expires in 4 hours)
        const token = jwt.sign({ 
            _id: user._id, 
            role: user.role,
            email: user.email 
        }, process.env.JWT_SECRET, { expiresIn: '4h' });
        
        res.status(201).send(token);
    } catch (error) {
        console.error("Error in registration:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
});

// Joi Schema for User Login
const checkLoginBody = joi.object({
    email: joi.string().email().required().min(5),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/)
});

// User Login Route - POST /api/users/login
router.post("/login", logAuthEvent('login'), async (req,res) => {
    try {
        // 1. Validate request body with Joi
        const {error} = checkLoginBody.validate(req.body);
        if(error) return res.status(400).send(error.details[0].message);
        
        // 2. Check if user exists by email
        let user = await User.findOne({email: req.body.email});
        if(!user) return res.status(400).send("Invalid email or password.");
        
        // 3. Verify password using bcrypt
        const result = await bcrypt.compare(req.body.password, user.password);
        if (!result) return res.status(400).send("Wrong email or password");
        
        // 4. Generate JWT token (expires in 4 hours)
        const token = jwt.sign({
            _id: user._id, 
            role: user.role,
            email: user.email
        }, process.env.JWT_SECRET, { expiresIn: '4h' });
        
        res.status(200).send(token);
    } catch (error) {
        res.status(500).send("Server error");
    }
});

// Update User Profile Route - PUT /api/users/update-profile/:id
router.put("/update-profile/:id", authMiddleware, async (req,res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        
        // Find target user to update
        let targetUser = await User.findById(id);
        if (!targetUser) return res.status(404).json({ message: "User not found" });
        
        // Check update permissions based on user roles
        const canUpdate = await checkUpdatePermissions(currentUser, targetUser);
        if (!canUpdate.allowed) {
            return res.status(403).json({ message: canUpdate.reason });
        }
        
        // Validate updated data
        const {error} = checkRegisterBody.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);
        
        // Prevent role escalation (only admins can change roles)
        if (currentUser.role !== 'admin' && req.body.role && req.body.role !== targetUser.role) {
            return res.status(403).json({ message: "Access denied: Only admins can change user roles" });
        }
        
        // Update user document in database
        await User.updateOne({_id: id}, req.body);
        const updatedUser = await User.findById(id).select('-password');
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Server error during profile update" });
    }
});

// Helper: Check Update Permissions
async function checkUpdatePermissions(currentUser, targetUser) {
    // Admin can update anyone
    if (currentUser.role === 'admin') {
        return { allowed: true, reason: "Admin privileges" };
    }
    
    // Users can update themselves
    if (currentUser._id.toString() === targetUser._id.toString()) {
        return { allowed: true, reason: "Own profile update" };
    }
    
    // Main branch can update their child branches
    if (currentUser.role === 'main_brunch') {
        // Can update child branches
        if (targetUser.role === 'user') {
            // Check if target user is a child of current main branch
            const isChildBranch = targetUser.brunches && targetUser.brunches.some(
                branchId => currentUser.brunches && currentUser.brunches.includes(branchId)
            );
            
            if (isChildBranch) {
                return { allowed: true, reason: "Child branch update" };
            }
        }
        
        return { allowed: false, reason: "Main branch can only update own account or child branches" };
    }
    
    // Regular users (child branches) can only update themselves
    if (currentUser.role === 'user') {
        return { allowed: false, reason: "Users can only update their own account" };
    }
    
    return { allowed: false, reason: "Invalid user role" };
}

// Delete User Account Route - DELETE /api/users/:id
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        
        // Find the target user to delete
        const targetUser = await User.findById(id).populate('brunches');
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Permission checks based on user roles
        const canDelete = await checkDeletePermissions(currentUser, targetUser);
        if (!canDelete.allowed) {
            return res.status(403).json({ message: canDelete.reason });
        }
        
        // Handle cascading deletion if needed (e.g., main branch deletion affects child branches)
        await handleCascadeDeletion(targetUser);
        
        // Delete the user from database
        await User.deleteOne({ _id: id });
        
        res.status(200).json({ 
            message: "User deleted successfully",
            deletedUser: {
                id: targetUser._id,
                email: targetUser.email,
                role: targetUser.role
            }
        });
        
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Server error during user deletion" });
    }
});

// Helper: Check Delete Permissions
async function checkDeletePermissions(currentUser, targetUser) {
    // Admin can delete anyone except themselves (prevent lockout)
    if (currentUser.role === 'admin') {
        if (currentUser._id.toString() === targetUser._id.toString()) {
            return { allowed: false, reason: "Admins cannot delete themselves" };
        }
        return { allowed: true, reason: "Admin privileges" };
    }
    
    // Main branch can delete:
    // 1. Their own account
    // 2. Child branches under them
    if (currentUser.role === 'main_brunch') {
        // Can delete themselves
        if (currentUser._id.toString() === targetUser._id.toString()) {
            return { allowed: true, reason: "Own account deletion" };
        }
        
        // Can delete child branches
        if (targetUser.role === 'user') {
            // Check if target user is a child of current main branch
            const isChildBranch = targetUser.brunches.some(
                branchId => currentUser.brunches.includes(branchId)
            );
            
            if (isChildBranch) {
                return { allowed: true, reason: "Child branch deletion" };
            }
        }
        
        return { allowed: false, reason: "Can only delete your own account or child branches" };
    }
    
    // Regular users (child branches) can only delete themselves
    if (currentUser.role === 'user') {
        if (currentUser._id.toString() === targetUser._id.toString()) {
            return { allowed: true, reason: "Own account deletion" };
        }
        return { allowed: false, reason: "Users can only delete their own account" };
    }
    
    return { allowed: false, reason: "Invalid user role" };
}

// Helper: Handle Cascade Deletion
async function handleCascadeDeletion(targetUser) {
    // If deleting a main branch, delete all child branches
    if (targetUser.role === 'main_brunch') {
        // Delete all child branches under this main branch
        const deletedChildren = await User.deleteMany({ brunches: { $in: targetUser.brunches } });
        
        // Alternative Option: Orphan child branches (make them independent) - DISABLED
        // await User.updateMany(
        //     { brunches: { $in: targetUser.brunches } },
        //     { $pull: { brunches: { $in: targetUser.brunches } } }
        // );
        
        console.log(`Deleted ${deletedChildren.deletedCount} child branches of main branch: ${targetUser.email}`);
    }
    
    // If deleting a child branch, remove from parent's branch list
    if (targetUser.role === 'user' && targetUser.brunches.length > 0) {
        // This would require a reverse relationship or additional logic
        // depending on your exact data structure
    }
}

// Get User by ID Route - GET /api/users/:id
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;
        
        // Find target user (exclude password from response)
        const targetUser = await User.findById(id).select('-password').populate('brunches');
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Permission check based on role hierarchy
        const canView = await checkViewPermissions(currentUser, targetUser);
        if (!canView.allowed) {
            return res.status(403).json({ message: canView.reason });
        }
        
        res.status(200).json(targetUser);
        
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Helper: Check View Permissions
async function checkViewPermissions(currentUser, targetUser) {
    // Admin can view anyone
    if (currentUser.role === 'admin') {
        return { allowed: true, reason: "Admin privileges" };
    }
    
    // Users can view themselves
    if (currentUser._id.toString() === targetUser._id.toString()) {
        return { allowed: true, reason: "Own profile" };
    }
    
    // Main branch can view their child branches
    if (currentUser.role === 'main_brunch' && targetUser.role === 'user') {
        const isChild = targetUser.brunches.some(
            branchId => currentUser.brunches.includes(branchId)
        );
        if (isChild) {
            return { allowed: true, reason: "Child branch access" };
        }
    }
    
    return { allowed: false, reason: "Access denied" };
} 

// Get Current User Profile Route - GET /api/users/profile
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Get user data without password, with populated branch information
        const user = await User.findById(currentUser._id).select('-password').populate('brunches');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.status(200).json(user);
        
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get Child Branches Route - GET /api/users/child-brunches
router.get("/child-brunches", authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Only main_brunch and admin can access child branches
        if (currentUser.role !== 'main_brunch' && currentUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Only main branch managers and admins can view child branches" });
        }
        
        let childBranches;
        
        if (currentUser.role === 'admin') {
            // Admin can see all users (child branches)
            childBranches = await User.find({ role: 'user' }).select('-password');
        } else {
            // Main branch can only see their child branches
            if (!currentUser.brunches || currentUser.brunches.length === 0) {
                return res.status(404).json({ message: "No brunches found" });
            }
            
            childBranches = await User.find({ 
                role: 'user',
                brunches: { $in: currentUser.brunches }
            }).select('-password');
        }
        
        if (!childBranches || childBranches.length === 0) {
            return res.status(404).json({ message: "No brunches found" });
        }
        
        res.status(200).json({
            message: "Child brunches retrieved successfully",
            count: childBranches.length,
            childBranches: childBranches
        });
        
    } catch (error) {
        console.error("Error fetching child brunches:", error);
        res.status(500).json({ message: "Server error during child brunches retrieval" });
    }
});

// Joi Schema for Child Branch Creation
const checkChildBrunchBody = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(), 
    email: joi.string().email().required(),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/),
    mainBrunchId: joi.string().optional() // Required when admin creates child brunch
});

// Create Child Branch Route - POST /api/users/create-child-brunch

router.post("/create-child-brunch", authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Only main_brunch and admin can create child branches
        if (currentUser.role !== 'main_brunch' && currentUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Only main branch managers and admins can create child branches" });
        }
        
        // Additional validation for admin users - they must specify which main branch to assign to
        if (currentUser.role === 'admin' && !req.body.mainBrunchId) {
            return res.status(400).json({ message: "mainBrunchId is required when admin creates child brunch" });
        }
        
        // Validate request body using Joi schema
        const { error } = checkChildBrunchBody.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);
        
        // Check if user already exists by email
        let existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });
        
        let mainBrunchUser = null;
        
        // Validate and get main brunch user when admin creates child
        if (currentUser.role === 'admin') {
            mainBrunchUser = await User.findById(req.body.mainBrunchId);
            if (!mainBrunchUser) {
                return res.status(404).json({ message: "Main brunch user not found" });
            }
            if (mainBrunchUser.role !== 'main_brunch') {
                return res.status(400).json({ message: "Specified user is not a main brunch manager" });
            }
        }
        
        // Prepare user data for new child branch
        const userData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: req.body.password,
            role: 'user', // Child branches are always 'user' role
            brunches: []
        };
        
        // Assign brunches based on creator's role
        if (currentUser.role === 'main_brunch') {
            // Child inherits parent's brunches
            userData.brunches = currentUser.brunches || [];
        } else if (currentUser.role === 'admin') {
            // Admin assigns child to specified main brunch
            userData.brunches = mainBrunchUser.brunches || [];
        }
        
        // Create new user instance
        const newUser = new User(userData);
        
        // Hash password using bcrypt
        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(newUser.password, salt);
        
        // Save to database
        await newUser.save();
        
        // Return user data without hashed password, but include original password for manager
        const createdUser = await User.findById(newUser._id).select('-password');
        
        res.status(201).json({
            message: "Child brunch created successfully",
            user: {
                ...createdUser.toObject(),
                password: req.body.password // Include original password for manager to share (will be masked at client side)
            },
            createdBy: {
                id: currentUser._id,
                email: currentUser.email,
                role: currentUser.role
            },
            assignedToMainBrunch: currentUser.role === 'admin' ? {
                id: mainBrunchUser._id,
                email: mainBrunchUser.email,
                role: mainBrunchUser.role
            } : null
        });
        
    } catch (error) {
        console.error("Error creating child brunch:", error);
        res.status(500).json({ message: "Server error during child brunch creation" });
    }
});

module.exports = router;