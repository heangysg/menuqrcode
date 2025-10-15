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
            required: false, // CHANGED TO OPTIONAL
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Remove the unique index that requires store
// categorySchema.index({ name: 1, store: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;