// qr-digital-menu-system/backend/routes/auth.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateToken = require('../utils/jwt');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Import protect and authorizeRoles

// @desc    Register a superadmin (Initial setup - run once)
// @route   POST /api/auth/register-superadmin
// @access  Public (for initial setup, then restrict)
router.post('/register-superadmin', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    try {
        // Check if a superadmin already exists (optional, but good for security)
        const superadminExists = await User.findOne({ role: 'superadmin' });
        if (superadminExists) {
            return res.status(400).json({ message: 'Superadmin already exists. Cannot register another.' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: 'superadmin',
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid superadmin data' });
        }
    } catch (error) {
        // Handle duplicate email error
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Email already registered.' });
        }
        res.status(500).json({ message: error.message });
    }
});


// @desc    Authenticate user (login)
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    console.log('Login attempt received:');
    console.log('  Email:', email);
    console.log('  Password (plaintext from form):', password);

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter email and password' });
    }

    try {
        // Find user by email, and explicitly select password as it's hidden by default
        const user = await User.findOne({ email }).select('+password');

        console.log('  User found in DB:', user ? user.email : 'None');
        console.log('  Stored Hashed Password (from DB):', user ? user.password : 'N/A');

        if (user && (await user.matchPassword(password))) {
            console.log('  Password matched! Login successful.');
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            console.log('  Password did NOT match or user not found.');
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during login process:', error);
        res.status(500).json({ message: error.message });
    }
});


// @desc    Get current user profile (for testing protected routes)
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    // req.user is populated by the protect middleware
    res.json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        store: req.user.store
    });
});

module.exports = router;