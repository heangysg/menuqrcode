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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
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
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update store details and logo for the authenticated admin
// @route   PUT /api/stores/my-store
// @access  Private (Admin only)
router.put('/my-store', protect, authorizeRoles('admin'), upload.single('logo'), async (req, res) => {
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
        if (req.file) {
            // A new file is provided, delete old one and upload new
            if (store.logo) {
                const publicId = store.logo.split('/').pop().split('.')[0]; // Extract public ID from URL
                await cloudinary.uploader.destroy(publicId);
            }
            const uploadRes = await cloudinary.uploader.upload(
                `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
                {
                    folder: 'qr_digital_menu_logos', // Optional: specific folder in Cloudinary
                    resource_type: 'image',
                    quality: 'auto',
                    fetch_format: 'auto'
                }
            );
            store.logo = uploadRes.secure_url; // Save the secure URL
        } else if (req.body.logo === '') {
            // If req.file is not present AND req.body.logo is explicitly an empty string,
            // it means the user wants to remove the existing logo.
            if (store.logo) {
                const publicId = store.logo.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
            store.logo = ''; // Set logo field to empty string in DB
        }
        // If req.file is not present AND req.body.logo is not '', then the logo remains unchanged.


        const updatedStore = await store.save();
        res.json(updatedStore);

    } catch (error) {
        console.error('Error updating store:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get store details by Slug (for customer facing menu)
// @route   GET /api/stores/public/slug/:slug  <--- CHANGED ROUTE
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
            publicUrlId: store.publicUrlId, // Still return this, though not used for public URL
            slug: store.slug // Include the slug
        });
    } catch (error) {
        console.error('Error fetching public store by slug:', error);
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
