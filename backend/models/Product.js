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
            type: String,
            required: false,
            trim: true,
            default: '',
        },
        image: {
            type: String,
            default: '',
        },
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
            required: false, // CHANGED TO OPTIONAL
        },
        order: {
            type: Number,
            default: 0,
        },
        isAvailable: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);
// Add indexes for better performance
productSchema.index({ store: 1, isAvailable: 1 });
productSchema.index({ store: 1, category: 1, isAvailable: 1 });
productSchema.index({ store: 1, title: 'text', description: 'text' });
const Product = mongoose.model('Product', productSchema);
module.exports = Product;