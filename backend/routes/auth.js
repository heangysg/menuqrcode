// qr-digital-menu-system/backend/routes/auth.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateToken = require('../utils/jwt');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');
const bcrypt = require('bcryptjs');

// Security headers middleware for auth routes
const securityHeaders = (req, res, next) => {
    // Prevent caching of auth responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    next();
};

// Apply security headers to all auth routes
router.use(securityHeaders);

// Enhanced input validation middleware
const validateRegistration = (req, res, next) => {
    const { name, email, password } = req.body;

    // Check for missing fields
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Trim and sanitize inputs
    const sanitizedName = sanitizeHtml(name.trim(), {
        allowedTags: [],
        allowedAttributes: {},
        allowedIframeHostnames: []
    });
    
    const sanitizedEmail = email.trim().toLowerCase();

    // Validate name
    if (sanitizedName.length < 2 || sanitizedName.length > 50) {
        return res.status(400).json({ message: 'Name must be between 2 and 50 characters' });
    }

    if (!/^[a-zA-Z\s\u1780-\u17FF\u0E00-\u0E7F\-'.]+$/.test(sanitizedName)) {
        return res.status(400).json({ message: 'Name contains invalid characters' });
    }

    // Validate email format and length
    if (!validator.isEmail(sanitizedEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (sanitizedEmail.length > 100) {
        return res.status(400).json({ message: 'Email address is too long' });
    }

    // Validate password strength
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    if (password.length > 100) {
        return res.status(400).json({ message: 'Password is too long' });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return res.status(400).json({ 
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
        });
    }

    // Check for common passwords (basic check)
    const commonPasswords = ['password', '12345678', 'admin123', 'qwerty123', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
        return res.status(400).json({ message: 'Password is too common, please choose a stronger password' });
    }

    // Set sanitized values back to request body
    req.body.name = sanitizedName;
    req.body.email = sanitizedEmail;

    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please enter email and password' });
    }

    // Sanitize and validate email
    const sanitizedEmail = email.trim().toLowerCase();
    
    if (!validator.isEmail(sanitizedEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    if (sanitizedEmail.length > 100) {
        return res.status(400).json({ message: 'Email address is too long' });
    }

    // Validate password length
    if (password.length < 1 || password.length > 100) {
        return res.status(400).json({ message: 'Invalid password length' });
    }

    req.body.email = sanitizedEmail;

    next();
};

// Security: Fake password comparison to prevent timing attacks
const fakePasswordCompare = async () => {
    const fakeHash = '$2a$10$fakeHashForTimingAttackPrevention.fake';
    await bcrypt.compare('fakePassword', fakeHash);
};

// @desc    Register a superadmin (Initial setup - run once)
// @route   POST /api/auth/register-superadmin
// @access  Public (for initial setup, then restrict)
router.post('/register-superadmin', validateRegistration, async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Additional security: Check if this is the very first superadmin registration
        const totalUsers = await User.countDocuments();
        if (totalUsers > 0) {
            // If there are already users, check if superadmin exists
            const superadminExists = await User.findOne({ role: 'superadmin' });
            if (superadminExists) {
                await fakePasswordCompare(); // Prevent timing attacks
                return res.status(403).json({ message: 'Superadmin registration is no longer available' });
            }
        }

        const user = await User.create({
            name,
            email,
            password,
            role: 'superadmin',
        });

        if (user) {
            // Security: Don't log sensitive information
            console.log(`Superadmin registered successfully: ${user.email}`);
            
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
            await fakePasswordCompare(); // Prevent timing attacks
            return res.status(400).json({ message: 'Email already registered.' });
        }
        
        // Generic error message for security
        console.error('Superadmin registration error:', error.message);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

        // In the login route of backend/routes/auth.js - Update this part:
        // @desc    Authenticate user (login)
// @route   POST /api/auth/login
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
    const { email, password } = req.body;

    console.log('Login attempt from IP:', req.ip, 'for email:', email);

    try {
        // 🚨 CRITICAL FIX: Populate the store data
        const user = await User.findOne({ email })
            .select('+password +loginAttempts +lockUntil')
            .populate('store', 'name slug isActive'); // ← ADDED POPULATE

        if (!user) {
            await fakePasswordCompare();
            console.log('Login failed: User not found for email:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.isLocked) {
            console.log('Login failed: Account locked for email:', email);
            return res.status(423).json({ 
                message: 'Account temporarily locked due to too many failed attempts. Please try again later.' 
            });
        }

        const isPasswordValid = await user.matchPassword(password);
        
        if (!isPasswordValid) {
            console.log(`Failed login attempt for: ${email} from IP: ${req.ip}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log(`Successful login for: ${user.email} (${user.role}) from IP: ${req.ip}`);
        
        const token = generateToken(user._id, user.role);
        
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        user.lastLogin = new Date();
        await user.save();

        // 🚨 Now user.store will contain the actual store data
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: token,
            store: user.store, // ← This now has {_id, name, slug, isActive}
            expiresIn: '24h',
            message: `Login successful! Welcome ${user.name}`
        });
    } catch (error) {
        console.error('Error during login process:', error.message);
        res.status(500).json({ message: 'Server error during authentication' });
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
    // @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id)
            .select('-password -loginAttempts -lockUntil')
            .populate('store', 'name slug isActive'); // ← ADD isActive
        
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            _id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            store: currentUser.store, // ← Populated store data
            lastLogin: currentUser.lastLogin
        });
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
});

// @desc    Refresh token (for enhanced security)
// @route   POST /api/auth/refresh
// @access  Private
router.post('/refresh', protect, async (req, res) => {
    try {
        // Verify the user still exists and is active
        const currentUser = await User.findById(req.user._id);
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newToken = generateToken(req.user._id, req.user.role);
        
        // Update the HTTP-only cookie
        res.cookie('auth_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({ 
            token: newToken,
            expiresIn: '24h',
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        console.error('Token refresh error:', error.message);
        res.status(500).json({ message: 'Server error during token refresh' });
    }
});

// @desc    Logout user (clear token)
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, (req, res) => {
    try {
        // Clear the HTTP-only cookie
        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        console.log(`User logged out: ${req.user.email}`);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error.message);
        res.status(500).json({ message: 'Server error during logout' });
    }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
    }

    try {
        // Validate new password strength
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({ 
                message: 'New password must contain at least one uppercase letter, one lowercase letter, and one number' 
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.matchPassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        console.log(`Password changed for user: ${user.email}`);

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error.message);
        res.status(500).json({ message: 'Server error while changing password' });
    }
});

// @desc    Check if superadmin exists (for initial setup)
// @route   GET /api/auth/check-superadmin
// @access  Public
router.get('/check-superadmin', async (req, res) => {
    try {
        const superadminExists = await User.findOne({ role: 'superadmin' });
        
        res.json({ 
            superadminExists: !!superadminExists,
            canRegister: !superadminExists
        });
    } catch (error) {
        console.error('Error checking superadmin:', error.message);
        res.status(500).json({ message: 'Server error while checking superadmin status' });
    }
});

// @desc    Validate token (for frontend to check if still valid)
// @route   GET /api/auth/validate
// @access  Private
router.get('/validate', protect, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id)
            .select('-password -loginAttempts -lockUntil')
            .populate('store', 'name slug');
        
        if (!currentUser) {
            return res.status(404).json({ valid: false, message: 'User not found' });
        }

        res.json({
            valid: true,
            user: {
                _id: currentUser._id,
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role,
                store: currentUser.store
            }
        });
    } catch (error) {
        console.error('Token validation error:', error.message);
        res.status(500).json({ valid: false, message: 'Server error during token validation' });
    }
});

// @desc    Get all active sessions (for superadmin monitoring)
// @route   GET /api/auth/active-sessions
// @access  Private (Superadmin only)
router.get('/active-sessions', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        // Get users who have logged in recently (last 24 hours)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const activeUsers = await User.find({
            lastLogin: { $gte: twentyFourHoursAgo }
        })
        .select('name email role lastLogin loginAttempts')
        .sort({ lastLogin: -1 });

        res.json({
            activeSessions: activeUsers.length,
            users: activeUsers
        });
    } catch (error) {
        console.error('Error fetching active sessions:', error.message);
        res.status(500).json({ message: 'Server error while fetching active sessions' });
    }
});

module.exports = router;