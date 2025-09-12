// qr-digital-menu-system/backend/routes/users.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product'); // Added missing import
const Category = require('../models/Category'); // Added missing import
const generateToken = require('../utils/jwt');
const { protect, authorizeRoles, verifySuperadminPassword } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid'); // For generating unique publicUrlId for stores
const slugify = require('slugify'); // Import slugify

// @desc    Register a new admin by Superadmin
// @route   POST /api/users/register-admin
// @access  Private (Superadmin only)
router.post('/register-admin', protect, authorizeRoles('superadmin'), async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: 'admin',
        });

        if (user) {
            // Create an empty store for the new admin immediately
            const publicUrlId = uuidv4(); // Generate a unique ID for the public menu link
            const storeName = `${user.name}'s Store`;
            const storeSlug = slugify(storeName, { lower: true, strict: true }); // Generate slug

            const store = await Store.create({
                admin: user._id,
                name: storeName, // Default store name
                slug: storeSlug, // Save the generated slug
                publicUrlId: publicUrlId
            });

            // Link the store to the admin user
            user.store = store._id;
            await user.save(); // Save the user with the linked store

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                storeId: store._id,
                // Return the slug for frontend convenience
                publicMenuUrl: `/menu.html?slug=${store.slug}` // Use slug for frontend convenience
            });
        } else {
            res.status(400).json({ message: 'Invalid admin data' });
        }
    } catch (error) {
        console.error('Error registering admin:', error);
        res.status(500).json({ message: 'Server error during admin registration.' });
    }
});


// @desc    Get all admins (excluding superadmin)
// @route   GET /api/users
// @access  Private (Superadmin only)
router.get('/', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const admins = await User.find({ role: 'admin' }).select('-password'); // Don't send passwords
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get a single admin by ID
// @route   GET /api/users/:id
// @access  Private (Superadmin only)
router.get('/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const admin = await User.findById(req.params.id).select('-password');
        if (admin && admin.role === 'admin') {
            res.json(admin);
        } else {
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update an admin user by ID
// @route   PUT /api/users/:id
// @access  Private (Superadmin only)
router.put('/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const admin = await User.findById(req.params.id);

        if (admin && admin.role === 'admin') {
            admin.name = name || admin.name;
            admin.email = email || admin.email;

            if (password) {
                admin.password = password; // Pre-save hook will hash this
            }

            const updatedAdmin = await admin.save(); // save() triggers pre-save hook for password hashing

            res.json({
                _id: updatedAdmin._id,
                name: updatedAdmin.name,
                email: updatedAdmin.email,
                role: updatedAdmin.role,
            });
        } else {
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (error) {
        console.error('Error updating admin:', error);
        // Handle potential duplicate email on update
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already in use by another user.' });
        }
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete an admin user by ID
// @route   DELETE /api/users/:id
// @access  Private (Superadmin only)
router.delete('/:id', protect, authorizeRoles('superadmin'), verifySuperadminPassword, async (req, res) => {
    try {
        const admin = await User.findById(req.params.id);

        if (admin && admin.role === 'admin') {
            // Also delete associated store, categories, and products
            await Product.deleteMany({ store: admin.store });
            await Category.deleteMany({ store: admin.store });
            await Store.findByIdAndDelete(admin.store);
            await User.deleteOne({ _id: admin._id });

            res.json({ message: 'Admin and associated data removed' });
        } else {
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;