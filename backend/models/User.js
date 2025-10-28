// qr-digital-menu-system/backend/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
            trim: true,
            maxlength: [50, 'Name cannot be more than 50 characters'],
            match: [/^[a-zA-Z\s\u1780-\u17FF\u0E00-\u0E7F\-'.]+$/, 'Name can only contain letters and spaces']
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            lowercase: true,
            trim: true,
            validate: [validator.isEmail, 'Please enter a valid email address'],
            maxlength: [100, 'Email cannot be more than 100 characters']
        },
        password: {
            type: String,
            required: [true, 'Please add a password'],
            minlength: [8, 'Password must be at least 8 characters'],
            maxlength: [100, 'Password cannot be more than 100 characters'],
            select: false,
            // REMOVE the strict password validation from schema level - do it in the route instead
        },
        role: {
            type: String,
            enum: {
                values: ['superadmin', 'admin'],
                message: 'Role must be either superadmin or admin'
            },
            default: 'admin',
        },
        store: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            default: null,
        },
        loginAttempts: {
            type: Number,
            default: 0,
            select: false
        },
        lockUntil: {
            type: Date,
            select: false
        },
        lastLogin: {
            type: Date,
            select: false
        },
        lastPasswordChange: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true,
    }
);

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ store: 1 });

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Encrypt password before saving - SIMPLIFIED VERSION
userSchema.pre('save', async function (next) {
    // Only run if password was modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        this.lastPasswordChange = Date.now();
        next();
    } catch (error) {
        next(error);
    }
});

// Compare user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    // If account is locked, don't allow login
    if (this.isLocked) {
        throw new Error('Account is temporarily locked due to too many failed login attempts');
    }

    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    
    // Update login attempts and lock if necessary
    if (isMatch) {
        // Reset login attempts on successful login
        if (this.loginAttempts > 0) {
            this.loginAttempts = 0;
            this.lockUntil = undefined;
            this.lastLogin = new Date();
            await this.save();
        }
        return true;
    } else {
        // Increment login attempts
        this.loginAttempts += 1;
        
        // Lock account after 5 failed attempts for 30 minutes
        if (this.loginAttempts >= 5) {
            this.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
        }
        
        await this.save();
        return false;
    }
};

// Method to reset login attempts (for admin use)
userSchema.methods.resetLoginAttempts = async function() {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    await this.save();
};

// Transform output to remove sensitive data
userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.loginAttempts;
    delete userObject.lockUntil;
    return userObject;
};

const User = mongoose.model('User', userSchema);
module.exports = User;