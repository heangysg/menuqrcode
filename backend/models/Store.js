// qr-digital-menu-system/backend/models/Store.js

const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const storeSchema = mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Admin user is required'],
            unique: true,
            index: true
        },
        name: {
            type: String,
            required: [true, 'Please add a store name'],
            trim: true,
            minlength: [1, 'Store name must be at least 1 character long'],
            maxlength: [100, 'Store name cannot be more than 100 characters'],
            validate: {
                validator: function(v) {
                    return v && v.trim().length > 0 && 
                           !/<script|javascript:|onload=|onerror=/gi.test(v.toLowerCase());
                },
                message: 'Store name contains invalid or dangerous characters'
            }
        },
        slug: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
            required: [true, 'Store slug is required'],
            validate: {
                validator: function(v) {
                    return /^[a-z0-9\-]+$/.test(v);
                },
                message: 'Slug can only contain lowercase letters, numbers, and hyphens'
            }
        },
        address: {
            type: String,
            trim: true,
            default: '',
            maxlength: [500, 'Address cannot be more than 500 characters']
        },
        phone: {
            type: String,
            trim: true,
            default: '',
            maxlength: [50, 'Phone number cannot be more than 50 characters'],
            validate: {
                validator: function(v) {
                    if (!v || v.trim() === '') return true;
                    
                    const cleaned = v.replace(/[^\d+]/g, '');
                    
                    return cleaned.length >= 6 && /^[\+]?[0-9\s\-\(\)\.\/]{6,}$/.test(v);
                },
                message: 'Please provide a valid phone number (minimum 6 digits). Formats allowed: +85512345678, 012345678, 123-456-7890, 097 67 67 854'
            }
        },
        logo: {
            type: String,
            default: '',
            validate: {
                validator: function(v) {
                    if (!v || v.trim() === '') return true;
                    return validator.isURL(v, {
                        protocols: ['http', 'https'],
                        require_protocol: true,
                        require_valid_protocol: true,
                        allow_underscores: true
                    });
                },
                message: 'Logo must be a valid URL'
            }
        },
        description: {
            type: String,
            trim: true,
            default: '',
            maxlength: [500, 'Description cannot be more than 500 characters'],
            validate: {
                validator: function(v) {
                    if (!v || v.trim() === '') return true;
                    return v.length >= 10 && v.length <= 500;
                },
                message: 'Description must be between 10 and 500 characters'
            }
        },
        facebookUrl: {
            type: String,
            trim: true,
            default: '',
            validate: {
                validator: function(v) {
                    if (!v || v.trim() === '') return true;
                    return validator.isURL(v, {
                        protocols: ['http', 'https'],
                        require_protocol: true,
                        host_whitelist: ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com']
                    });
                },
                message: 'Please provide a valid Facebook URL'
            }
        },
         // ADD THIS FIELD FOR WALLPAPER
        wallpaperUrl: {
            type: String,
            default: '',
            validate: {
                validator: function(v) {
                    if (!v || v.trim() === '') return true;
                    return validator.isURL(v, {
                        protocols: ['http', 'https'],
                        require_protocol: true,
                        require_valid_protocol: true,
                        allow_underscores: true
                    });
                },
                message: 'Wallpaper must be a valid URL'
            }
        },
        telegramLinks: {
            type: [{
                name: {
                    type: String,
                    trim: true,
                    required: [true, 'Telegram link name is required'],
                    maxlength: [50, 'Telegram link name cannot be more than 50 characters']
                },
                url: {
                    type: String,
                    trim: true,
                    required: [true, 'Telegram URL is required'],
                    validate: {
                        validator: function(v) {
                            return validator.isURL(v, {
                                protocols: ['http', 'https'],
                                require_protocol: true,
                                host_whitelist: ['t.me', 'telegram.me']
                            });
                        },
                        message: 'Please provide a valid Telegram URL'
                    }
                }
            }],
            default: [],
            validate: {
                validator: function(v) {
                    return v.length <= 5;
                },
                message: 'Cannot have more than 5 Telegram links'
            }
        },
        tiktokUrl: {
            type: String,
            trim: true,
            default: '',
            validate: {
                validator: function(v) {
                    if (!v || v.trim() === '') return true;
                    return validator.isURL(v, {
                        protocols: ['http', 'https'],
                        require_protocol: true,
                        host_whitelist: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com']
                    });
                },
                message: 'Please provide a valid TikTok URL'
            }
        },
        websiteUrl: {
            type: String,
            trim: true,
            default: '',
            validate: {
                validator: function(v) {
                    if (!v || v.trim() === '') return true;
                    return validator.isURL(v, {
                        protocols: ['http', 'https'],
                        require_protocol: true,
                        require_valid_protocol: true
                    });
                },
                message: 'Please provide a valid website URL'
            }
        },
        banner: {
            type: [String],
            default: [],
            validate: {
                validator: function(v) {
                    if (v.length > 5) {
                        return false;
                    }
                    
                    return v.every(url => {
                        if (!url || url.trim() === '') return false;
                        return validator.isURL(url, {
                            protocols: ['http', 'https'],
                            require_protocol: true,
                            require_valid_protocol: true
                        });
                    });
                },
                message: 'Cannot have more than 5 banner images and all must be valid URLs'
            }
        },
        publicUrlId: {
            type: String,
            unique: true,
            required: [true, 'Public URL ID is required'],
            validate: {
                validator: function(v) {
                    return validator.isUUID(v, 4);
                },
                message: 'Public URL ID must be a valid UUID v4'
            }
        },
        isActive: {
            type: Boolean,
            default: true
        },
        settings: {
            theme: {
                type: String,
                default: 'default',
                enum: ['default', 'dark', 'light', 'orange']
            },
            language: {
                type: String,
                default: 'km',
                enum: ['km', 'en', 'zh']
            },
            currency: {
                type: String,
                default: 'USD',
                enum: ['USD', 'KHR', 'THB', 'CNY']
            }
        },
        lastActive: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function(doc, ret) {
                delete ret.__v;
                delete ret.publicUrlId;
                return ret;
            }
        },
        toObject: {
            virtuals: true,
            transform: function(doc, ret) {
                delete ret.__v;
                delete ret.publicUrlId;
                return ret;
            }
        }
    }
);

// Virtual for public store URL
storeSchema.virtual('publicUrl').get(function() {
    return `/menu/${this.slug}`;
});

// Virtual for store age
storeSchema.virtual('ageInDays').get(function() {
    const created = new Date(this.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ADD: Pre-save hook to migrate old single telegramUrl to new telegramLinks array
storeSchema.pre('save', function (next) {
    // If we have old telegramUrl but no telegramLinks, migrate it
    if (this.telegramUrl && this.telegramUrl.trim() !== '' && 
        (!this.telegramLinks || this.telegramLinks.length === 0)) {
        
        this.telegramLinks = [{
            name: 'Telegram',
            url: this.telegramUrl
        }];
        
        // Clear the old field
        this.telegramUrl = '';
    }
    
    next();
});

// Pre-save hook to validate slug and ensure uniqueness
storeSchema.pre('save', async function (next) {
    if (this.slug) {
        this.slug = this.slug.toLowerCase().trim();
    }
    
    if (this.isModified('slug') || this.isNew) {
        try {
            const existingStore = await mongoose.model('Store').findOne({ 
                slug: this.slug,
                _id: { $ne: this._id }
            });
            
            if (existingStore) {
                return next(new Error('Slug is already in use by another store'));
            }
        } catch (error) {
            return next(error);
        }
    }
    
    next();
});

// Pre-save hook to sanitize and validate data
storeSchema.pre('save', function (next) {
    const stringFields = ['name', 'address', 'phone', 'description', 'facebookUrl', 'tiktokUrl', 'websiteUrl'];
    
    stringFields.forEach(field => {
        if (this[field] && typeof this[field] === 'string') {
            this[field] = this[field].trim();
        }
    });

    const urlFields = ['facebookUrl', 'tiktokUrl', 'websiteUrl', 'logo'];
    
    urlFields.forEach(field => {
        if (this[field] && this[field].trim() !== '' && !this[field].startsWith('http')) {
            this[field] = `https://${this[field]}`;
        }
    });
    
    // Sanitize telegramLinks URLs
    if (this.telegramLinks && Array.isArray(this.telegramLinks)) {
        this.telegramLinks = this.telegramLinks.map(link => {
            if (link && link.url && link.url.trim() !== '' && !link.url.startsWith('http')) {
                link.url = `https://${link.url}`;
            }
            return link;
        }).filter(link => link && link.name && link.url);
    }
    
    if (this.banner && Array.isArray(this.banner)) {
        this.banner = this.banner.map(url => {
            if (url && url.trim() !== '' && !url.startsWith('http')) {
                return `https://${url}`;
            }
            return url && url.trim() !== '' ? url : null;
        }).filter(url => url);
    }
    
    if (this.phone && typeof this.phone === 'string') {
        this.phone = this.phone.trim().replace(/\s+/g, ' ');
    }

    next();
});

// Pre-validate hook for better error handling
storeSchema.pre('validate', function(next) {
    const optionalFields = ['address', 'phone', 'description', 'facebookUrl', 'tiktokUrl', 'websiteUrl', 'logo'];
    
    optionalFields.forEach(field => {
        if (this[field] == null || this[field] === undefined) {
            this[field] = '';
        }
    });

    if (!Array.isArray(this.banner)) {
        this.banner = [];
    }

    if (!Array.isArray(this.telegramLinks)) {
        this.telegramLinks = [];
    }

    next();
});

// Pre-remove hook to clean up associated data
storeSchema.pre('remove', async function (next) {
    try {
        const Product = mongoose.model('Product');
        const Category = mongoose.model('Category');
        
        await Product.deleteMany({ store: this._id });
        await Category.deleteMany({ store: this._id });
        
        console.log(`Cleaned up data for store: ${this.name} (${this._id})`);
        next();
    } catch (error) {
        console.error('Error cleaning up store data:', error);
        next(error);
    }
});

// Instance method to update last active timestamp
storeSchema.methods.updateLastActive = function() {
    this.lastActive = new Date();
    return this.save();
};

// Instance method to check if store is recently active
storeSchema.methods.isRecentlyActive = function(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.lastActive >= cutoff;
};

// Instance method to sanitize phone number for display
storeSchema.methods.getFormattedPhone = function() {
    if (!this.phone || this.phone.trim() === '') return '';
    
    const cleaned = this.phone.replace(/\D/g, '');
    if (cleaned.startsWith('855')) {
        return `+${cleaned}`;
    } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
        return `+855${cleaned}`;
    } else if (cleaned.length === 8 && cleaned.startsWith('0')) {
        return `+855${cleaned.substring(1)}`;
    }
    
    return this.phone;
};

// Static method to find active stores
storeSchema.statics.findActive = function() {
    return this.find({ isActive: true })
        .populate('admin', 'name email')
        .sort({ lastActive: -1 });
};

// Static method to find stores by slug with validation
storeSchema.statics.findBySlug = function(slug) {
    if (!slug || typeof slug !== 'string' || slug.length < 2) {
        throw new Error('Invalid slug provided');
    }
    
    return this.findOne({ 
        slug: slug.toLowerCase(),
        isActive: true 
    }).populate('admin', 'name email');
};

// Static method to get store statistics
storeSchema.statics.getStats = async function() {
    const totalStores = await this.countDocuments();
    const activeStores = await this.countDocuments({ isActive: true });
    const recentStores = await this.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    return {
        totalStores,
        activeStores,
        inactiveStores: totalStores - activeStores,
        recentStores
    };
};

// Static method to validate phone number format
storeSchema.statics.validatePhoneFormat = function(phone) {
    if (!phone || phone.trim() === '') return true;
    
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 8 && /^[\+]?[0-9\s\-\(\)\.]{8,}$/.test(phone);
};

// Static method to find stores by admin ID
storeSchema.statics.findByAdmin = function(adminId) {
    return this.findOne({ admin: adminId })
        .populate('admin', 'name email')
        .sort({ lastActive: -1 });
};

// Static method to generate unique slug (for fallback)
storeSchema.statics.generateUniqueSlug = async function(baseSlug) {
    let finalSlug = baseSlug;
    let counter = 1;
    let existingStore = null;
    
    do {
        existingStore = await this.findOne({ slug: finalSlug });
        
        if (existingStore) {
            finalSlug = `${baseSlug}-${counter}`;
            counter++;
        }
    } while (existingStore && counter < 100);
    
    return finalSlug;
};

// Compound indexes for better query performance
storeSchema.index({ slug: 1, isActive: 1 });
storeSchema.index({ admin: 1, isActive: 1 });
storeSchema.index({ publicUrlId: 1, isActive: 1 });
storeSchema.index({ lastActive: -1 });
storeSchema.index({ createdAt: -1 });
storeSchema.index({ 'settings.language': 1, isActive: 1 });

// Text index for search functionality
storeSchema.index({
    name: 'text',
    description: 'text',
    address: 'text'
});

// Query helper for active stores
storeSchema.query.active = function() {
    return this.where({ isActive: true });
};

// Query helper for stores with specific language
storeSchema.query.byLanguage = function(language) {
    return this.where({ 'settings.language': language });
};

// Query helper for stores with phone number
storeSchema.query.withPhone = function() {
    return this.where({ phone: { $ne: '', $exists: true } });
};

// Middleware to update lastActive on certain operations
storeSchema.pre('findOneAndUpdate', function(next) {
    this.set({ lastActive: new Date() });
    next();
});

// Error handling middleware
storeSchema.post('save', function(error, doc, next) {
    if (error.name === 'MongoError' && error.code === 11000) {
        if (error.keyPattern.slug) {
            next(new Error('Store with this slug already exists'));
        } else if (error.keyPattern.admin) {
            next(new Error('Store with this admin already exists'));
        } else if (error.keyPattern.publicUrlId) {
            next(new Error('Store with this public URL ID already exists'));
        } else {
            next(new Error('Store with this information already exists'));
        }
    } else if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        next(new Error(messages.join(', ')));
    } else {
        next(error);
    }
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;