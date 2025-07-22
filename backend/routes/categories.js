// qr-digital-menu-system/backend/routes/categories.js

const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Store = require('../models/Store');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Middleware to get the admin's store ID and ensure they own it
const getAdminStoreId = async (req, res, next) => {
    try {
        const store = await Store.findOne({ admin: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'No store found for this admin.' });
        }
        req.storeId = store._id; // Attach storeId to the request
        next();
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin store.', error: error.message });
    }
};

// @desc    Add a new category
// @route   POST /api/categories
// @access  Private (Admin only)
router.post('/', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Please enter category name' });
    }

    try {
        const category = await Category.create({
            name,
            store: req.storeId,
        });
        res.status(201).json(category);
    } catch (error) {
        // Handle duplicate category name for the same store
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category with this name already exists in your store.' });
        }
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all categories for the authenticated admin's store
// @route   GET /api/categories/my-store
// @access  Private (Admin only)
router.get('/my-store', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        const categories = await Category.find({ store: req.storeId }).sort('name'); // Sort by name
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all categories for a public store (by store ID)
// @route   GET /api/categories/store/:storeId
// @access  Public
router.get('/store/:storeId', async (req, res) => {
    try {
        const categories = await Category.find({ store: req.params.storeId }).sort('name');
        res.json(categories);
    } catch (error) {
        // If it's a CastError (invalid ObjectId format), treat as not found
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Invalid Store ID.' });
        }
        res.status(500).json({ message: error.message });
    }
});


// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    const { name } = req.body;

    try {
        const category = await Category.findOne({ _id: req.params.id, store: req.storeId });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or you do not own this category.' });
        }

        category.name = name || category.name;

        const updatedCategory = await category.save();
        res.json(updatedCategory);
    } catch (error) {
        // Handle duplicate category name for the same store on update
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Category with this name already exists in your store.' });
        }
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        const category = await Category.findOne({ _id: req.params.id, store: req.storeId });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or you do not own this category.' });
        }

        // Before deleting category, consider what to do with its products.
        // Option 1: Delete products too (dangerous).
        // Option 2: Set products category to null or a default category (better).
        // For simplicity for now, let's just delete the category and let products become "uncategorized" or be handled later.
        // A more robust solution would be to cascade delete or set a default.
        // If products are linked by required:true, you would need to delete them first.
        const Product = require('../models/Product'); // Require it here to avoid circular dependency
        await Product.updateMany({ category: req.params.id }, { $unset: { category: 1 } }); // Unset category for products

        await Category.deleteOne({ _id: req.params.id }); // Use deleteOne for Mongoose 6+

        res.json({ message: 'Category removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;