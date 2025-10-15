// qr-digital-menu-system/backend/routes/stores.js

const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const cloudinary = require('cloudinary').v2;
const multer = require('multer'); // For handling file uploads
const slugify = require('slugify'); // Import slugify

// Set up Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit per file
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
router.get('/my-store', protect, authorizeRoles('admin'), async (req, res) => {
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
// Using .fields() for multiple file uploads (logo and multiple banners)
router.put('/my-store', protect, authorizeRoles('admin'), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 3 }]), async (req, res) => {
    try {
        let store = await Store.findOne({ admin: req.user._id });

        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        // Destructure all fields, including new ones
        const { name, address, phone, description, facebookUrl, telegramUrl, tiktokUrl, websiteUrl } = req.body;

        // Update basic text fields
        store.name = name !== undefined ? name : store.name;
        store.address = address !== undefined ? address : store.address;
        store.phone = phone !== undefined ? phone : store.phone;
        store.description = description !== undefined ? description : store.description; // Update description
        store.facebookUrl = facebookUrl !== undefined ? facebookUrl : store.facebookUrl; // Update social links
        store.telegramUrl = telegramUrl !== undefined ? telegramUrl : store.telegramUrl;
        store.tiktokUrl = tiktokUrl !== undefined ? tiktokUrl : store.tiktokUrl;
        store.websiteUrl = websiteUrl !== undefined ? websiteUrl : store.websiteUrl;

        // The pre-save hook in the Store model will handle updating the slug if 'name' is modified.

        // Handle logo upload or removal
        if (req.files && req.files.logo && req.files.logo[0]) {
            console.log('New logo file detected. Uploading...');
            // A new file is provided, delete old one and upload new
            if (store.logo) {
                const publicId = store.logo.split('/').pop().split('.')[0]; // Extract public ID from URL
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
            store.logo = uploadRes.secure_url; // Save the secure URL
            console.log('New logo uploaded:', store.logo);
        } else if (req.body.removeLogo === 'true') { // Check for explicit removal flag from frontend
            console.log('Remove logo flag detected. Removing...');
            if (store.logo) {
                const publicId = store.logo.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
                console.log('Existing logo deleted from Cloudinary.');
            }
            store.logo = ''; // Set logo field to empty string in DB
            console.log('Logo field set to empty.');
        }
        // If no new logo file and no remove flag, logo remains unchanged.

        // Handle banner upload or removal with optimized compression (800x800 + auto compression)
        if (req.files && req.files.banner && req.files.banner.length > 0) {
            console.log(`New banner files detected: ${req.files.banner.length}. Uploading and optimizing to 800x800...`);
            // New banner files are provided. Delete all existing banners and upload new ones.
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
                            folder: 'ysgstore/banners', // Dedicated folder for banners
                            resource_type: 'image',
                            transformation: [
                                {
                                    width: 800,
                                    height: 800,
                                    crop: 'limit', // 'limit' maintains aspect ratio and ensures dimensions don't exceed 800x800
                                    quality: 'auto:good', // Optimized compression (reduces 3MB to ~100-300KB)
                                    fetch_format: 'auto' // Converts to WebP/AVIF for better compression
                                }
                            ]
                        }
                    );
                    newBannerUrls.push(uploadRes.secure_url);
                    console.log('Uploaded and optimized new banner (800x800):', uploadRes.secure_url);
                } catch (uploadError) {
                    console.error(`Failed to upload banner file: ${file.originalname}:`, uploadError.message);
                    // Decide whether to throw or continue. For now, continue and log.
                }
            }
            store.banner = newBannerUrls; // Save the array of new banner URLs
            console.log('All new banners uploaded, optimized, and assigned to store.');
        } else if (req.body.removeBanner === 'true') { // Check for explicit removal flag from frontend
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
            store.banner = []; // Set banner field to empty array in DB
            console.log('Banner field set to empty array.');
        }
        // If no new banner files and no remove flag, banners remain unchanged.

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
        // Find store by slug instead of publicUrlId
        const store = await Store.findOne({ slug: req.params.slug });

        if (!store) {
            return res.status(404).json({ message: 'Store not found.' });
        }
        // Return all relevant public fields, including new ones
        res.json({
            _id: store._id, // Keep _id for internal use if needed by frontend
            name: store.name,
            address: store.address,
            phone: store.phone,
            logo: store.logo,
            description: store.description, // Include description
            facebookUrl: store.facebookUrl, // Include social links
            telegramUrl: store.telegramUrl,
            tiktokUrl: store.tiktokUrl,
            websiteUrl: store.websiteUrl,
            banner: store.banner, // MODIFIED: Include banner (now an array)
            publicUrlId: store.publicUrlId, // Still return this, though not used for public URL
            slug: store.slug // Include the slug
        });
    } catch (error) {
        console.error('Error fetching public store by slug:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;