// qr-digital-menu-system/backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Store = require('../models/Store');
const rateLimit = require('express-rate-limit');

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
        error: 'Too many authentication requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security headers for auth routes
const securityHeaders = (req, res, next) => {
    // Prevent caching of authenticated responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
};

// Enhanced JWT token verification with security checks
const protect = async (req, res, next) => {
    let token;

    // Check for token in multiple locations (header, cookie)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            
            // Validate token format
            if (!token || token.length < 10) {
                return res.status(401).json({ message: 'Invalid token format' });
            }
        } catch (error) {
            return res.status(401).json({ message: 'Malformed authorization header' });
        }
    } else if (req.cookies && req.cookies.auth_token) {
        // Also check for token in HTTP-only cookie
        token = req.cookies.auth_token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    try {
        // Enhanced JWT verification with security options
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            clockTolerance: 30,
            ignoreExpiration: false,
            maxAge: '1h'
        });

        // Validate token payload
        if (!decoded.id || !decoded.role) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        // Check token expiration manually for additional security
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < now) {
            return res.status(401).json({ message: 'Token has expired' });
        }

        // Get user from database with additional security checks
        const user = await User.findById(decoded.id)
            .select('-password -loginAttempts -lockUntil')
            .populate('store', 'name slug isActive');

        if (!user) {
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        // Check if user account is active
        if (user.isLocked) {
            return res.status(423).json({ 
                message: 'Account is temporarily locked. Please contact administrator.' 
            });
        }

        // Attach user to request
        req.user = user;

        // Security logging
        console.log(`User ${user.email} (${user.role}) authenticated from IP: ${req.ip}`);

        next();
    } catch (error) {
        // Enhanced error handling for different JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired' });
        }
        
        if (error.name === 'JsonWebTokenError') {
            console.error('JWT Error:', error.message, 'from IP:', req.ip);
            return res.status(401).json({ message: 'Invalid token' });
        }
        
        if (error.name === 'NotBeforeError') {
            return res.status(401).json({ message: 'Token not yet active' });
        }

        console.error('Authentication error:', error.message, 'from IP:', req.ip);
        return res.status(500).json({ message: 'Server error during authentication' });
    }
};

// Enhanced role-based authorization
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Validate allowed roles array
        if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
            console.error('Invalid role configuration in authorizeRoles middleware');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Check if user has required role
        if (!allowedRoles.includes(req.user.role)) {
            // Security: Log unauthorized access attempts
            console.warn(`Unauthorized access attempt: User ${req.user.email} (${req.user.role}) tried to access ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
            
            return res.status(403).json({ 
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}` 
            });
        }

        next();
    };
};

// Enhanced superadmin password verification with additional security
const verifySuperadminPassword = async (req, res, next) => {
    try {
        const { password, confirmPassword } = req.body;

        // Validate input
        if (!password) {
            return res.status(400).json({ message: 'Password is required for this action' });
        }

        // Additional confirmation for sensitive operations
        if (req.method === 'DELETE' && !confirmPassword) {
            return res.status(400).json({ 
                message: 'Password confirmation is required for this destructive operation' 
            });
        }

        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({ 
                message: 'Password and confirmation do not match' 
            });
        }

        // Get the full user with password and security fields
        const superadmin = await User.findById(req.user._id)
            .select('+password +loginAttempts +lockUntil +lastPasswordChange');

        if (!superadmin) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if superadmin account is locked
        if (superadmin.isLocked) {
            return res.status(423).json({ 
                message: 'Account is temporarily locked due to security reasons' 
            });
        }

        // Verify password using the model's method
        const isPasswordValid = await superadmin.matchPassword(password);
        
        if (!isPasswordValid) {
            // Security: Log failed superadmin password verification
            console.warn(`Failed superadmin password verification for user: ${superadmin.email} from IP: ${req.ip}`);
            
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Security: Log successful superadmin verification for sensitive operations
        if (req.method === 'DELETE') {
            console.log(`Superadmin ${superadmin.email} verified for destructive operation: ${req.method} ${req.originalUrl}`);
        }

        // Remove sensitive fields from request body
        delete req.body.password;
        delete req.body.confirmPassword;
        
        next();
    } catch (error) {
        console.error('Password verification error:', error.message, 'from IP:', req.ip);
        res.status(500).json({ message: 'Server error during password verification' });
    }
};

// Optional: Middleware to require re-authentication for sensitive operations
const requireRecentAuth = (maxAgeMinutes = 15) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1] || req.cookies?.auth_token;
            
            if (!token) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const tokenAge = Date.now() - (decoded.iat * 1000);
            const maxAgeMs = maxAgeMinutes * 60 * 1000;

            if (tokenAge > maxAgeMs) {
                return res.status(401).json({ 
                    message: 'Session too old. Please re-authenticate for this operation.' 
                });
            }

            next();
        } catch (error) {
            console.error('Recent auth verification error:', error);
            return res.status(401).json({ message: 'Authentication verification failed' });
        }
    };
};

/**
 * CRITICAL: Middleware to get admin's store ID and ensure store ownership
 * This is used for ALL admin routes that need store-specific data
 */
                    const getAdminStoreId = async (req, res, next) => {
    try {
        // ALLOW SUPERADMIN TO ACCESS ADMIN ENDPOINTS
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({ 
                message: 'Access denied. Admin role required for this operation.' 
            });
        }

        if (!req.user.store && req.user.role === 'admin') {
            return res.status(404).json({ 
                message: 'No store found for this admin. Please contact administrator.' 
            });
        }

        // For superadmin, skip store validation
        if (req.user.role === 'superadmin') {
            console.log(`👑 Superadmin accessing admin endpoint: ${req.method} ${req.originalUrl}`);
            req.storeId = null;
            req.isSuperadmin = true;
            return next();
        }

        // Rest of the original logic for regular admin
        const store = await Store.findById(req.user.store._id);
        if (!store) {
            return res.status(404).json({ 
                message: 'Store not found or has been deleted.' 
            });
        }

        if (store.isActive === false) {
            return res.status(423).json({ 
                message: 'Store is temporarily inactive. Please contact administrator.' 
            });
        }

        req.storeId = store._id;
        req.storeInfo = store;
        
        console.log(`Admin ${req.user.email} accessing store: ${store.name} (${store._id})`);
        next();
    } catch (error) {
        console.error('Error fetching admin store:', error);
        res.status(500).json({ message: 'Error fetching admin store information' });
    }
};

/**
 * Middleware to ensure proper data access based on role
 * - Superadmin: Can access all data (no store filtering)
 * - Admin: Can only access their store's data (with store filtering)
 */
const authorizeDataAccess = (resourceType = 'general') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // Superadmin can access all data without restrictions
            if (req.user.role === 'superadmin') {
                req.storeId = null; // Explicitly set to null for superadmin
                req.isSuperadmin = true;
                return next();
            }

            // Admin users must have a store and can only access their own data
            if (req.user.role === 'admin') {
                if (!req.user.store) {
                    return res.status(403).json({ 
                        message: 'Access denied. No store associated with your account.' 
                    });
                }

                // For admin routes that use getAdminStoreId, it's already set
                if (!req.storeId) {
                    const store = await Store.findOne({ admin: req.user._id });
                    if (!store) {
                        return res.status(404).json({ 
                            message: 'Store not found for this admin.' 
                        });
                    }
                    req.storeId = store._id;
                }

                req.isSuperadmin = false;
                return next();
            }

            // Other roles not allowed
            return res.status(403).json({ 
                message: 'Access denied. Invalid user role for data access.' 
            });

        } catch (error) {
            console.error('Data access authorization error:', error);
            res.status(500).json({ message: 'Server error in data authorization' });
        }
    };
};

/**
 * Middleware to prevent cross-store data access for specific resources
 * Used when accessing specific resources by ID
 */
const preventCrossStoreAccess = (resourceModel) => {
    return async (req, res, next) => {
        try {
            // Skip if no resource ID provided
            if (!req.params.id) {
                return next();
            }

            // Superadmin can access everything
            if (req.user.role === 'superadmin') {
                return next();
            }

            // Admin users: Check if resource belongs to their store
            if (req.user.role === 'admin') {
                const resource = await resourceModel.findById(req.params.id);
                
                if (!resource) {
                    return res.status(404).json({ message: 'Resource not found' });
                }

                // Check if this is a store-specific resource
                if (resource.store) {
                    // Resource has a store field - verify it matches admin's store
                    if (resource.store.toString() !== req.storeId.toString()) {
                        console.warn(`Cross-store access attempt: Admin ${req.user.email} tried to access ${resourceModel.modelName} ${req.params.id} from store ${resource.store}`);
                        return res.status(403).json({ 
                            message: 'Access denied. This resource does not belong to your store.' 
                        });
                    }
                } else {
                    // Resource has no store field (superadmin resource) - admin cannot access
                    console.warn(`Admin attempted to access superadmin resource: ${req.user.email} tried to access ${resourceModel.modelName} ${req.params.id}`);
                    return res.status(403).json({ 
                        message: 'Access denied. This is a global resource and cannot be accessed by store admins.' 
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Cross-store access prevention error:', error);
            res.status(500).json({ message: 'Server error during resource authorization' });
        }
    };
};

/**
 * Middleware specifically for store ownership verification
 * Used when store ID is explicitly provided in request
 */
const authorizeStoreOwner = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Superadmin can access all stores
        if (req.user.role === 'superadmin') {
            return next();
        }

        // Admin users can only access their own store
        if (req.user.role === 'admin') {
            if (!req.user.store) {
                return res.status(403).json({ 
                    message: 'Access denied. No store associated with your account.' 
                });
            }

            // Check store ID from various sources
            const storeId = req.params.storeId || req.body.store || req.query.store;
            
            if (storeId) {
                if (storeId.toString() !== req.user.store._id.toString()) {
                    console.warn(`Cross-store access attempt: Admin ${req.user.email} tried to access store ${storeId} but owns store ${req.user.store._id}`);
                    return res.status(403).json({ 
                        message: 'Access denied. You can only access your own store data.' 
                    });
                }
            }

            return next();
        }

        return res.status(403).json({ 
            message: 'Access denied. Invalid user role for store access.' 
        });

    } catch (error) {
        console.error('Store ownership verification error:', error);
        return res.status(500).json({ message: 'Server error during store authorization' });
    }
};

/**
 * Special middleware for superadmin-only operations
 * Ensures only superadmin can access certain endpoints
 */
const superadminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ 
            message: 'Access denied. Superadmin privileges required.' 
        });
    }
    next();
};

/**
 * Special middleware for admin-only operations  
 * Ensures only admin can access certain endpoints
 */
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
            message: 'Access denied. Admin privileges required.' 
        });
    }
    next();
};

module.exports = {
    protect,
    authorizeRoles,
    verifySuperadminPassword,
    requireRecentAuth,
    authorizeStoreOwner,
    getAdminStoreId,             // CRITICAL: For admin store-specific operations
    authorizeDataAccess,         // CRITICAL: For role-based data access control
    preventCrossStoreAccess,     // CRITICAL: For preventing cross-store access
    superadminOnly,              // For superadmin-only endpoints
    adminOnly,                   // For admin-only endpoints
    authRateLimit,
    securityHeaders
};