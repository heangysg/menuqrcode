// qr-digital-menu-system/backend/utils/jwt.js

const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h', 
        algorithm: 'HS256'
    });
};

module.exports = generateToken;