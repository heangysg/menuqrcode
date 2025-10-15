// qr-digital-menu-system/backend/routes/categories.js

const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Store = require('../models/Store');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Middleware to get the admin's store ID and ensure they own it
const getAdminStoreId = async (req, res, next) => {
    try {
        const store = await Store.findOne({ admin: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'No store found for this admin.' });
        }
        req.storeId = store._id;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin store.', error: error.message });
    }
};

// ==================== PUBLIC ROUTES ====================

// @desc    Get all SUPERADMIN categories for website (PUBLIC) - ONLY superadmin categories
// @route   GET /api/categories/website
// @access  Public
router.get('/website', async (req, res) => {
    try {
        console.log('Fetching SUPERADMIN categories for website...');
        // Only get categories that don't have a store field (superadmin categories)
        const categories = await Category.find({ 
            store: { $exists: false } // Only categories without store field (superadmin categories)
        }).sort('order name');
        
        console.log(`Found ${categories.length} SUPERADMIN categories`);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching website categories:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== SUPERADMIN ROUTES ====================

// @desc    Get all categories for superadmin (ONLY superadmin categories)
// @route   GET /api/categories/superadmin
// @access  Private (Superadmin only)
router.get('/superadmin', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        // Only get categories that don't have a store field (superadmin categories)
        const categories = await Category.find({ store: { $exists: false } }).sort('order name');
        res.json(categories);
    } catch (error) {
        console.error('Error fetching superadmin categories:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create category for superadmin
// @route   POST /api/categories/superadmin
// @access  Private (Superadmin only)
router.post('/superadmin', protect, authorizeRoles('superadmin'), async (req, res) => {
    const { name, order } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Please add a category name' });
    }

    try {
        // Check if category name already exists (only for superadmin categories)
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            store: { $exists: false } // Only check among superadmin categories
        });
        
        if (existingCategory) {
            return res.status(400).json({ message: 'Category name already exists' });
        }

        const category = await Category.create({
            name,
            order: order || 0
            // NO store field - this identifies it as superadmin category
        });

        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category as superadmin:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update category for superadmin
// @route   PUT /api/categories/superadmin/:id
// @access  Private (Superadmin only)
router.put('/superadmin/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    const { name, order } = req.body;

    try {
        // Only allow updating superadmin categories (no store field)
        const category = await Category.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } 
        });
        
        if (!category) {
            return res.status(404).json({ message: 'Superadmin category not found' });
        }

        // If name is being updated, check for duplicates (only in superadmin categories)
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                store: { $exists: false }, // Only check among superadmin categories
                _id: { $ne: req.params.id }
            });
            
            if (existingCategory) {
                return res.status(400).json({ message: 'Category name already exists' });
            }
            category.name = name;
        }

        if (order !== undefined) {
            category.order = order;
        }

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating category as superadmin:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete category for superadmin
// @route   DELETE /api/categories/superadmin/:id
// @access  Private (Superadmin only)
router.delete('/superadmin/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        // Only allow deleting superadmin categories (no store field)
        const category = await Category.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } 
        });
        
        if (!category) {
            return res.status(404).json({ message: 'Superadmin category not found' });
        }

        // Check if category has products (only superadmin products)
        const Product = require('../models/Product');
        const productsCount = await Product.countDocuments({ 
            category: req.params.id,
            store: { $exists: false } // Only count superadmin products
        });
        
        if (productsCount > 0) {
            return res.status(400).json({ 
                message: `Cannot delete category. There are ${productsCount} superadmin products associated with this category.` 
            });
        }

        await Category.deleteOne({ _id: req.params.id });
        res.json({ message: 'Superadmin category removed' });
    } catch (error) {
        console.error('Error deleting category as superadmin:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== ADMIN/STORE ROUTES ====================

// @desc    Get all categories for the authenticated admin's store
// @route   GET /api/categories/my-store
// @access  Private (Admin only)
router.get('/my-store', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        // Only get categories that belong to this specific store
        const categories = await Category.find({ store: req.storeId }).sort('order name');
        res.json(categories);
    } catch (error) {
        console.error('Error fetching admin store categories:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add a new category (Admin)
// @route   POST /api/categories
// @access  Private (Admin only)
router.post('/', protect, authorizeRoles('superadmin', 'admin'), getAdminStoreId, async (req, res) => {
    const { name, order } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Please add a category name' });
    }

    try {
        // Check if category name already exists for this store
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') }, 
            store: req.storeId // Only check within this store
        });
        
        if (existingCategory) {
            return res.status(400).json({ message: 'Category name already exists for your store' });
        }

        const category = await Category.create({
            name,
            order: order || 0,
            store: req.storeId, // This identifies it as store category
        });

        res.status(201).json(category);
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update a category (Admin)
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    const { name, order } = req.body;

    try {
        const category = await Category.findOne({ _id: req.params.id, store: req.storeId });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or you do not own this category.' });
        }

        // If name is being updated, check for duplicates within this store
        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') }, 
                store: req.storeId, // Only check within this store
                _id: { $ne: req.params.id }
            });
            
            if (existingCategory) {
                return res.status(400).json({ message: 'Category name already exists for your store' });
            }
            category.name = name;
        }

        if (order !== undefined) {
            category.order = order;
        }

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a category (Admin)
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorizeRoles('superadmin', 'admin'), getAdminStoreId, async (req, res) => {
    try {
        const category = await Category.findOne({ _id: req.params.id, store: req.storeId });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or you do not own this category.' });
        }

        // Check if category has products within this store
        const Product = require('../models/Product');
        const productsCount = await Product.countDocuments({ 
            category: req.params.id, 
            store: req.storeId // Only count products from this store
        });
        
        if (productsCount > 0) {
            return res.status(400).json({ 
                message: `Cannot delete category. There are ${productsCount} products in your store associated with this category.` 
            });
        }

        await Category.deleteOne({ _id: req.params.id });
        res.json({ message: 'Category removed' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get categories for a public store (by store ID)
// @route   GET /api/categories/public-store/:storeId
// @access  Public
router.get('/public-store/:storeId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.storeId)) {
            return res.status(400).json({ message: 'Invalid store ID format' });
        }

        // Only get categories that belong to this specific store
        const categories = await Category.find({ 
            store: req.params.storeId 
        }).sort('order name');
        
        res.json(categories);
    } catch (error) {
        console.error('Error fetching public store categories:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== BACKWARD COMPATIBILITY ROUTES ====================

// @desc    Get categories for a store (backward compatibility - for existing store menus)
// @route   GET /api/categories/store/:storeId
// @access  Public
router.get('/store/:storeId', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.storeId)) {
            return res.status(400).json({ message: 'Invalid store ID format' });
        }

        console.log('Fetching categories for store (compatibility route):', req.params.storeId);
        
        // Only get categories that belong to this specific store
        const categories = await Category.find({ 
            store: req.params.storeId 
        }).sort('order name');
        
        console.log(`Found ${categories.length} categories for store`);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching store categories (compatibility):', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get categories by store slug (backward compatibility)
// @route   GET /api/categories/store/slug/:slug
// @access  Public
router.get('/store/slug/:slug', async (req, res) => {
    try {
        console.log('Fetching categories for store by slug (compatibility):', req.params.slug);
        
        // First find the store by slug
        const store = await Store.findOne({ slug: req.params.slug });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Then get categories for this store
        const categories = await Category.find({ 
            store: store._id 
        }).sort('order name');
        
        console.log(`Found ${categories.length} categories for store slug`);
        res.json(categories);
    } catch (error) {
        console.error('Error fetching store categories by slug (compatibility):', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;