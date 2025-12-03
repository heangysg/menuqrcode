// qr-digital-menu-system/backend/server.js

const express = require('express');
const dotenv = require('dotenv').config();
const cors = require('cors');
const connectDB = require('./config/db');
const { connectCloudinary } = require('./config/cloudinary');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const storeRoutes = require('./routes/stores');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const wallpaperRoutes = require('./routes/wallpapers'); 
// Connect to database
connectDB();

// Connect to Cloudinary asynchronously
(async () => {
    try {
        await connectCloudinary();
        console.log('✅ Cloudinary Connected Successfully');
    } catch (error) {
        console.error('❌ Cloudinary Connection Failed:', error.message);
        // Continue without Cloudinary in production
        if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️  Continuing without Cloudinary in production');
        } else {
            process.exit(1); 
        }
    }
})();

const app = express();

// --- Security Middleware ---

// Security headers with proper CSP
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
                "https:",
                "http:",
                "blob:"
            ],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'", "https://www.google.com"],
            workerSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Prevent NoSQL injection
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Secure CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:5000',
            'http://localhost:3000',
            'https://menuqrcode.onrender.com',
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Body parsing with limits
app.use(express.json({
    limit: '10kb'
}));
app.use(express.urlencoded({
    extended: false,
    limit: '10kb'
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
});

// ---- CLEAN URL HANDLING ----

// Redirect .html URLs to clean URLs (EXCEPT index.html which we handle separately)
app.use((req, res, next) => {
    if (req.path.endsWith('.html') && req.path !== '/index.html') {
        const newPath = req.path.slice(0, -5);
        return res.redirect(301, newPath);
    }
    next();
});

// Redirect index.html to root
app.get('/index.html', (req, res) => {
    res.redirect(301, '/');
});

// Serve static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/wallpapers', wallpaperRoutes);

// ---- PAGE ROUTES ----

// Serve specific pages with clean URLs
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

app.get('/superadmin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/superadmin.html'));
});

app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/menu.html'));
});

// Pretty URL for menu with slug
app.get('/menu/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/menu.html'));
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        status: 'fail',
        message: `API route ${req.originalUrl} not found`
    });
});

// 404 handler for frontend routes
app.use('*', (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);

    // CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            status: 'fail',
            message: 'CORS policy: Origin not allowed'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
    });
});

// ---- START SERVER ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
    console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Rate limiting: DISABLED (Development mode)`);
    console.log(`✅ Clean URLs enabled: .html extensions are automatically redirected`);
});