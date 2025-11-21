// qr-digital-menu-system/backend/routes/products.js

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Store = require('../models/Store');
const { protect, authorizeRoles, getAdminStoreId } = require('../middleware/authMiddleware');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

// Rate limiting for product routes
const productLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many product requests, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Input validation middleware
const validateProduct = (req, res, next) => {
    const { title, description, price, category, imageUrl } = req.body;

    // Check required fields
    if (!title || !category) {
        return res.status(400).json({ message: 'Product title and category are required' });
    }

    // Sanitize inputs
    req.body.title = sanitizeHtml(title.trim(), {
        allowedTags: [],
        allowedAttributes: {}
    });
    
    if (description) {
        req.body.description = sanitizeHtml(description.trim(), {
            allowedTags: [],
            allowedAttributes: {}
        });
    }

    // Validate title length
    if (req.body.title.length < 2 || req.body.title.length > 100) {
        return res.status(400).json({ message: 'Product title must be between 2 and 100 characters' });
    }

    // Validate description length
    if (description && description.length > 500) {
        return res.status(400).json({ message: 'Product description cannot exceed 500 characters' });
    }

    // Validate price
    if (price !== undefined && price !== null && price !== '') {
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum < 0 || priceNum > 1000000) {
            return res.status(400).json({ message: 'Price must be a valid number between 0 and 1,000,000' });
        }
    }

    // Validate category ID format
    if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: 'Invalid category ID format' });
    }

    // Validate image URL if provided
    if (imageUrl && !validator.isURL(imageUrl, { 
        protocols: ['http', 'https'],
        require_protocol: true 
    })) {
        return res.status(400).json({ message: 'Invalid image URL format' });
    }

    next();
};

// Extract Cloudinary public_id safely from a Cloudinary URL
function getCloudinaryPublicId(url) {
    if (!url) {
        console.log('❌ URL is empty or undefined');
        return null;
    }
    
    if (!url.includes('cloudinary.com')) {
        console.log('❌ Not a Cloudinary URL:', url);
        return null;
    }
    
    try {
        console.log('🔍 Parsing Cloudinary URL:', url);
        
        // Method 1: Simple regex approach
        const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
        const match = url.match(regex);
        
        if (match && match[1]) {
            const publicId = match[1];
            console.log('✅ Extracted public_id (method 1):', publicId);
            return publicId;
        }
        
        // Method 2: URL parsing approach
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const uploadIndex = pathParts.indexOf('upload');
        
        if (uploadIndex !== -1) {
            let publicIdParts = [];
            for (let i = uploadIndex + 1; i < pathParts.length; i++) {
                // Skip version numbers (v1234567890)
                if (pathParts[i].startsWith('v') && /^v\d+$/.test(pathParts[i])) {
                    continue;
                }
                publicIdParts.push(pathParts[i]);
            }
            
            if (publicIdParts.length > 0) {
                let publicId = publicIdParts.join('/');
                // Remove file extension
                publicId = publicId.replace(/\.[^/.]+$/, "");
                console.log('✅ Extracted public_id (method 2):', publicId);
                return publicId;
            }
        }
        
        console.log('❌ Could not extract public_id from URL');
        return null;
    } catch (err) {
        console.error('Failed to parse Cloudinary public_id:', err);
        return null;
    }
}

// Secure Cloudinary delete function
const deleteFromCloudinary = async (url) => {
    try {
        console.log('🗑️ Starting Cloudinary deletion for URL:', url);
        const publicId = getCloudinaryPublicId(url);
        
        if (!publicId) {
            console.log('❌ No public_id extracted, skipping Cloudinary deletion');
            return;
        }
        
        console.log('🔑 Deleting from Cloudinary with public_id:', publicId);
        
        const result = await cloudinary.uploader.destroy(publicId);
        console.log('✅ Cloudinary deletion result:', result);
        
        if (result.result === 'ok') {
            console.log('🎉 Successfully deleted image from Cloudinary');
        } else {
            console.log('⚠️ Cloudinary deletion result not "ok":', result.result);
        }
    } catch (error) {
        console.error('❌ Cloudinary delete error:', error);
        // Don't throw error here as it shouldn't block the main operation
    }
};

// Enhanced Multer configuration with better security
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 8 * 1024 * 1024, // 8MB limit
        files: 1 // Only one file per request
    },
    fileFilter: (req, file, cb) => {
        // Check MIME type
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }

        // Check file extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = '.' + file.originalname.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            return cb(new Error('Invalid file type. Only JPG, JPEG, PNG, GIF, and WebP are allowed!'), false);
        }

        cb(null, true);
    }
});

// Apply rate limiting to all product routes
// router.use(productLimiter);

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
        res.status(500).json({ message: 'Server error while fetching products' });
    }
});

// @desc    Get all products for a public store (by slug) - WITH PAGINATION
// @route   GET /api/products/public-store/slug/:slug
// @access  Public
router.get('/public-store/slug/:slug', async (req, res) => {
    try {
        const store = await Store.findOne({ slug: req.params.slug });
        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        const { category, search, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let filter = { 
            store: store._id,
            isAvailable: true
        };

        if (category && category !== 'all-items' && category !== 'all') {
            if (mongoose.Types.ObjectId.isValid(category)) {
                filter.category = new mongoose.Types.ObjectId(category);
            } else {
                console.warn(`Invalid category ID received: ${category}`);
                return res.json({ 
                    products: [], 
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: 0
                });
            }
        }

        if (search) {
            const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex }
            ];
        }

        // ADD PAGINATION TO QUERY
        const products = await Product.find(filter)
            .populate('category', 'name')
            .sort('title')
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Product.countDocuments(filter);

        res.json({
            products,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Error fetching public store products by slug:', error);
        res.status(500).json({ message: 'Server error while fetching products' });
    }
});

// ==================== SUPERADMIN ROUTES (ONLY GLOBAL PRODUCTS) ====================

// Error handler for multer
const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File too large. Maximum size is 8MB.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Too many files. Only one image allowed.' });
        }
    }
    next(error);
};

// Cloudinary upload configuration with security
const cloudinaryUploadOptions = {
    resource_type: 'image',
    quality: 'auto:good',
    format: 'webp',
    fetch_format: 'auto',
    transformation: [
        { width: 600, crop: 'limit', quality: 'auto:good' },
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

// Secure Cloudinary upload function
const uploadToCloudinary = async (file, options) => {
    try {
        const uploadResult = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            options
        );
        return uploadResult.secure_url;
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image to cloud storage');
    }
};

// Apply rate limiting to all product routes
// router.use(productLimiter);

// ==================== PUBLIC ROUTES ====================


// ==================== SUPERADMIN ROUTES (ONLY GLOBAL PRODUCTS) ====================

// @desc    Get all products for superadmin (ONLY superadmin products - no store field)
// @route   GET /api/products/superadmin
// @access  Private (Superadmin only)
router.get('/superadmin', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Only get products WITHOUT store field (superadmin products only)
        const products = await Product.find({ 
            store: { $exists: false } // ONLY superadmin products
        })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        const total = await Product.countDocuments({ 
            store: { $exists: false } // ONLY superadmin products
        });

        res.json({
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching superadmin products:', error);
        res.status(500).json({ message: 'Server error while fetching products' });
    }
});

// @desc    Create product for superadmin (GLOBAL product - no store)
// @route   POST /api/products/superadmin
// @access  Private (Superadmin only)
router.post('/superadmin', protect, authorizeRoles('superadmin'), upload.single('image'), handleMulterError, validateProduct, async (req, res) => {
    const { title, description, price, category, imageUrl, isAvailable } = req.body;

    try {
        // Verify category exists and is a SUPERADMIN category (no store field)
        const existingCategory = await Category.findOne({ 
            _id: category, 
            store: { $exists: false } // MUST be superadmin category
        });
        
        if (!existingCategory) {
            return res.status(400).json({ message: 'Invalid category or category does not belong to superadmin' });
        }

        let finalImageUrl = imageUrl || '';
        let cloudinaryImage = '';

        if (req.file) {
            cloudinaryImage = await uploadToCloudinary(req.file, superadminUploadOptions);
        }

        // Create product WITHOUT store field (superadmin product only)
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
        
        // Clean up uploaded image if product creation fails
        if (req.file) {
            try {
                const publicId = getCloudinaryPublicId(req.file.secure_url);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up uploaded image:', cleanupError);
            }
        }
        
        res.status(500).json({ message: 'Server error while creating product' });
    }
});

// @desc    Update product for superadmin (ONLY superadmin products)
// @route   PUT /api/products/superadmin/:id
// @access  Private (Superadmin only)
router.put('/superadmin/:id', protect, authorizeRoles('superadmin'), upload.single('image'), handleMulterError, validateProduct, async (req, res) => {
    const { title, description, price, category, imageUrl, isAvailable } = req.body;

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        // Only allow updating superadmin products (no store field)
        const product = await Product.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } // MUST be superadmin product
        });
        
        if (!product) {
            return res.status(404).json({ message: 'Superadmin product not found' });
        }

        // Verify category if it's being updated (must be superadmin category)
        if (category) {
            const existingCategory = await Category.findOne({ 
                _id: category, 
                store: { $exists: false } // MUST be superadmin category
            });
            
            if (!existingCategory) {
                return res.status(400).json({ message: 'Invalid category or category does not belong to superadmin' });
            }
            product.category = existingCategory._id;
        }

        product.title = title || product.title;
        product.description = description !== undefined ? description : product.description;
        product.price = price !== undefined ? price : product.price;
        product.isAvailable = isAvailable !== undefined ? isAvailable : product.isAvailable;

                    // Add this RIGHT BEFORE your image handling logic
        console.log('🚨 EMERGENCY DEBUG - Image Handling:');
        console.log('📥 imageUrl from request:', imageUrl, '(type:', typeof imageUrl, ')');
        console.log('💾 product.imageUrl current:', product.imageUrl);
        console.log('🔍 Condition check - imageUrl !== undefined:', imageUrl !== undefined);
        console.log('🔍 Condition check - imageUrl !== product.imageUrl:', imageUrl !== product.imageUrl);
        console.log('🎯 FINAL Condition:', imageUrl !== undefined && imageUrl !== product.imageUrl);
        console.log('🔄 shouldDeleteOldImage will be:', (imageUrl !== undefined && imageUrl !== product.imageUrl) ? 'TRUE' : 'FALSE');

        // Then continue with your existing image handling code...
        let oldImageUrl = null;
        let shouldDeleteOldImage = false;

// ONLY set oldImageUrl when we're actually replacing the image
if (imageUrl !== undefined && imageUrl !== product.imageUrl) {
    if (product.image) {
        oldImageUrl = product.image;
        shouldDeleteOldImage = true;
    }
    product.imageUrl = imageUrl;
    product.image = '';
} else if (req.file) {
    // We're uploading a new image file
    if (product.image) {
        oldImageUrl = product.image;
        shouldDeleteOldImage = true;
    }
    // ✅ FIXED: Use superadminUploadOptions for superadmin
    const newImageUrl = await uploadToCloudinary(req.file, superadminUploadOptions);
    product.image = newImageUrl;
    product.imageUrl = '';
} else if (req.body.removeImage === 'true') {
    // Explicitly removing image
    if (product.image) {
        oldImageUrl = product.image;
        shouldDeleteOldImage = true;
    }
    product.image = '';
    product.imageUrl = '';
}

const updatedProduct = await product.save();

// ONLY delete old image if we're replacing it
if (shouldDeleteOldImage && oldImageUrl) {
    await deleteFromCloudinary(oldImageUrl);
}

        const populatedProduct = await Product.findById(updatedProduct._id).populate('category', 'name');
        res.json(populatedProduct);
    } catch (error) {
        console.error('Error updating product as superadmin:', error);
        res.status(500).json({ message: 'Server error while updating product' });
    }
});

// @desc    Delete product for superadmin (ONLY superadmin products)
// @route   DELETE /api/products/superadmin/:id
// @access  Private (Superadmin only)
router.delete('/superadmin/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        // Only allow deleting superadmin products (no store field)
        const product = await Product.findOne({ 
            _id: req.params.id, 
            store: { $exists: false } // MUST be superadmin product
        });
        
        if (!product) {
            return res.status(404).json({ message: 'Superadmin product not found' });
        }

        // DEBUG: Log the image details
        console.log('🔄 DEBUG: Superadmin product deletion started');
        console.log('📸 Product image URL:', product.image);
        console.log('📸 Product imageUrl:', product.imageUrl);

        await Product.deleteOne({ _id: req.params.id });
        res.json({ message: 'Superadmin product removed' });
    } catch (error) {
        console.error('Error deleting product as superadmin:', error);
        res.status(500).json({ message: 'Server error while deleting product' });
    }
});

// @desc    Get single product for superadmin (ONLY superadmin products)
// @route   GET /api/products/superadmin/:id
// @access  Private (Superadmin only)
router.get('/superadmin/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        // Only get superadmin products (no store field)
        const product = await Product.findOne({
            _id: req.params.id,
            store: { $exists: false } // MUST be superadmin product
        }).populate('category', 'name');
        
        if (!product) {
            return res.status(404).json({ message: 'Superadmin product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error fetching superadmin product:', error);
        res.status(500).json({ message: 'Server error while fetching product' });
    }
});

// ==================== ADMIN/STORE ROUTES ====================

// @desc    Add a new product (Admin)
// @route   POST /api/products
// @access  Private (Admin only)
router.post('/', protect, authorizeRoles('admin'), getAdminStoreId, upload.single('image'), handleMulterError, validateProduct, async (req, res) => {
    const { title, description, price, category, imageUrl } = req.body;

    try {
        // Verify category exists and belongs to the admin's store
        const existingCategory = await Category.findOne({ 
            _id: category, 
            store: req.storeId 
        });
        
        if (!existingCategory) {
            return res.status(400).json({ message: 'Invalid category or category does not belong to your store.' });
        }

        let finalImageUrl = imageUrl || '';
        let cloudinaryImage = '';

        if (req.file) {
            cloudinaryImage = await uploadToCloudinary(req.file, storeUploadOptions);
        }

        const product = await Product.create({
            title,
            description: description || '',
            price: price || 0,
            image: cloudinaryImage,
            imageUrl: finalImageUrl,
            category: existingCategory._id,
            store: req.storeId, // This identifies it as store product
            isAvailable: true
        });

        const populatedProduct = await Product.findById(product._id).populate('category', 'name');
        res.status(201).json(populatedProduct);
    } catch (error) {
        console.error('Error adding product:', error);
        
        // Clean up uploaded image if product creation fails
        if (req.file) {
            try {
                const publicId = getCloudinaryPublicId(req.file.secure_url);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (cleanupError) {
                console.error('Error cleaning up uploaded image:', cleanupError);
            }
        }
        
        res.status(500).json({ message: 'Server error while creating product' });
    }
});

// @desc    Get all products for the authenticated admin's store
// @route   GET /api/products/my-store
// @access  Private (Admin only)
router.get('/my-store', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        const { category, search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let filter = { store: req.storeId };

        // Handle category filter
        if (category && category !== 'all') {
            if (mongoose.Types.ObjectId.isValid(category)) {
                filter.category = new mongoose.Types.ObjectId(category);
            } else {
                console.warn(`Invalid category ID received: ${category}`);
                return res.json({ 
                    products: [], 
                    pagination: { 
                        page: parseInt(page), 
                        limit: parseInt(limit), 
                        total: 0, 
                        pages: 0 
                    } 
                });
            }
        }

        // Handle search
        if (search) {
            const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [
                { title: searchRegex },
                { description: searchRegex }
            ];
        }

        console.log('🔍 Product filter:', JSON.stringify(filter));

        // SIMPLE FIX: Use populate with proper error handling
        let products = [];
        let total = 0;

        try {
            // Get products with populated categories
            products = await Product.find(filter)
                .populate('category', 'name') // Populate category name
                .sort('title')
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            total = await Product.countDocuments(filter);

            // DEBUG: Check what we got
            console.log('🔍 After populate - first product:', products[0] ? {
                title: products[0].title,
                category: products[0].category
            } : 'No products');

        } catch (dbError) {
            console.error('Database query failed:', dbError);
            products = [];
            total = 0;
        }

        console.log(`✅ Found ${products.length} products`);

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('❌ Critical error in products route:', error);
        res.json({ 
            products: [], 
            pagination: { 
                page: 1, 
                limit: 50, 
                total: 0, 
                pages: 0 
            } 
        });
    }
});

// @desc    Get single product for admin (store products only) - MUST COME BEFORE /my-store
// @route   GET /api/products/:id
// @access  Private (Admin only)
router.get('/:id', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        console.log('🔄 Fetching single product for admin:', req.params.id);
        
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        // Only get products that belong to the admin's store
        const product = await Product.findOne({
            _id: req.params.id,
            store: req.storeId
        }).populate('category', 'name');
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found or you do not own this product' });
        }

        console.log('✅ Single product found:', product.title);
        res.json(product);
    } catch (error) {
        console.error('Error fetching admin product:', error);
        res.status(500).json({ message: 'Server error while fetching product' });
    }
});

// @desc    EMERGENCY: Fix invalid category references
// @route   POST /api/products/fix-invalid-categories
// @access  Private (Admin only)
router.post('/fix-invalid-categories', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        console.log('🛠️ Fixing invalid category references...');
        
        const products = await Product.find({ store: req.storeId });
        let fixedCount = 0;
        
        for (const product of products) {
            // Check if category is invalid
            if (!product.category || !mongoose.Types.ObjectId.isValid(product.category)) {
                console.log(`Fixing product: ${product.title} (${product._id}) - Invalid category: ${product.category}`);
                
                // Set to a valid category or null
                const firstCategory = await Category.findOne({ store: req.storeId });
                if (firstCategory) {
                    product.category = firstCategory._id;
                } else {
                    product.category = null;
                }
                
                await product.save();
                fixedCount++;
            }
        }
        
        res.json({ 
            message: `Fixed ${fixedCount} products with invalid category references`,
            fixedCount 
        });
        
    } catch (error) {
        console.error('Error fixing categories:', error);
        res.status(500).json({ message: 'Failed to fix categories' });
    }
});

// @desc    Debug: Check for invalid category IDs
// @route   GET /api/products/debug-invalid-categories
// @access  Private (Admin only)
router.get('/debug-invalid-categories', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        console.log('🔍 Debug: Checking for products with invalid category IDs...');
        
        const products = await Product.find({ store: req.storeId });
        
        const invalidProducts = [];
        const validProducts = [];
        
        for (const product of products) {
            if (!mongoose.Types.ObjectId.isValid(product.category)) {
                invalidProducts.push({
                    _id: product._id,
                    title: product.title,
                    category: product.category,
                    issue: 'Invalid category ID format'
                });
            } else {
                // Check if category exists
                const categoryExists = await Category.findById(product.category);
                if (!categoryExists) {
                    invalidProducts.push({
                        _id: product._id,
                        title: product.title,
                        category: product.category,
                        issue: 'Category does not exist'
                    });
                } else {
                    validProducts.push(product._id);
                }
            }
        }
        
        res.json({
            totalProducts: products.length,
            validProducts: validProducts.length,
            invalidProducts: invalidProducts.length,
            invalidProductsDetails: invalidProducts
        });
        
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ message: 'Debug failed' });
    }
});


// @desc    Update a product (Admin)
// @route   PUT /api/products/:id
// @access  Private (Admin only)
router.put('/:id', protect, authorizeRoles('admin'), getAdminStoreId, upload.single('image'), handleMulterError, validateProduct, async (req, res) => {
    const { title, description, price, category, imageUrl, isAvailable } = req.body;

    try {
        // Validate product ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        const product = await Product.findOne({ _id: req.params.id, store: req.storeId });

        if (!product) {
            return res.status(404).json({ message: 'Product not found or you do not own this product.' });
        }

        // ✅ CORRECT PLACEMENT: Debug logs AFTER product is defined
        console.log('🚨 ADMIN DEBUG - Image Handling:');
        console.log('📥 imageUrl from request:', imageUrl, '(type:', typeof imageUrl, ')');
        console.log('💾 product.imageUrl current:', product.imageUrl);
        console.log('💾 product.image current:', product.image);

        // Verify category if it's being updated
        if (category) {
            const existingCategory = await Category.findOne({ 
                _id: category, 
                store: req.storeId 
            });
            
            if (!existingCategory) {
                return res.status(400).json({ message: 'Invalid category or category does not belong to your store.' });
            }
            product.category = existingCategory._id;
        }

        product.title = title || product.title;
        product.description = description !== undefined ? description : product.description;
        product.price = price !== undefined ? price : product.price;
        product.isAvailable = isAvailable !== undefined ? isAvailable : product.isAvailable;

        // 🛡️ FIXED: SAFE IMAGE HANDLING - NO AUTO-DELETION
        console.log('🛡️ SAFE IMAGE HANDLING ACTIVATED');
        
        // ONLY handle images if explicitly changing them
        if (req.file) {
            console.log('📸 New image file uploaded');
            // Upload new image - keep old image in Cloudinary (no deletion)
            const newImageUrl = await uploadToCloudinary(req.file, storeUploadOptions);
            product.image = newImageUrl;
            product.imageUrl = '';
            console.log('✅ New Cloudinary image uploaded, old image preserved');
        } 
        else if (req.body.removeImage === 'true') {
            console.log('🗑️ Explicit image removal requested');
            // Only delete when explicitly requested
            if (product.image) {
                console.log('🔑 Deleting from Cloudinary:', product.image);
                await deleteFromCloudinary(product.image);
            }
            product.image = '';
            product.imageUrl = '';
            console.log('✅ Image removed as requested');
        } 
        else if (imageUrl !== undefined && imageUrl !== '' && imageUrl !== product.imageUrl) {
            console.log('🔗 New image URL provided');
            product.imageUrl = imageUrl;
            product.image = ''; // Clear Cloudinary image when using external URL
            console.log('✅ Image URL updated, Cloudinary image cleared');
        }
        else {
            console.log('🛡️ No image changes - preserving current image');
            // No image changes - preserve current image (do nothing)
        }

        const updatedProduct = await product.save();
        console.log('💾 Product saved successfully');

        const populatedProduct = await Product.findById(updatedProduct._id).populate('category', 'name');
        
        // 🎯 FINAL DEBUG
        console.log('🎯 FINAL PRODUCT STATE:');
        console.log('📸 Final image:', populatedProduct.image);
        console.log('🔗 Final imageUrl:', populatedProduct.imageUrl);
        
        res.json(populatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Server error while updating product' });
    }
});

// @desc    Delete a product (Admin)
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorizeRoles('admin'), getAdminStoreId, async (req, res) => {
    try {
        // Validate product ID
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID format' });
        }

        const product = await Product.findOne({ _id: req.params.id, store: req.storeId });

        if (!product) {
            return res.status(404).json({ message: 'Product not found or you do not own this product.' });
        }

        // DEBUG: Log the image details
        console.log('🔄 DEBUG: Product deletion started');
        console.log('📸 Product image URL:', product.image);
        console.log('📸 Product imageUrl:', product.imageUrl);

        await Product.deleteOne({ _id: req.params.id });

        res.json({ message: 'Product removed' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Server error while deleting product' });
    }
});

const sanitizeInput = (req, res, next) => {
    if (req.body.title) {
        req.body.title = sanitizeHtml(req.body.title, {
            allowedTags: [],
            allowedAttributes: {}
        }).substring(0, 100);
    }
    if (req.body.description) {
        req.body.description = sanitizeHtml(req.body.description, {
            allowedTags: ['br', 'strong', 'em'],
            allowedAttributes: {}
        }).substring(0, 1000);
    }
    next();
};

module.exports = router;