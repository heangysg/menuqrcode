// qr-digital-menu-system/backend/models/Category.js

const mongoose = require('mongoose');

const categorySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a category name'],
            trim: true,
        },
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
        },
        // You might want to add an 'order' field for custom sorting
        order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure unique category names per store
categorySchema.index({ name: 1, store: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;