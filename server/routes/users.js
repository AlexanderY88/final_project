const express = require('express');
const joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const authMiddleware = require('../src/middleware/auth');
const { logAuthEvent } = require('../src/middleware/logging');
const router = express.Router();

// --- Validation Schemas ---

const registerSchema = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/),
    role: joi.string().valid('user', 'main_brunch', 'admin').default('user'),
});

const loginSchema = joi.object({
    email: joi.string().email().required().min(5),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/)
});

const childBrunchSchema = joi.object({
    firstName: joi.string().required(),
    lastName: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().required().min(6).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.!_@#$%^&*-])[A-Za-z\d.!_@#$%^&*-]{6,}$/),
    mainBrunchId: joi.string().optional(),
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
            phone: '0000000000',
            address: { country: 'Israel', city: 'Tel Aviv', street: 'Default', houseNumber: 1, zip: 10000 },
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

        if (currentUser.role !== 'main_brunch' && currentUser.role !== 'admin') {
            return res.status(403).json({ message: "Access denied" });
        }

        let childBranches;
        if (currentUser.role === 'admin') {
            // Admin sees all child branch users
            childBranches = await User.find({ isAdmin: false, isMainBrunch: false }).select('-password');
        } else {
            // Main branch sees children linked to them via brunches array
            childBranches = await User.find({
                brunches: currentUser._id,
                isMainBrunch: false,
                isAdmin: false,
            }).select('-password');
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
        if (error) return res.status(400).send(error.details[0].message);

        let existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).json({ message: "User already exists" });

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
            phone: '0000000000',
            address: { country: 'Israel', city: 'Tel Aviv', street: 'Default', houseNumber: 1, zip: 10000 },
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
        res.status(500).json({ message: "Server error" });
    }
});

// Update user profile
router.put("/update-profile/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = req.user;

        let target = await User.findById(id);
        if (!target) return res.status(404).json({ message: "User not found" });

        // Permission check
        const isOwn = currentUser._id.toString() === id;
        const isAdminUser = currentUser.role === 'admin';
        const isMainManagingChild = currentUser.role === 'main_brunch' && !target.isAdmin && !target.isMainBrunch;

        if (!isOwn && !isAdminUser && !isMainManagingChild) {
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