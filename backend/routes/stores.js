// qr-digital-menu-system/backend/routes/stores.js

const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const slugify = require('slugify');

// Set up Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// @desc    Get store details for the authenticated admin
// @route   GET /api/stores/my-store
// @access  Private (Admin only)
router.get('/my-store', protect, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        const store = await Store.findOne({ admin: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found for this admin.' });
        }
        res.json(store);
    } catch (error) {
        console.error('Error fetching admin store:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update store details and logo/banner for the authenticated admin
// @route   PUT /api/stores/my-store
// @access  Private (Admin only)
router.put('/my-store', protect, authorizeRoles('admin', 'superadmin'), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 3 }]), async (req, res) => {
    try {
        let store = await Store.findOne({ admin: req.user._id });

        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        // Destructure all fields, including telegramLinks
        const { name, address, phone, description, facebookUrl, telegramLinks, tiktokUrl, websiteUrl } = req.body;

        // Update basic fields
        store.name = name !== undefined ? name : store.name;
        store.address = address !== undefined ? address : store.address;
        store.phone = phone !== undefined ? phone : store.phone;
        store.description = description !== undefined ? description : store.description;
        store.facebookUrl = facebookUrl !== undefined ? facebookUrl : store.facebookUrl;
        store.tiktokUrl = tiktokUrl !== undefined ? tiktokUrl : store.tiktokUrl;
        store.websiteUrl = websiteUrl !== undefined ? websiteUrl : store.websiteUrl;

        // UPDATE: Handle telegramLinks (parse JSON array)
        if (telegramLinks !== undefined) {
            try {
                // Parse the telegramLinks if it's a JSON string
                const parsedTelegramLinks = typeof telegramLinks === 'string' 
                    ? JSON.parse(telegramLinks) 
                    : telegramLinks;
                
                // Validate the structure
                if (Array.isArray(parsedTelegramLinks)) {
                    // Basic validation - only include links with both name and URL
                    const validLinks = parsedTelegramLinks
                        .filter(link => 
                            link && 
                            typeof link.name === 'string' && 
                            link.name.trim() !== '' &&
                            typeof link.url === 'string' && 
                            link.url.trim() !== ''
                        )
                        .map(link => ({
                            name: link.name.trim(),
                            url: link.url.trim()
                        }))
                        .slice(0, 5); // Limit to 5 links
                    
                    store.telegramLinks = validLinks;
                } else {
                    // If not an array, set empty array
                    store.telegramLinks = [];
                }
            } catch (parseError) {
                console.error('Error parsing telegramLinks:', parseError);
                // If parsing fails, keep existing links
            }
        }

        // Handle logo upload or removal
        if (req.files && req.files.logo && req.files.logo[0]) {
            console.log('New logo file detected. Uploading...');
            if (store.logo) {
                const publicId = store.logo.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
                console.log('Old logo deleted from Cloudinary.');
            }
            const uploadRes = await cloudinary.uploader.upload(
                `data:${req.files.logo[0].mimetype};base64,${req.files.logo[0].buffer.toString('base64')}`,
                {
                    folder: 'ysgstore/logos',
                    resource_type: 'image',
                    quality: 'auto',
                    fetch_format: 'auto'
                }
            );
            store.logo = uploadRes.secure_url;
            console.log('New logo uploaded:', store.logo);
        } else if (req.body.removeLogo === 'true') {
            console.log('Remove logo flag detected. Removing...');
            if (store.logo) {
                const publicId = store.logo.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
                console.log('Existing logo deleted from Cloudinary.');
            }
            store.logo = '';
            console.log('Logo field set to empty.');
        }

        // Handle banner upload or removal
        if (req.files && req.files.banner && req.files.banner.length > 0) {
            console.log(`New banner files detected: ${req.files.banner.length}. Uploading and optimizing to 800x800...`);
            if (store.banner && store.banner.length > 0) {
                console.log(`Deleting ${store.banner.length} existing banners.`);
                for (const bannerUrl of store.banner) {
                    try {
                        const publicId = bannerUrl.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`Deleted old banner: ${publicId}`);
                    } catch (deleteError) {
                        console.warn(`Failed to delete old banner ${bannerUrl}:`, deleteError.message);
                    }
                }
            }

            const newBannerUrls = [];
            for (const file of req.files.banner) {
                try {
                    const uploadRes = await cloudinary.uploader.upload(
                        `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
                        {
                            folder: 'ysgstore/banners',
                            resource_type: 'image',
                            transformation: [
                                {
                                    width: 800,
                                    height: 800,
                                    crop: 'limit',
                                    quality: 'auto:good',
                                    fetch_format: 'auto'
                                }
                            ]
                        }
                    );
                    newBannerUrls.push(uploadRes.secure_url);
                    console.log('Uploaded and optimized new banner (800x800):', uploadRes.secure_url);
                } catch (uploadError) {
                    console.error(`Failed to upload banner file: ${file.originalname}:`, uploadError.message);
                }
            }
            store.banner = newBannerUrls;
            console.log('All new banners uploaded, optimized, and assigned to store.');
        } else if (req.body.removeBanner === 'true') {
            console.log('Remove banner flag detected. Removing all banners...');
            if (store.banner && store.banner.length > 0) {
                console.log(`Deleting ${store.banner.length} existing banners.`);
                for (const bannerUrl of store.banner) {
                    try {
                        const publicId = bannerUrl.split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`Deleted old banner: ${publicId}`);
                    } catch (deleteError) {
                        console.warn(`Failed to delete old banner ${bannerUrl}:`, deleteError.message);
                    }
                }
            }
            store.banner = [];
            console.log('Banner field set to empty array.');
        }

        const updatedStore = await store.save();
        res.json(updatedStore);

    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get store details by Slug (for customer facing menu)
// @route   GET /api/stores/public/slug/:slug
// @access  Public
router.get('/public/slug/:slug', async (req, res) => {
    try {
        const store = await Store.findOne({ slug: req.params.slug });

        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }
        
        // Return all relevant public fields, including telegramLinks
        res.json({
            _id: store._id,
            name: store.name,
            address: store.address,
            phone: store.phone,
            logo: store.logo,
            description: store.description,
            facebookUrl: store.facebookUrl,
            telegramLinks: store.telegramLinks, // UPDATED: Return telegramLinks array
            tiktokUrl: store.tiktokUrl,
            websiteUrl: store.websiteUrl,
            banner: store.banner,
            publicUrlId: store.publicUrlId,
            slug: store.slug
        });
    } catch (error) {
        console.error('Error fetching public store by slug:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all stores (Superadmin only - for managing slugs)
// @route   GET /api/stores
// @access  Private (Superadmin only)
router.get('/', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const stores = await Store.find()
            .populate('admin', 'name email')
            .sort({ createdAt: -1 });
        
        res.json({
            stores,
            total: stores.length
        });
    } catch (error) {
        console.error('Error fetching stores:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update store slug (Superadmin only)
// @route   PUT /api/stores/:id/slug
// @access  Private (Superadmin only)
router.put('/:id/slug', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const { slug } = req.body;
        
        if (!slug) {
            return res.status(400).json({ message: 'Slug is required' });
        }

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

        const store = await Store.findById(req.params.id);
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (slug !== store.slug) {
            const existingStore = await Store.findOne({ 
                slug: slug,
                _id: { $ne: store._id }
            });
            
            if (existingStore) {
                return res.status(409).json({ message: 'Slug is already in use by another store' });
            }
        }

        store.slug = slug.toLowerCase().trim();
        await store.save();

        res.json({
            _id: store._id,
            name: store.name,
            slug: store.slug,
            admin: store.admin,
            message: 'Store slug updated successfully'
        });

    } catch (error) {
        console.error('Error updating store slug:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: `Validation error: ${errors.join(', ')}` });
        }
        
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get store by ID (Superadmin only)
// @route   GET /api/stores/:id
// @access  Private (Superadmin only)
router.get('/:id', protect, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const store = await Store.findById(req.params.id)
            .populate('admin', 'name email');
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        res.json(store);
    } catch (error) {
        console.error('Error fetching store:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;