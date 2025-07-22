// qr-digital-menu-system/backend/utils/jwt.js

const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN, // e.g., '1h', '1d'
    });
};

module.exports = generateToken;