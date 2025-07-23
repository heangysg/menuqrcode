// qr-digital-menu-system/backend/routes/products.js

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category'); // Need to check if category exists and belongs to store
const Store = require('../models/Store');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const mongoose = require('mongoose'); // NEW: Import mongoose to use mongoose.Types.ObjectId

// Set up Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

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

// @desc    Add a new product
// @route   POST /api/products
// @access  Private (Admin only)
router.post('/', protect, authorizeRoles('admin'), getAdminStoreId, upload.single('image'), async (req, res) => {
    const { title, description, price, category } = req.body;

    if (!title || !category) {
        return res.status(400).json({ message: 'Please add product title and select a category' });
    }

    try {
        // Verify category exists and belongs to the admin's store
        const existingCategory = await Category.findOne({ _id: category, store: req.storeId });
        if (!existingCategory) {
            return res.status(400).json({ message: 'Invalid category or category does not belong to your store.' });
        }

        let imageUrl = '';
        if (req.file) {
            // Upload image to Cloudinary with optimization settings
             const uploadRes = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                {
                    folder: 'ysgstore/products', // <--- CHANGED THIS LINE
                    resource_type: 'image',
                    quality: 'auto',
                    fetch_format: 'auto'
                }
            );
            imageUrl = uploadRes.secure_url;
        }

        const product = await Product.create({
            title,
            description,
            price: price,
            image: imageUrl,
            category: existingCategory._id,
            store: req.storeId,
        });

        res.status(201).json(product);
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all products for the authenticated admin's store, with optional category and search filters
// @route   GET /api/products/my-store
// @access  Private (Admin only)
router.get('/my-store', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        const { category, search } = req.query; // Extract category AND search from query parameters
        let filter = { store: req.storeId }; // ALWAYS filter by store

        console.log('Backend (my-store): Received category parameter:', category);
        console.log('Backend (my-store): Received search parameter:', search);

        // Apply category filter if provided and it's not 'all'
        // CRITICAL FIX: Explicitly cast category ID to ObjectId
        if (category && category !== 'all') {
            // Validate if it's a valid MongoDB ObjectId format before casting
            if (mongoose.Types.ObjectId.isValid(category)) { // NEW VALIDATION
                filter.category = new mongoose.Types.ObjectId(category); // NEW: Explicitly cast
            } else {
                // If the category ID is invalid, log an error and return no products for this filter
                console.warn(`Backend (my-store): Invalid category ID received: ${category}`);
                return res.json([]); // Return empty array if category ID is malformed
            }
        }

        // Apply search filter if provided
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        console.log('Backend (my-store): Final Mongoose filter applied:', filter);
        const products = await Product.find(filter).populate('category', 'name').sort('title');
        console.log('Backend (my-store): Number of products found:', products.length);
        res.json(products);
    } catch (error) {
        console.error('Error fetching admin store products:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all products for a public store (by slug) with optional category and search filters
// @route   GET /api/products/public-store/slug/:slug
// @access  Public
router.get('/public-store/slug/:slug', async (req, res) => {
    try {
        const store = await Store.findOne({ slug: req.params.slug });
        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        const { category, search } = req.query;
        let filter = { store: store._id };

        if (category && category !== 'all-items' && category !== 'all') {
            // Public route also needs explicit casting if category is passed
            if (mongoose.Types.ObjectId.isValid(category)) { // NEW VALIDATION
                filter.category = new mongoose.Types.ObjectId(category); // NEW: Explicitly cast
            } else {
                console.warn(`Backend (public-store): Invalid category ID received: ${category}`);
                return res.json([]); // Return empty array if category ID is malformed
            }
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const products = await Product.find(filter).populate('category', 'name').sort('title');
        res.json(products);
    } catch (error) {
        console.error('Error fetching public store products by slug:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorizeRoles('admin'), getAdminStoreId, upload.single('image'), async (req, res) => {
    const { title, description, price, category } = req.body;

    try {
        const product = await Product.findOne({ _id: req.params.id, store: req.storeId });

        if (!product) {
            return res.status(404).json({ message: 'Product not found or you do not own this product.' });
        }

        // Verify category if it's being updated
        if (category) {
            const existingCategory = await Category.findOne({ _id: category, store: req.storeId });
            if (!existingCategory) {
                return res.status(400).json({ message: 'Invalid category or category does not belong to your store.' });
            }
            product.category = existingCategory._id;
        }

        product.title = title || product.title;
        product.description = description !== undefined ? description : product.description;
        product.price = price;

        if (req.file) {
            // Delete old image from Cloudinary if it exists
            if (product.image) {
                const publicId = product.image.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            // Upload new image with optimization settings
        const uploadRes = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                {
                    folder: 'ysgstore/products', // <--- CHANGED THIS LINE
                    resource_type: 'image',
                    quality: 'auto',
                    fetch_format: 'auto'
                }
            );
            product.image = uploadRes.secure_url;
        } else if (req.body.image === '') { // Allow frontend to send empty string to remove image
            if (product.image) {
                const publicId = product.image.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            product.image = '';
        }

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, store: req.storeId });

        if (!product) {
            return res.status(404).json({ message: 'Product not found or you do not own this product.' });
        }

        // Delete image from Cloudinary if it exists
        if (product.image) {
            const publicId = product.image.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }

        await Product.deleteOne({ _id: req.params.id });

        res.json({ message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
