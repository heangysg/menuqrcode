    // qr-digital-menu-system/backend/models/Store.js

    const mongoose = require('mongoose');
    const slugify = require('slugify'); // We'll need to install this package

    const storeSchema = mongoose.Schema(
        {
            admin: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
                unique: true, // Each admin can only have one store
            },
            name: {
                type: String,
                required: [true, 'Please add a store name'],
                trim: true,
            },
            slug: { // NEW FIELD: URL-friendly name
                type: String,
                unique: true,
                index: true, // Add an index for faster lookups
            },
            address: {
                type: String,
                trim: true,
                default: '',
            },
            phone: {
                type: String,
                trim: true,
                default: '',
            },
            logo: {
                type: String, // URL from Cloudinary
                default: '',
            },
            // New fields for store description and social media links
            description: {
                type: String,
                trim: true,
                default: '',
            },
            facebookUrl: {
                type: String,
                trim: true,
                default: '',
            },
            telegramUrl: {
                type: String,
                trim: true,
                default: '',
            },
            tiktokUrl: {
                type: String,
                trim: true,
                default: '',
            },
            websiteUrl: {
                type: String,
                trim: true,
                default: '',
            },
            // publicUrlId will still exist but won't be used for public menu links
            publicUrlId: {
                type: String,
                unique: true,
                required: true,
            },
        },
        {
            timestamps: true,
        }
    );

    // Pre-save hook to generate slug from store name
    storeSchema.pre('save', function (next) {
        if (this.isModified('name') || this.isNew) {
            this.slug = slugify(this.name, { lower: true, strict: true });
        }
        next();
    });

    const Store = mongoose.model('Store', storeSchema);
    module.exports = Store;
    