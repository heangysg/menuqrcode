// qr-digital-menu-system/backend/models/Product.js

const mongoose = require('mongoose');

const productSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a product title'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        price: {
            type: String, // <--- CHANGED FROM Number TO String
            required: false, // Price is optional
            trim: true, // Trim whitespace from the string
            default: '', // Default to empty string instead of 0
        },
        image: {
            type: String, // URL from Cloudinary (or public_id if you prefer)
            default: '',
        },
        // NEW: Field to store direct image URL
        imageUrl: {
            type: String,
            trim: true,
            default: '',
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Please select a category'],
        },
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
        },
        // You might want to add an 'order' field for custom sorting within a category
        order: {
            type: Number,
            default: 0,
        },
        isAvailable: { // e.g., for marking out-of-stock
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
