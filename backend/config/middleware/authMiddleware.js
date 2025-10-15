// qr-digital-menu-system/backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach user to the request (without password)
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: `User role ${req.user ? req.user.role : 'unauthenticated'} is not authorized to access this route.` });
        }
        next();
    };
};

// Middleware to verify superadmin password
const verifySuperadminPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ message: 'Password is required for this action' });
        }

        // Get the full user with password (since we normally exclude it)
        const superadmin = await User.findById(req.user._id).select('+password');
        
        if (!superadmin) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password using the model's method
        const isPasswordValid = await superadmin.matchPassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }
        
        // Remove the password from the request body so it doesn't interfere with other middleware
        delete req.body.password;
        
        next();
    } catch (error) {
        console.error('Password verification error:', error);
        res.status(500).json({ message: 'Server error during password verification' });
    }
};

module.exports = {
    protect,
    authorizeRoles,
    verifySuperadminPassword
};