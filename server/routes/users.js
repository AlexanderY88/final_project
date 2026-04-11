const express = require('express');
const joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('../src/models/User');
const loadServerModule = (distRelativePath, srcRelativePath) => {
    try {
        return require(path.join(__dirname, '..', 'dist', distRelativePath));
    } catch (error) {
        return require(path.join(__dirname, '..', 'src', srcRelativePath));
    }
};
const authMiddleware = loadServerModule('middleware/auth', 'middleware/auth');
const { logAuthEvent } = loadServerModule('middleware/logging', 'middleware/logging');
const router = express.Router();

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// --- Validation Schemas ---

const registerSchema = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    email: joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.email': 'Email format is incorrect.',
        'string.empty': 'Email is required.',
    }),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/),
    phone: joi.string().required(),
    country: joi.string().required(),
    city: joi.string().required(),
    street: joi.string().required(),
    houseNumber: joi.number().integer().min(1).required(),
    zip: joi.string().allow('').optional(),
    role: joi.string().valid('user', 'main_brunch', 'admin').default('main_brunch'),
});

const loginSchema = joi.object({
    email: joi.string().email({ tlds: { allow: false } }).required().min(5).messages({
        'string.email': 'Email format is incorrect.',
        'string.empty': 'Email is required.',
    }),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/)
});

const childBrunchSchema = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    email: joi.string().trim().lowercase().pattern(SIMPLE_EMAIL_REGEX).required().messages({
        'string.pattern.base': 'Email format is incorrect.',
        'string.empty': 'Email is required.',
    }),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/),
    phone: joi.string().required(),
    country: joi.string().required(),
    city: joi.string().required(),
    street: joi.string().required(),
    houseNumber: joi.number().integer().min(1).required(),
    zip: joi.number().integer().min(10000).max(999999999).optional(),
    mainBrunchId: joi.string().optional(),
});

const createUserSchema = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    email: joi.string().email({ tlds: { allow: false } }).required().messages({
        'string.email': 'Email format is incorrect.',
        'string.empty': 'Email is required.',
    }),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/),
    role: joi.string().valid('user', 'main_brunch', 'admin').default('main_brunch'),
    phone: joi.string().allow('').optional(),
    city: joi.string().required(),
    country: joi.string().required(),
    street: joi.string().required(),
    houseNumber: joi.number().integer().min(1).required(),
    zip: joi.number().integer().min(10000).max(999999999).required(),
    mainBrunchId: joi.string().optional(),
});

const updateProfileSchema = joi.object({
    firstName: joi.string().min(2).max(50).optional(),
    lastName: joi.string().min(2).max(50).optional(),
    middleName: joi.string().allow('').max(50).optional(),
    email: joi.string().email({ tlds: { allow: false } }).optional().messages({
        'string.email': 'Email format is incorrect.',
    }),
    phone: joi.string().allow('').optional(),
    password: joi.string().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/).optional(),
    isAdmin: joi.boolean().optional(),
    isMainBrunch: joi.boolean().optional(),
    address: joi.object({
        state: joi.string().allow('').optional(),
        country: joi.string().min(2).max(100).optional(),
        city: joi.string().min(2).max(100).optional(),
        street: joi.string().min(2).max(100).optional(),
        houseNumber: joi.number().integer().min(1).optional(),
        zip: joi.number().integer().min(10000).max(999999999).optional(),
    }).optional(),
});

// Helper: get role string from user document
function getUserRole(user) {
    if (user.isAdmin) return 'admin';
    if (user.isMainBrunch) return 'main_brunch';
    return 'user';
}

// --- Public Routes ---

// Register
router.post("/register", logAuthEvent('register'), async (req, res) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        let existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).json({ message: "User already exists" });

        // Map flat fields to the User schema
        const user = new User({
            name: { first: req.body.firstName, last: req.body.lastName },
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone,
            address: {
                country: req.body.country,
                city: req.body.city,
                street: req.body.street,
                houseNumber: Number(req.body.houseNumber),
                zip: req.body.zip ? Number(req.body.zip) : 10000,
            },
            isMainBrunch: req.body.role === 'main_brunch',
            isAdmin: req.body.role === 'admin',
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();

        // If main branch, store own ID in brunches for linking children later
        if (user.isMainBrunch) {
            user.brunches = [user._id];
            await user.save();
        }

        const role = getUserRole(user);
        const token = jwt.sign(
            { _id: user._id, role, email: user.email, firstName: user.name.first, lastName: user.name.last },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );
        res.status(201).send(token);
    } catch (error) {
        console.error("Error in registration:", error);
        res.status(500).json({ message: "Server error during registration" });
    }
});

// Login
router.post("/login", logAuthEvent('login'), async (req, res) => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        let user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(400).send("Invalid email or password.");

        const valid = await bcrypt.compare(req.body.password, user.password);
        if (!valid) return res.status(400).send("Wrong email or password");

        const role = getUserRole(user);
        const token = jwt.sign(
            { _id: user._id, role, email: user.email, firstName: user.name.first, lastName: user.name.last },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );
        res.status(200).send(token);
    } catch (error) {
        res.status(500).send("Server error");
    }
});

// --- Protected Routes (specific paths BEFORE /:id) ---

// Get current user profile
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Get all users (admin only)
router.get("/all", authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const { search, role, city } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { "name.first": { $regex: search, $options: 'i' } },
                { "name.last": { $regex: search, $options: 'i' } },
                { "email": { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            if (role === 'admin') { query.isAdmin = true; }
            else if (role === 'main_brunch') { query.isMainBrunch = true; query.isAdmin = false; }
            else if (role === 'user') { query.isMainBrunch = false; query.isAdmin = false; }
        }

        if (city) {
            query["address.city"] = { $regex: city, $options: 'i' };
        }

        const users = await User.find(query).select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Get child branches
router.get("/child-brunches", authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        const { mainBrunchId } = req.query;

        if (currentUser.role !== 'main_brunch' && currentUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        const getChildrenForMainBranch = async (mainBranchDoc) => {
            if (!mainBranchDoc) return [];

            // Direction 1: child document points to main via child.brunches = [mainId]
            const childrenByChildLink = await User.find({
                brunches: mainBranchDoc._id,
                isMainBrunch: false,
                isAdmin: false,
            }).select('-password');

            // Direction 2: main document points to children via main.brunches = [mainId, childId, ...]
            const linkedChildIds = (mainBranchDoc.brunches || [])
                .map((id) => id.toString())
                .filter((id) => id !== mainBranchDoc._id.toString());

            let childrenByMainLink = [];
            if (linkedChildIds.length > 0) {
                childrenByMainLink = await User.find({
                    _id: { $in: linkedChildIds },
                    isMainBrunch: false,
                    isAdmin: false,
                }).select('-password');
            }

            const byId = new Map();
            [...childrenByChildLink, ...childrenByMainLink].forEach((userDoc) => {
                byId.set(userDoc._id.toString(), userDoc);
            });

            return Array.from(byId.values());
        };

        let childBranches;
        if (currentUser.role === 'admin') {
            if (mainBrunchId) {
                const mainBranch = await User.findById(mainBrunchId);
                if (!mainBranch || !mainBranch.isMainBrunch) {
                    return res.status(400).json({ message: "Invalid main branch" });
                }

                childBranches = await getChildrenForMainBranch(mainBranch);
            } else {
                // Admin sees all child branch users if no main branch context is provided
                childBranches = await User.find({ isAdmin: false, isMainBrunch: false }).select('-password');
            }
        } else {
            // Main branch sees children in both relationship directions.
            const mainBranch = await User.findById(currentUser._id).select('-password');
            childBranches = await getChildrenForMainBranch(mainBranch);
        }

        res.status(200).json({
            count: childBranches.length,
            childBranches,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Create child branch
router.post("/create-child-brunch", authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;

        if (currentUser.role !== 'main_brunch' && currentUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        if (currentUser.role === 'admin' && !req.body.mainBrunchId) {
            return res.status(400).json({ message: "mainBrunchId is required when admin creates child branch" });
        }

        const { error } = childBrunchSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        let existingByEmail = await User.findOne({ email: req.body.email });
        if (existingByEmail) return res.status(400).json({ message: "A user with this email already exists" });

        let existingByPhone = await User.findOne({ phone: req.body.phone });
        if (existingByPhone) return res.status(400).json({ message: "A user with this phone number already exists" });

        // Determine which main branch to link to
        let parentId;
        if (currentUser.role === 'admin') {
            const mainUser = await User.findById(req.body.mainBrunchId);
            if (!mainUser || !mainUser.isMainBrunch) {
                return res.status(400).json({ message: "Invalid main branch" });
            }
            parentId = mainUser._id;
        } else {
            parentId = currentUser._id;
        }

        const newUser = new User({
            name: { first: req.body.firstName, last: req.body.lastName },
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone,
            address: {
                country: req.body.country,
                city: req.body.city,
                street: req.body.street,
                houseNumber: req.body.houseNumber,
                zip: req.body.zip || 10000,
            },
            isMainBrunch: false,
            isAdmin: false,
            brunches: [parentId],
        });

        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(newUser.password, salt);
        await newUser.save();

        const created = await User.findById(newUser._id).select('-password');
        res.status(201).json({ message: "Child branch created", user: created });
    } catch (error) {
        console.error("Error creating child branch:", error);
        if (error && error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern || {})[0];
            if (duplicateField === 'email') {
                return res.status(400).json({ message: 'A user with this email already exists' });
            }
            if (duplicateField === 'phone') {
                return res.status(400).json({ message: 'A user with this phone number already exists' });
            }
            return res.status(400).json({ message: 'A user with duplicate details already exists' });
        }
        res.status(500).json({ message: "Server error" });
    }
});

// Create user (admin only) - can create any type of user
router.post("/create-user", authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;

        // Only admins can use this endpoint
        if (currentUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied: Only admins can create users" });
        }

        const { error } = createUserSchema.validate(req.body);
        if (error) return res.status(400).send(error.details[0].message);

        // Check if user already exists
        let existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).json({ message: "User already exists" });

        // Determine role
        const role = req.body.role || 'user';
        const isAdmin = role === 'admin';
        const isMainBrunch = role === 'main_brunch';

        // For child branches, require a main branch ID
        let parentId = null;
        if (role === 'user' && !req.body.mainBrunchId) {
            return res.status(400).json({ message: "mainBrunchId is required when creating a child branch user" });
        }

        if (role === 'user' && req.body.mainBrunchId) {
            const mainUser = await User.findById(req.body.mainBrunchId);
            if (!mainUser || !mainUser.isMainBrunch) {
                return res.status(400).json({ message: "Invalid main branch ID" });
            }
            parentId = mainUser._id;
        }

        const newUser = new User({
            name: { first: req.body.firstName, last: req.body.lastName },
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone || '0000000000',
            address: {
                country: req.body.country || 'Israel',
                city: req.body.city || 'Tel Aviv',
                street: req.body.street || 'Default',
                houseNumber: req.body.houseNumber || 1,
                zip: req.body.zip || 10000
            },
            isMainBrunch: isMainBrunch,
            isAdmin: isAdmin,
            brunches: parentId ? [parentId] : [],
        });

        const salt = await bcrypt.genSalt(10);
        newUser.password = await bcrypt.hash(newUser.password, salt);
        await newUser.save();

        const created = await User.findById(newUser._id).select('-password');
        res.status(201).json({ message: "User created successfully", user: created });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Update user profile
router.put("/update-profile/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        const { error } = updateProfileSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        let target = await User.findById(id);
        if (!target) return res.status(404).json({ message: "User not found" });

        // Permission check
        const isOwn = currentUser._id.toString() === id;
        const isAdminUser = currentUser.role === 'admin';
        const isMainManagingChild = currentUser.role === 'main_brunch' && !target.isAdmin && !target.isMainBrunch;
        const isMainEditingSelf = currentUser.role === 'main_brunch' && isOwn;

        if (!isAdminUser && !isMainManagingChild && !isMainEditingSelf) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Only admins can change roles
        if (currentUser.role !== 'admin') {
            delete req.body.isAdmin;
            delete req.body.isMainBrunch;
        }

        // Build update data
        const updateData = { ...req.body };

        // Map flat name fields to nested name object
        if (req.body.firstName || req.body.lastName) {
            updateData.name = {
                first: req.body.firstName || target.name.first,
                last: req.body.lastName || target.name.last,
                middle: req.body.middleName || target.name.middle,
            };
            delete updateData.firstName;
            delete updateData.lastName;
            delete updateData.middleName;
        }

        // Hash password if being updated
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }

        await User.updateOne({ _id: id }, { $set: updateData });
        const updated = await User.findById(id).select('-password');
        res.status(200).json(updated);
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Change password - MUST come before /:id catch-all route
router.put("/change-password/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        const currentUser = req.user;

        // Validate password
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/;
        if (!newPassword || !passwordPattern.test(newPassword)) {
            return res.status(400).json({ message: 'Password must include uppercase, lowercase, number, and special character (min 6 characters).' });
        }

        const target = await User.findById(id);
        if (!target) return res.status(404).json({ message: "User not found" });

        // Permission check - admin can update any password, main branch can update self or child branch passwords.
        const isOwn = currentUser._id.toString() === id;
        const isAdminUser = currentUser.role === 'admin';
        const isMainManagingChild = currentUser.role === 'main_brunch' && !target.isAdmin && !target.isMainBrunch;
        const isMainEditingSelf = currentUser.role === 'main_brunch' && isOwn;

        if (!isAdminUser && !isMainManagingChild && !isMainEditingSelf) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Hash and update password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.updateOne({ _id: id }, { $set: { password: hashedPassword } });
        const updated = await User.findById(id).select('-password');
        res.status(200).json(updated);
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- Parameterized routes (MUST be after specific paths like /profile, /all) ---

// Get user by ID
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        const target = await User.findById(id).select('-password');
        if (!target) return res.status(404).json({ message: "User not found" });

        // Permission check
        const isOwn = currentUser._id.toString() === id;
        const isAdminUser = currentUser.role === 'admin';
        const isMainViewingChild = currentUser.role === 'main_brunch' && !target.isAdmin && !target.isMainBrunch;

        if (!isOwn && !isAdminUser && !isMainViewingChild) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.status(200).json(target);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// Delete user
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        const target = await User.findById(id);
        if (!target) return res.status(404).json({ message: "User not found" });

        // Permission check
        const isOwn = currentUser._id.toString() === id;
        const isAdminUser = currentUser.role === 'admin';
        const isMainDeletingChild = currentUser.role === 'main_brunch' && !target.isAdmin && !target.isMainBrunch;

        if (isAdminUser && isOwn) {
            return res.status(403).json({ message: "Admin cannot delete themselves" });
        }

        if (!isOwn && !isAdminUser && !isMainDeletingChild) {
            return res.status(403).json({ message: "Access denied" });
        }

        // If deleting a main branch, also delete its child branches
        if (target.isMainBrunch && target.brunches?.length > 0) {
            await User.deleteMany({ brunches: { $in: target.brunches }, isMainBrunch: false });
        }

        await User.deleteOne({ _id: id });
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;