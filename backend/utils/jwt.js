// qr-digital-menu-system/backend/utils/jwt.js

const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h', // CHANGED: 24 hours instead of 1 hour
        algorithm: 'HS256' // Explicitly specify algorithm for security
    });
};

module.exports = generateToken;