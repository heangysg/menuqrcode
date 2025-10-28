// qr-digital-menu-system/backend/routes/categories.js

const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Store = require('../models/Store');
const { protect, authorizeRoles, getAdminStoreId } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

// Rate limiting for category routes
const categoryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many category requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Input validation middleware
const validateCategory = (req, res, next) => {
    const { name, order } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
    }

    // Sanitize and validate name
    const sanitizedName = sanitizeHtml(name.trim(), {
        allowedTags: [],
        allowedAttributes: {},
        allowedIframeHostnames: []
    });

    if (sanitizedName.length < 2 || sanitizedName.length > 50) {
        return res.status(400).json({ message: 'Category name must be between 2 and 50 characters' });
    }

    if (!/^[a-zA-Z0-9\s\u1780-\u17FF\u0E00-\u0E7F\-_&.,()]+$/.test(sanitizedName)) {
        return res.status(400).json({ message: 'Category name contains invalid characters' });
    }

    // Validate order if provided
    if (order !== undefined && order !== null) {
        const orderNum = parseInt(order);
        if (isNaN(orderNum) || orderNum < 0 || orderNum > 1000) {
            return res.status(400).json({ message: 'Order must be a number between 0 and 1000' });
        }
        req.body.order = orderNum;
    }

    req.body.name = sanitizedName;
    next();
};

// ==================== PUBLIC ROUTES ====================

// @desc    Get all SUPERADMIN categories for website (PUBLIC) - ONLY superadmin categories
// @route   GET /api/categories/website
// @access  Public
router.get('/website', categoryLimiter, async (req, res) => {
    try {
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        
        // Only get active superadmin categories
        const categories = await Category.find({ 
            store: { $exists: false },
            isActive: true
        })
        .select('name order')
        .sort('order name')
        .limit(limit);
        
        res.json(categories);
    } catch (error) {
        console.error('Error fetching website categories:', error);
        res.status(500).json({ message: 'Server error while fetching categories' });
    }
});

                    // qr-digital-menu-system/backend/routes/categories.js

// ... ALL THE PREVIOUS CODE REMAINS THE SAME UNTIL SUPERADMIN ROUTES ...

// ==================== SUPERADMIN ROUTES (ONLY GLOBAL CATEGORIES) ====================

// @desc    Get all categories for superadmin (ONLY superadmin categories)
// @route   GET /api/categories/superadmin
// @access  Private (Superadmin only)
router.get('/superadmin', categoryLimiter, protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        // FIXED: Only get categories WITHOUT store field (superadmin categories only)
        const categories = await Category.find({ 
            store: { $exists: false } // ONLY superadmin categories
        })
        .select('-__v')
        .sort('order name')
        .skip(skip)
        .limit(limit);

        const total = await Category.countDocuments({ 
            store: { $exists: false } // ONLY superadmin categories
        });

        res.json({
            categories,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching superadmin categories:', error);
        res.status(500).json({ message: 'Server error while fetching categories' });
    }
});

        // In backend/routes/categories.js - FIX THE SUPERADMIN CREATE ROUTE

// @desc    Create category for superadmin (GLOBAL category - no store)
// @route   POST /api/categories/superadmin
// @access  Private (Superadmin only)
router.post('/superadmin', categoryLimiter, protect, authorizeRoles('superadmin'), validateCategory, async (req, res) => {
    const { name, order } = req.body;

    try {
        // FIXED: Check if category name already exists (superadmin only)
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            store: { $exists: false } // MUST be superadmin category
        });
        
        // FIX THIS CONDITION - it was inverted!
        if (existingCategory) { // ← CHANGED FROM !existingCategory
            return res.status(409).json({ message: 'Category name already exists' });
        }

        // FIXED: Create category WITHOUT store field (superadmin category only)
        const category = await Category.create({
            name,
            order: order || 0,
            isActive: true
            // NO store field - this identifies it as superadmin category
        });

        res.status(201).json({
            _id: category._id,
            name: category.name,
            order: category.order,
            isActive: category.isActive,
            createdAt: category.createdAt
        });
    } catch (error) {
        console.error('Error creating category as superadmin:', error);
        res.status(500).json({ message: 'Server error while creating category' });
    }
});

// @desc    Update category for superadmin (ONLY superadmin categories)
// @route   PUT /api/categories/superadmin/:id
// @access  Private (Superadmin only)
router.put('/superadmin/:id', categoryLimiter, protect, authorizeRoles('superadmin'), validateCategory, async (req, res) => {
    const { name, order, isActive } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid category ID format' });
        }

        // FIXED: Only allow updating superadmin categories (no store field)
        const category = await Category.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } // MUST be superadmin category
        });
        
        if (!category) {
            return res.status(404).json({ message: 'Superadmin category not found' });
        }

        // FIXED: If name is being updated, check for duplicates within superadmin categories
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                store: { $exists: false }, // MUST be superadmin category
                _id: { $ne: req.params.id }
            });
            
            if (existingCategory) {
                return res.status(409).json({ message: 'Category name already exists' });
            }
            category.name = name;
        }

        if (order !== undefined) {
            category.order = order;
        }

        if (isActive !== undefined) {
            category.isActive = isActive;
        }

        const updatedCategory = await category.save();

        res.json({
            _id: updatedCategory._id,
            name: updatedCategory.name,
            order: updatedCategory.order,
            isActive: updatedCategory.isActive,
            updatedAt: updatedCategory.updatedAt
        });
    } catch (error) {
        console.error('Error updating category as superadmin:', error);
        res.status(500).json({ message: 'Server error while updating category' });
    }
});

// @desc    Delete category for superadmin (ONLY superadmin categories)
// @route   DELETE /api/categories/superadmin/:id
// @access  Private (Superadmin only)
router.delete('/superadmin/:id', categoryLimiter, protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid category ID format' });
        }

        // FIXED: Only allow deleting superadmin categories (no store field)
        const category = await Category.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } // MUST be superadmin category
        });
        
        if (!category) {
            return res.status(404).json({ message: 'Superadmin category not found' });
        }

        // FIXED: Check if category has superadmin products
        const Product = require('../models/Product');
        const productsCount = await Product.countDocuments({ 
            category: req.params.id,
            store: { $exists: false } // ONLY superadmin products
        });
        
        if (productsCount > 0) {
            return res.status(409).json({ 
                message: `Cannot delete category. There are ${productsCount} superadmin products associated with this category.` 
            });
        }

        const categoryInfo = {
            id: category._id,
            name: category.name
        };

        await Category.deleteOne({ _id: req.params.id });

        res.json({ 
            message: 'Superadmin category removed successfully',
            deletedCategory: {
                id: categoryInfo.id,
                name: categoryInfo.name
            }
        });
    } catch (error) {
        console.error('Error deleting category as superadmin:', error);
        res.status(500).json({ message: 'Server error while deleting category' });
    }
});

// ... THE REST OF THE FILE REMAINS THE SAME ...

// ==================== ADMIN/STORE ROUTES ====================

// @desc    Get all categories for the authenticated admin's store
// @route   GET /api/categories/my-store
// @access  Private (Admin only)
router.get('/my-store', categoryLimiter, protect, authorizeRoles('admin', 'superadmin'), getAdminStoreId, async (req, res) => {
    try {
        const categories = await Category.find({ 
            store: req.storeId
        })
        .select('name order isActive')
        .sort('order name');

        // Return as array directly (not wrapped in object)
        res.json(categories);
    } catch (error) {
        console.error('Error fetching admin store categories:', error);
        res.status(500).json({ message: 'Server error while fetching categories' });
    }
});

// @desc    Add a new category (Admin)
// @route   POST /api/categories
// @access  Private (Admin only)
router.post('/', categoryLimiter, protect, authorizeRoles('admin', 'superadmin'), getAdminStoreId, validateCategory, async (req, res) => {
    const { name, order } = req.body;

    try {
        // Check if category name already exists for this store
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') }, 
            store: req.storeId
        });
        
        if (existingCategory) {
            return res.status(409).json({ message: 'Category name already exists for your store' });
        }

        const category = await Category.create({
            name,
            order: order || 0,
            store: req.storeId,
            isActive: true
        });

        res.status(201).json({
            _id: category._id,
            name: category.name,
            order: category.order,
            isActive: category.isActive,
            createdAt: category.createdAt
        });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ message: 'Server error while creating category' });
    }
});

// @desc    Update a category (Admin)
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
router.put('/:id', categoryLimiter, protect, authorizeRoles('admin', 'superadmin'), getAdminStoreId, validateCategory, async (req, res) => {
    const { name, order, isActive } = req.body;

    try {
        // Validate category ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid category ID format' });
        }

        const category = await Category.findOne({ 
            _id: req.params.id, 
            store: req.storeId 
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or you do not own this category.' });
        }

        // If name is being updated, check for duplicates within this store
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') }, 
                store: req.storeId,
                _id: { $ne: req.params.id }
            });
            
            if (existingCategory) {
                return res.status(409).json({ message: 'Category name already exists for your store' });
            }
            category.name = name;
        }

        if (order !== undefined) {
            category.order = order;
        }

        if (isActive !== undefined) {
            category.isActive = isActive;
        }

        const updatedCategory = await category.save();

        res.json({
            _id: updatedCategory._id,
            name: updatedCategory.name,
            order: updatedCategory.order,
            isActive: updatedCategory.isActive,
            updatedAt: updatedCategory.updatedAt
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Server error while updating category' });
    }
});

// @desc    Delete a category (Admin)
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
router.delete('/:id', categoryLimiter, protect, authorizeRoles('admin', 'superadmin'), getAdminStoreId, async (req, res) => {
    try {
        // Validate category ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid category ID format' });
        }

        const category = await Category.findOne({ 
            _id: req.params.id, 
            store: req.storeId 
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or you do not own this category.' });
        }

        // Check if category has products within this store
        const Product = require('../models/Product');
        const productsCount = await Product.countDocuments({ 
            category: req.params.id, 
            store: req.storeId
        });
        
        if (productsCount > 0) {
            return res.status(409).json({ 
                message: `Cannot delete category. There are ${productsCount} products in your store associated with this category.` 
            });
        }

        const categoryInfo = {
            id: category._id,
            name: category.name
        };

        await Category.deleteOne({ _id: req.params.id });

        res.json({ 
            message: 'Category removed successfully',
            deletedCategory: {
                id: categoryInfo.id,
                name: categoryInfo.name
            }
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Server error while deleting category' });
    }
});

// ==================== PUBLIC STORE ROUTES ====================

// @desc    Get categories for a public store (by store ID)
// @route   GET /api/categories/public-store/:storeId
// @access  Public
router.get('/public-store/:storeId', categoryLimiter, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.storeId)) {
            return res.status(400).json({ message: 'Invalid store ID format' });
        }

        // Check if store exists and is active
        const store = await Store.findById(req.params.storeId).select('isActive');
        if (!store || !store.isActive) {
            return res.status(404).json({ message: 'Store not found or inactive' });
        }

        const categories = await Category.find({ 
            store: req.params.storeId,
            isActive: true
        })
        .select('name order')
        .sort('order name');
        
        res.json(categories);
    } catch (error) {
        console.error('Error fetching public store categories:', error);
        res.status(500).json({ message: 'Server error while fetching categories' });
    }
});

// @desc    Get categories by store slug
// @route   GET /api/categories/store/slug/:slug
// @access  Public
router.get('/store/slug/:slug', categoryLimiter, async (req, res) => {
    try {
        const store = await Store.findOne({ 
            slug: req.params.slug,
            isActive: true
        }).select('_id name');
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const allCategories = await Category.find({ 
            store: store._id
        })
        .select('name order _id isActive')
        .sort('order name');

        // Only return active categories
        const activeCategories = allCategories.filter(cat => cat.isActive !== false);
        
        res.json(activeCategories);
    } catch (error) {
        console.error('Error fetching store categories by slug:', error);
        res.status(500).json({ message: 'Server error while fetching categories' });
    }
});

module.exports = router;