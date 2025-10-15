// qr-digital-menu-system/backend/server.js

const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const connectDB = require('./config/db');
const connectCloudinary = require('./config/cloudinary');
const path = require('path');
const helmet = require('helmet');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const storeRoutes = require('./routes/stores');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');

// Connect to database & Cloudinary
connectDB();
connectCloudinary();

const app = express();

// --- Middleware ---
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.originalUrl}`);
    next();
});

const corsOptions = {
    origin: [
        'http://localhost:5000',
        'https://menuqrcode.onrender.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// In backend/server.js - Update the CSP imgSrc
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
            imgSrc: [
                "'self'", 
                "data:", 
                "https://res.cloudinary.com", 
                "https://placehold.co", 
                "https://corsproxy.io",
                "https://www.twothousand.com", // Add your external domain
                "https:" // Allow all HTTPS images (be careful with this)
            ],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://menuqrcode.onrender.com", "http://localhost:5000"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://www.google.com"],
            workerSrc: ["'self'"],
        },
    },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static assets early so they aren't intercepted by routes
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/menu', express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

// ---- CLEAN URL HANDLING ----

// Redirect requests ending with .html to clean URLs
app.use((req, res, next) => {
    if (req.path.endsWith('.html')) {
        const newPath = req.path.slice(0, -5); // remove ".html"
        return res.redirect(301, newPath + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
    }
    next();
});

// Pretty URL for menu with slug
app.get('/menu/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/menu.html'));
});

// Serve root (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve HTML pages without extension
app.get('/:page', (req, res, next) => {
    const filePath = path.join(__dirname, '../frontend', `${req.params.page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) next();
    });
});

// Serve static assets (css, js, images, etc.)
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- START SERVER ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
