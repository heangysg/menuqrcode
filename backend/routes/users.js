// qr-digital-menu-system/backend/routes/users.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { protect, authorizeRoles, verifySuperadminPassword, requireRecentAuth } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');
const mongoose = require('mongoose');

// Enhanced rate limiting for user management
const userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
        error: 'Too many user management requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false,
});

// Stricter rate limiting for destructive operations
const destructiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Very low limit for delete operations
    message: {
        error: 'Too many destructive operations, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Enhanced input validation middleware - SIMPLIFIED AND FIXED
const validateAdminRegistration = (req, res, next) => {
    const { name, email, password, confirmPassword } = req.body;

    console.log('🔍 ADMIN REGISTRATION VALIDATION:', { 
        name: name ? 'provided' : 'missing', 
        email: email ? 'provided' : 'missing',
        password: password ? '***' : 'missing', 
        confirmPassword: confirmPassword ? '***' : 'missing' 
    });

    // Check for missing fields
    if (!name || !email || !password || !confirmPassword) {
        console.log('❌ Missing fields:', { name: !name, email: !email, password: !password, confirmPassword: !confirmPassword });
        return res.status(400).json({ message: 'Please enter all required fields' });
    }

    // Check password confirmation for security
    if (password !== confirmPassword) {
        console.log('❌ Password confirmation failed');
        return res.status(400).json({ message: 'Password and confirmation do not match' });
    }

    // Sanitize and validate name
    const sanitizedName = sanitizeHtml(name.trim(), {
        allowedTags: [],
        allowedAttributes: {},
        allowedIframeHostnames: []
    });

    if (sanitizedName.length < 2 || sanitizedName.length > 50) {
        return res.status(400).json({ message: 'Name must be between 2 and 50 characters' });
    }

    // Sanitize and validate email
    const sanitizedEmail = email.trim().toLowerCase();

    if (!validator.isEmail(sanitizedEmail)) {
        return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Enhanced password strength validation - SIMPLIFIED FOR TESTING
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    req.body.name = sanitizedName;
    req.body.email = sanitizedEmail;

    console.log('✅ ADMIN REGISTRATION VALIDATION PASSED');
    next();
};

// Slug validation middleware
const validateSlug = (req, res, next) => {
    const { slug } = req.body;
    
    if (slug) {
        // Validate slug format
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(slug)) {
            return res.status(400).json({ 
                message: 'Slug can only contain lowercase letters, numbers, and hyphens' 
            });
        }
        
        if (slug.length < 2 || slug.length > 50) {
            return res.status(400).json({ 
                message: 'Slug must be between 2 and 50 characters' 
            });
        }
        
        req.body.slug = slug.toLowerCase().trim();
    }
    
    next();
};

const validateAdminUpdate = (req, res, next) => {
    const { name, email, password, confirmPassword } = req.body;

    console.log('🔍 ADMIN UPDATE VALIDATION:', { 
        name: name ? 'provided' : 'not provided', 
        email: email ? 'provided' : 'not provided',
        password: password ? '***' : 'not provided' 
    });

    // Validate name if provided
    if (name) {
        const sanitizedName = sanitizeHtml(name.trim(), {
            allowedTags: [],
            allowedAttributes: {},
            allowedIframeHostnames: []
        });

        if (sanitizedName.length < 2 || sanitizedName.length > 50) {
            return res.status(400).json({ message: 'Name must be between 2 and 50 characters' });
        }

        req.body.name = sanitizedName;
    }

    // Validate email if provided
    if (email) {
        const sanitizedEmail = email.trim().toLowerCase();
        
        if (!validator.isEmail(sanitizedEmail)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        req.body.email = sanitizedEmail;
    }

    // Validate password if provided
    if (password) {
        if (!confirmPassword) {
            return res.status(400).json({ message: 'Password confirmation is required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Password and confirmation do not match' });
        }

        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
    }

    console.log('✅ ADMIN UPDATE VALIDATION PASSED');
    next();
};

// Security: Check if superadmin is modifying their own account
const preventSelfModification = (req, res, next) => {
    if (req.params.id && req.params.id === req.user._id.toString()) {
        return res.status(403).json({ message: 'Cannot modify your own account through this endpoint' });
    }
    next();
};

// Security: Log user management actions
const logUserAction = (action, targetUserId, performedBy) => {
    console.log(`👤 USER_MANAGEMENT: ${action} - Target: ${targetUserId} - Performed by: ${performedBy} - Time: ${new Date().toISOString()}`);
};

// @desc    Register a new admin by Superadmin
// @route   POST /api/users/register-admin
// @access  Private (Superadmin only)
router.post('/register-admin', userLimiter, protect, authorizeRoles('superadmin'), requireRecentAuth(5), validateAdminRegistration, validateSlug, async (req, res) => {
    const { name, email, password, slug } = req.body;

    console.log('🚀 === ADMIN REGISTRATION START ===');
    console.log('Creating admin:', { name, email, slug });

    const session = await mongoose.startSession();
    
    try {
        await session.withTransaction(async () => {
            // Additional security: Check if email is already in use
            const userExists = await User.findOne({ email }).session(session);
            console.log('🔍 User exists check:', userExists ? `User found: ${userExists.email}` : 'No user found');
            
            if (userExists) {
                logUserAction('REGISTRATION_ATTEMPT_DUPLICATE_EMAIL', email, req.user._id);
                throw new Error('User with this email already exists.');
            }

            // Check if slug is already in use (if provided)
            if (slug) {
                const slugExists = await Store.findOne({ slug }).session(session);
                if (slugExists) {
                    throw new Error('Slug is already in use by another store.');
                }
            }

            // Security: Limit the number of admins that can be created
            const adminCount = await User.countDocuments({ role: 'admin' }).session(session);
            const maxAdmins = process.env.MAX_ADMINS || 50;
            
            console.log('📊 Admin count check:', { adminCount, maxAdmins });
            
            if (adminCount >= maxAdmins) {
                throw new Error(`Maximum admin limit reached (${maxAdmins}). Cannot create more admin accounts.`);
            }

            console.log('👤 Creating user document...');
            // Create user with hashed password
            const user = new User({
                name,
                email,
                password,
                role: 'admin',
            });

            console.log('💾 Saving user...');
            await user.save({ session });
            console.log('✅ User saved successfully:', user._id);

            // Create an empty store for the new admin
            console.log('🏪 Creating store...');
            const publicUrlId = uuidv4();
            const storeName = `${name}'s Store`;
            
            // Use provided slug or generate a fallback
            let finalSlug = slug;
            if (!finalSlug) {
                // Fallback: generate from name if no slug provided
                finalSlug = slugify(storeName, { 
                    lower: true, 
                    strict: true,
                    remove: /[*+~.()'"!:@]/g 
                });
                
                // Ensure slug is unique
                let counter = 1;
                let baseSlug = finalSlug;
                while (await Store.findOne({ slug: finalSlug }).session(session)) {
                    finalSlug = `${baseSlug}-${counter}`;
                    counter++;
                }
            }

            const store = new Store({
                admin: user._id,
                name: storeName,
                slug: finalSlug, // Use the custom or generated slug
                publicUrlId: publicUrlId,
                isActive: true
            });

            await store.save({ session });
            console.log('✅ Store created:', { id: store._id, name: store.name, slug: store.slug });

            // Link the store to the admin user - THIS IS CRITICAL
            user.store = store._id;
            await user.save({ session });
            console.log('✅ User updated with store reference:', user.store);

            // Security logging
            logUserAction('ADMIN_REGISTERED', user._id, req.user._id);

            console.log('🎉 === ADMIN REGISTRATION SUCCESS ===');
            
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                slug: store.slug, // Return the slug
                storeId: store._id,
                storeName: store.name,
                storeSlug: store.slug,
                publicMenuUrl: `/menu/${store.slug}`,
                createdAt: user.createdAt
            });
        });
    } catch (error) {
        console.error('💥 === ADMIN REGISTRATION ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email already registered.' });
        }
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: `Validation error: ${errors.join(', ')}` });
        }
        
        res.status(500).json({ 
            message: error.message || 'Server error during admin registration.'
        });
    } finally {
        session.endSession();
    }
});

// @desc    Update store slug for an admin
// @route   PUT /api/users/:id/store-slug
// @access  Private (Superadmin only)
router.put('/:id/store-slug', userLimiter, protect, authorizeRoles('superadmin'), requireRecentAuth(5), preventSelfModification, validateSlug, async (req, res) => {
    const { slug } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        // Find the admin and their store
        const admin = await User.findById(req.params.id).populate('store');
        
        if (!admin || admin.role !== 'admin') {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (!admin.store) {
            return res.status(404).json({ message: 'Store not found for this admin' });
        }

        // Check if slug is already in use by another store
        if (slug && slug !== admin.store.slug) {
            const existingSlug = await Store.findOne({ 
                slug, 
                _id: { $ne: admin.store._id } 
            });
            
            if (existingSlug) {
                return res.status(409).json({ message: 'Slug is already in use by another store' });
            }
        }

        // Update store slug
        admin.store.slug = slug;
        await admin.store.save();

        // Security logging
        logUserAction('STORE_SLUG_UPDATED', admin._id, req.user._id);

        res.json({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            store: {
                id: admin.store._id,
                name: admin.store.name,
                slug: admin.store.slug,
                publicUrl: `/menu/${admin.store.slug}`
            },
            message: 'Store slug updated successfully'
        });

    } catch (error) {
        console.error('Error updating store slug:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: `Validation error: ${errors.join(', ')}` });
        }
        
        res.status(500).json({ message: 'Server error while updating store slug' });
    }
});

// @desc    Get all admins (excluding superadmin)
// @route   GET /api/users
// @access  Private (Superadmin only)
router.get('/', userLimiter, protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        console.log('📋 Fetching admins list...');
        
        // Enhanced pagination with limits
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        // Build query with additional security
        const query = { role: 'admin' };

        // Optional search functionality
        if (req.query.search && typeof req.query.search === 'string') {
            const searchRegex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
            console.log('🔍 Search query:', req.query.search);
        }

        const admins = await User.find(query)
            .select('-password -loginAttempts -lockUntil')
            .populate('store', 'name slug isActive lastActive')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        // Security: Log admin list access
        logUserAction('ADMIN_LIST_ACCESS', 'multiple', req.user._id);

        console.log(`✅ Found ${admins.length} admins out of ${total} total`);

        res.json({
            admins,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching admins:', error);
        res.status(500).json({ message: 'Server error while fetching admins' });
    }
});

// @desc    Get a single admin by ID
// @route   GET /api/users/:id
// @access  Private (Superadmin only)
router.get('/:id', userLimiter, protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        console.log('👤 Fetching admin by ID:', req.params.id);
        
        // Enhanced ID validation
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const admin = await User.findById(req.params.id)
            .select('-password -loginAttempts -lockUntil')
            .populate('store', 'name slug description phone address isActive lastActive');

        if (admin && admin.role === 'admin') {
            // Security logging
            logUserAction('ADMIN_DETAILS_ACCESS', admin._id, req.user._id);
            
            console.log('✅ Admin found:', admin.email);
            res.json(admin);
        } else {
            console.log('❌ Admin not found or not an admin');
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (error) {
        console.error('❌ Error fetching admin:', error);
        res.status(500).json({ message: 'Server error while fetching admin' });
    }
});

// @desc    Update an admin user by ID
// @route   PUT /api/users/:id
// @access  Private (Superadmin only)
router.put('/:id', userLimiter, protect, authorizeRoles('superadmin'), requireRecentAuth(5), preventSelfModification, validateAdminUpdate, async (req, res) => {
    const { name, email, password } = req.body;

    console.log('✏️ Updating admin:', req.params.id);

    try {
        // Enhanced ID validation
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const admin = await User.findById(req.params.id);

        if (admin && admin.role === 'admin') {
            // Store original values for logging
            const originalValues = {
                name: admin.name,
                email: admin.email
            };

            admin.name = name || admin.name;
            admin.email = email || admin.email;

            if (password) {
                admin.password = password;
                console.log('🔑 Password will be updated');
            }

            const updatedAdmin = await admin.save();

            // Security logging
            logUserAction('ADMIN_UPDATED', admin._id, req.user._id);

            console.log('✅ Admin updated successfully');

            res.json({
                _id: updatedAdmin._id,
                name: updatedAdmin.name,
                email: updatedAdmin.email,
                role: updatedAdmin.role,
                updatedAt: updatedAdmin.updatedAt
            });
        } else {
            console.log('❌ Admin not found for update');
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (error) {
        console.error('❌ Error updating admin:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Email already in use by another user.' });
        }
        res.status(500).json({ message: 'Server error while updating admin' });
    }
});

// @desc    Delete an admin user by ID
// @route   DELETE /api/users/:id
// @access  Private (Superadmin only)
router.delete('/:id', destructiveLimiter, protect, authorizeRoles('superadmin'), requireRecentAuth(5), preventSelfModification, async (req, res) => {
    try {
        console.log('🗑️ DELETE ADMIN REQUEST:', {
            adminId: req.params.id,
            body: { ...req.body, password: req.body.password ? '***' : 'missing', confirmPassword: req.body.confirmPassword ? '***' : 'missing' }
        });

        // Enhanced ID validation
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }

        const admin = await User.findById(req.params.id);

        if (admin && admin.role === 'admin') {
            // Security: Additional confirmation for deletion
            if (!req.body.confirmDelete) {
                console.log('❌ Missing confirmDelete');
                return res.status(400).json({ 
                    message: 'Deletion confirmation required. Please confirm you want to delete this admin and all associated data.' 
                });
            }

            // Check for password in request
            if (!req.body.password || !req.body.confirmPassword) {
                console.log('❌ Missing password fields');
                return res.status(400).json({ 
                    message: 'Password confirmation is required for this destructive operation' 
                });
            }

            // Verify superadmin password manually
            const superadmin = await User.findById(req.user._id).select('+password');
            const isPasswordValid = await superadmin.matchPassword(req.body.password);
            
            if (!isPasswordValid) {
                console.log('❌ Invalid superadmin password');
                return res.status(401).json({ message: 'Invalid password' });
            }

            // Store admin info for logging before deletion
            const adminInfo = {
                id: admin._id,
                email: admin.email,
                name: admin.name
            };

            console.log('🔄 Starting deletion transaction...');

            // Use transaction for data consistency
            const session = await mongoose.startSession();
            
            try {
                await session.withTransaction(async () => {
                    // Delete all products associated with the store
                    const productsDeleted = await Product.deleteMany({ store: admin.store }).session(session);
                    console.log(`🗑️ Deleted ${productsDeleted.deletedCount} products`);
                    
                    // Delete all categories associated with the store
                    const categoriesDeleted = await Category.deleteMany({ store: admin.store }).session(session);
                    console.log(`🗑️ Deleted ${categoriesDeleted.deletedCount} categories`);
                    
                    // Delete the store
                    await Store.findByIdAndDelete(admin.store).session(session);
                    console.log('🗑️ Store deleted');
                    
                    // Finally delete the admin user
                    await User.deleteOne({ _id: admin._id }).session(session);
                    console.log('🗑️ Admin user deleted');
                });

                session.endSession();

                // Security logging
                logUserAction('ADMIN_DELETED', adminInfo.id, req.user._id);
                console.log(`✅ Admin deletion completed: ${adminInfo.email} (${adminInfo.name}) - All associated data removed`);

                res.json({ 
                    message: 'Admin and all associated data removed successfully',
                    deletedAdmin: {
                        id: adminInfo.id,
                        email: adminInfo.email,
                        name: adminInfo.name
                    }
                });
            } catch (transactionError) {
                await session.abortTransaction();
                session.endSession();
                console.error('❌ Transaction error:', transactionError);
                throw transactionError;
            }
        } else {
            console.log('❌ Admin not found for deletion');
            res.status(404).json({ message: 'Admin not found' });
        }
    } catch (error) {
        console.error('❌ Error deleting admin:', error);
        res.status(500).json({ message: 'Server error while deleting admin' });
    }
});

// @desc    Get admin statistics
// @route   GET /api/users/stats/admins
// @access  Private (Superadmin only)
router.get('/stats/admins', userLimiter, protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        console.log('📊 Fetching admin statistics...');
        
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const activeAdmins = await User.countDocuments({ 
            role: 'admin',
            isLocked: { $ne: true }
        });
        const recentAdmins = await User.countDocuments({
            role: 'admin',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        });

        const stats = {
            totalAdmins,
            activeAdmins,
            lockedAdmins: totalAdmins - activeAdmins,
            recentAdmins,
            maxAdmins: process.env.MAX_ADMINS || 50
        };

        console.log('✅ Admin statistics:', stats);

        res.json(stats);
    } catch (error) {
        console.error('❌ Error fetching admin statistics:', error);
        res.status(500).json({ message: 'Server error while fetching statistics' });
    }
});

module.exports = router;