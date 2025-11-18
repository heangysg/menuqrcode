// backend/routes/wallpapers.js
const express = require('express');
const router = express.Router();
const Wallpaper = require('../models/Wallpaper');
const Store = require('../models/Store');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Set up Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Superadmin only middleware
const superadminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Superadmin only.' });
    }
};

// @desc    Upload a new wallpaper (Superadmin only)
// @route   POST /api/wallpapers
// @access  Private (Superadmin only)
router.post('/', protect, superadminOnly, upload.single('wallpaper'), async (req, res) => {
    try {
        // Check if file is provided
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a wallpaper image' });
        }

        // Check current wallpaper count (max 3)
        const currentCount = await Wallpaper.countDocuments({ uploadedBy: req.user._id });
        if (currentCount >= 3) {
            return res.status(400).json({ 
                message: 'Maximum limit reached. You can only upload up to 3 wallpapers.' 
            });
        }

        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Wallpaper name is required' });
        }

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(
            `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
            {
                folder: 'ysgstore/wallpapers',
                resource_type: 'image',
                transformation: [
                    {
                        width: 1920,
                        height: 1080,
                        crop: 'limit',
                        quality: 'auto:good',
                        fetch_format: 'auto'
                    }
                ]
            }
        );

        // Create wallpaper record
        const wallpaper = new Wallpaper({
            name: name.trim(),
            imageUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            uploadedBy: req.user._id
        });

        await wallpaper.save();
        
        // Populate uploader info for response
        await wallpaper.populate('uploadedBy', 'name email');

        res.status(201).json({
            message: 'Wallpaper uploaded successfully',
            wallpaper: wallpaper
        });

    } catch (error) {
        console.error('Error uploading wallpaper:', error);
        
        if (error.message.includes('File size too large')) {
            return res.status(400).json({ message: 'File size too large. Maximum size is 5MB.' });
        }
        
        if (error.message.includes('image files')) {
            return res.status(400).json({ message: 'Only image files are allowed.' });
        }
        
        res.status(500).json({ message: error.message || 'Server error during wallpaper upload' });
    }
});

// @desc    Get all wallpapers (for admin selection)
// @route   GET /api/wallpapers
// @access  Private (Admin & Superadmin)
router.get('/', protect, authorizeRoles('admin', 'superadmin'), async (req, res) => {
    try {
        // Allow both admin and superadmin to see all wallpapers
        const wallpapers = await Wallpaper.getAllWithUploader();
        
        res.json({
            wallpapers,
            total: wallpapers.length
        });
    } catch (error) {
        console.error('Error fetching wallpapers:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete a wallpaper (Superadmin only)
// @route   DELETE /api/wallpapers/:id
// @access  Private (Superadmin only)
router.delete('/:id', protect, superadminOnly, async (req, res) => {
    try {
        const wallpaper = await Wallpaper.findById(req.params.id);
        
        if (!wallpaper) {
            return res.status(404).json({ message: 'Wallpaper not found' });
        }

        // Check if the current user is the uploader
        if (wallpaper.uploadedBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({ 
                message: 'Not authorized to delete this wallpaper' 
            });
        }

        // Delete from Cloudinary
        await cloudinary.uploader.destroy(wallpaper.publicId);

        // Delete from database
        await Wallpaper.findByIdAndDelete(req.params.id);

        res.json({ 
            message: 'Wallpaper deleted successfully',
            deletedId: req.params.id
        });

    } catch (error) {
        console.error('Error deleting wallpaper:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get wallpaper count for current superadmin
// @route   GET /api/wallpapers/count/my-wallpapers
// @access  Private (Superadmin only)
router.get('/count/my-wallpapers', protect, superadminOnly, async (req, res) => {
    try {
        const count = await Wallpaper.countByUser(req.user._id);
        
        res.json({
            count,
            maxLimit: 3,
            remaining: Math.max(0, 3 - count)
        });
    } catch (error) {
        console.error('Error counting wallpapers:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;