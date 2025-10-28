// qr-digital-menu-system/backend/models/Category.js

const mongoose = require('mongoose');

const categorySchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a category name'],
            trim: true,
            maxlength: [50, 'Category name cannot be more than 50 characters']
            // REMOVED any unique: true constraint if it exists
        },
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: false,
        },
        order: {
            type: Number,
            default: 0,
            min: [0, 'Order cannot be negative'],
            max: [1000, 'Order cannot be more than 1000']
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
    }
);

// Compound index to allow same name across different stores, but unique within same store
categorySchema.index({ store: 1, name: 1 }, { unique: false }); // Changed to non-unique
categorySchema.index({ store: 1, isActive: 1 });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;