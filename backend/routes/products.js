
// qr-digital-menu-system/backend/routes/products.js

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Store = require('../models/Store');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const mongoose = require('mongoose');

// Extract Cloudinary public_id safely from a Cloudinary URL
function getCloudinaryPublicId(url) {
    if (!url) return null;
    try {
        const parts = url.split('/');
        const fileWithExt = parts.pop();
        const folderPath = parts.slice(parts.indexOf('upload') + 1).join('/');
        const fileName = fileWithExt.split('.')[0];
        return folderPath + '/' + fileName;
    } catch (err) {
        console.error('Failed to parse Cloudinary public_id:', err);
        return null;
    }
}

// Set up Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // Reduced to 8MB since we're using smaller images
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Improved Cloudinary upload configuration for balanced image quality and size
const cloudinaryUploadOptions = {
    resource_type: 'image',
    quality: 'auto:good', // Good balance between quality and file size
    format: 'webp',
    fetch_format: 'auto',
    transformation: [
        { width: 800, crop: 'limit', quality: 'auto:good' }, // Perfect balance at 800px
        { dpr: 'auto' }
    ]
};

// Superadmin specific upload options
const superadminUploadOptions = {
    ...cloudinaryUploadOptions,
    folder: 'ysgstore/superadmin-products'
};

// Store specific upload options  
const storeUploadOptions = {
    ...cloudinaryUploadOptions,
    folder: 'ysgstore/store-products'
};

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

// @desc    Get all SUPERADMIN products for website (PUBLIC) - ONLY superadmin products
// @route   GET /api/products/website
// @access  Public
router.get('/website', async (req, res) => {
    try {
        console.log('Fetching SUPERADMIN products for website...');
        // Only get products that don't have a store field (superadmin products)
        const products = await Product.find({ 
            isAvailable: true,
            store: { $exists: false } // Only products without store field (superadmin products)
        })
        .populate('category', 'name')
        .sort({ createdAt: -1 });
        
        console.log(`Found ${products.length} SUPERADMIN products`);
        res.json(products);
    } catch (error) {
        console.error('Error fetching website products:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== SUPERADMIN ROUTES ====================

// @desc    Get all products for superadmin (ONLY superadmin products)
// @route   GET /api/products/superadmin
// @access  Private (Superadmin only)
router.get('/superadmin', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        // Only get products that don't have a store field (superadmin products)
        const products = await Product.find({ store: { $exists: false } })
            .populate('category', 'name')
            .sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        console.error('Error fetching superadmin products:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create product for superadmin
// @route   POST /api/products/superadmin
// @access  Private (Superadmin only)
router.post('/superadmin', protect, authorizeRoles('superadmin'), upload.single('image'), async (req, res) => {
    const { title, description, price, category, imageUrl, isAvailable } = req.body;

    if (!title || !category) {
        return res.status(400).json({ message: 'Please add product title and select a category' });
    }

    try {
        // Verify category exists
        const existingCategory = await Category.findById(category);
        if (!existingCategory) {
            return res.status(400).json({ message: 'Invalid category' });
        }

        let finalImageUrl = imageUrl || '';
        let cloudinaryImage = '';

        if (req.file) {
            const uploadRes = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                superadminUploadOptions
            );
            cloudinaryImage = uploadRes.secure_url;
        }

        const product = await Product.create({
            title,
            description: description || '',
            price: price || 0,
            image: cloudinaryImage,
            imageUrl: finalImageUrl,
            category: existingCategory._id,
            isAvailable: isAvailable !== undefined ? isAvailable : true,
            // NO store field - this identifies it as superadmin product
        });

        const populatedProduct = await Product.findById(product._id).populate('category', 'name');
        res.status(201).json(populatedProduct);
    } catch (error) {
        console.error('Error adding product as superadmin:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update product for superadmin
// @route   PUT /api/products/superadmin/:id
// @access  Private (Superadmin only)
router.put('/superadmin/:id', protect, authorizeRoles('superadmin'), upload.single('image'), async (req, res) => {
    const { title, description, price, category, imageUrl, isAvailable } = req.body;

    try {
        // Only allow updating superadmin products (no store field)
        const product = await Product.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } 
        });
        
        if (!product) {
            return res.status(404).json({ message: 'Superadmin product not found' });
        }

        // Verify category if it's being updated
        if (category) {
            const existingCategory = await Category.findById(category);
            if (!existingCategory) {
                return res.status(400).json({ message: 'Invalid category' });
            }
            product.category = existingCategory._id;
        }

        product.title = title || product.title;
        product.description = description !== undefined ? description : product.description;
        product.price = price !== undefined ? price : product.price;
        product.isAvailable = isAvailable !== undefined ? isAvailable : product.isAvailable;

        if (imageUrl !== undefined) {
            product.imageUrl = imageUrl;
            if (product.image) {
                const publicId = getCloudinaryPublicId(product.image);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
                product.image = '';
            }
        } else if (req.file) {
            if (product.image) {
                const publicId = getCloudinaryPublicId(product.image);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            }
            const uploadRes = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                superadminUploadOptions
            );
            product.image = uploadRes.secure_url;
            product.imageUrl = '';
        } else if (req.body.removeImage === 'true') {
            if (product.image) {
                const publicId = getCloudinaryPublicId(product.image);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            }
            product.image = '';
            product.imageUrl = '';
        }

        const updatedProduct = await product.save();
        const populatedProduct = await Product.findById(updatedProduct._id).populate('category', 'name');
        res.json(populatedProduct);
    } catch (error) {
        console.error('Error updating product as superadmin:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete product for superadmin
// @route   DELETE /api/products/superadmin/:id
// @access  Private (Superadmin only)
router.delete('/superadmin/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        // Only allow deleting superadmin products (no store field)
        const product = await Product.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } 
        });
        
        if (!product) {
            return res.status(404).json({ message: 'Superadmin product not found' });
        }

        // Delete image from Cloudinary if it exists
        if (product.image) {
            const publicId = getCloudinaryPublicId(product.image);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }

        await Product.deleteOne({ _id: req.params.id });
        res.json({ message: 'Superadmin product removed' });
    } catch (error) {
        console.error('Error deleting product as superadmin:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== ADMIN/STORE ROUTES ====================

// @desc    Add a new product (Admin)
// @route   POST /api/products
// @access  Private (Admin only)
router.post('/', protect, authorizeRoles('admin'), getAdminStoreId, upload.single('image'), async (req, res) => {
    const { title, description, price, category, imageUrl } = req.body;

    if (!title || !category) {
        return res.status(400).json({ message: 'Please add product title and select a category' });
    }

    try {
        // Verify category exists and belongs to the admin's store
        const existingCategory = await Category.findOne({ _id: category, store: req.storeId });
        if (!existingCategory) {
            return res.status(400).json({ message: 'Invalid category or category does not belong to your store.' });
        }

        let finalImageUrl = imageUrl || '';
        let cloudinaryImage = '';

        if (req.file) {
            const uploadRes = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                storeUploadOptions
            );
            cloudinaryImage = uploadRes.secure_url;
        }

        const product = await Product.create({
            title,
            description,
            price: price,
            image: cloudinaryImage,
            imageUrl: finalImageUrl,
            category: existingCategory._id,
            store: req.storeId, // This identifies it as store product
        });

        res.status(201).json(product);
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all products for the authenticated admin's store
// @route   GET /api/products/my-store
// @access  Private (Admin only)
router.get('/my-store', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        const { category, search } = req.query;
        let filter = { store: req.storeId }; // Only products with store field

        if (category && category !== 'all') {
            if (mongoose.Types.ObjectId.isValid(category)) {
                filter.category = new mongoose.Types.ObjectId(category);
            } else {
                console.warn(`Backend (my-store): Invalid category ID received: ${category}`);
                return res.json([]);
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
        console.error('Error fetching admin store products:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all products for a public store (by slug)
// @route   GET /api/products/public-store/slug/:slug
// @access  Public
router.get('/public-store/slug/:slug', async (req, res) => {
    try {
        const store = await Store.findOne({ slug: req.params.slug });
        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        const { category, search } = req.query;
        let filter = { store: store._id }; // Only products with this specific store

        if (category && category !== 'all-items' && category !== 'all') {
            if (mongoose.Types.ObjectId.isValid(category)) {
                filter.category = new mongoose.Types.ObjectId(category);
            } else {
                console.warn(`Backend (public-store): Invalid category ID received: ${category}`);
                return res.json([]);
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

// @desc    Update a product (Admin)
// @route   PUT /api/products/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorizeRoles('admin'), getAdminStoreId, upload.single('image'), async (req, res) => {
    const { title, description, price, category, imageUrl } = req.body;

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
        product.isAvailable = req.body.isAvailable !== undefined ? req.body.isAvailable : product.isAvailable;

        if (imageUrl !== undefined) {
            product.imageUrl = imageUrl;
            if (product.image) {
                const publicId = getCloudinaryPublicId(product.image);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
                product.image = '';
            }
        } else if (req.file) {
            if (product.image) {
                const publicId = getCloudinaryPublicId(product.image);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            }
            const uploadRes = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                storeUploadOptions
            );
            product.image = uploadRes.secure_url;
            product.imageUrl = '';
        } else if (req.body.removeImage === 'true') {
            if (product.image) {
                const publicId = getCloudinaryPublicId(product.image);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            }
            product.image = '';
            product.imageUrl = '';
        }

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a product (Admin)
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
            const publicId = getCloudinaryPublicId(product.image);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }

        await Product.deleteOne({ _id: req.params.id });

        res.json({ message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get single product for superadmin
// @route   GET /api/products/superadmin/:id
// @access  Private (Superadmin only)
router.get('/superadmin/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        // Only get superadmin products (no store field)
        const product = await Product.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } 
        }).populate('category', 'name');
        
        if (!product) {
            return res.status(404).json({ message: 'Superadmin product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error fetching superadmin product:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
