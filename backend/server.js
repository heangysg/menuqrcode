// qr-digital-menu-system/backend/server.js

const express = require('express');
const dotenv = require('dotenv').config(); // Load environment variables from .env file
const cors = require('cors'); // For handling Cross-Origin Resource Sharing
const connectDB = require('./config/db'); // MongoDB connection
const connectCloudinary = require('./config/cloudinary'); // Cloudinary connection
const path = require('path'); // Node.js built-in module for path manipulation
const helmet = require('helmet'); // For setting security-related HTTP headers

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const storeRoutes = require('./routes/stores');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');

// Connect to database
connectDB();

// Connect to Cloudinary
connectCloudinary();

const app = express();

// --- Middleware ---

// NEW: Global request logger - This will log every incoming request to the console
app.use((req, res, next) => {
    console.log(`Incoming Request: ${req.method} ${req.originalUrl}`);
    next();
});

// Configure CORS for specific origins and methods
const corsOptions = {
    origin: [
        'http://localhost:5000', // Your local development frontend
        'https://menu-qr-61oz.onrender.com', // Your deployed Render frontend URL
        // Add any other domains that need to access your API
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Implement Helmet for comprehensive security headers, especially CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"], // Only allow resources from the same origin by default
            scriptSrc: [
                "'self'",
                "'unsafe-inline'", // Required for inline scripts (e.g., Tailwind CDN's JIT mode)
                "https://cdn.tailwindcss.com", // Tailwind CSS CDN
                "https://cdn.jsdelivr.net",    // QRious library CDN
                "https://cdnjs.cloudflare.com" // Font Awesome JS (if you ever use it directly)
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'", // Required for inline styles
                "https://fonts.googleapis.com", // Google Fonts CSS
                "https://cdnjs.cloudflare.com"  // Font Awesome CSS
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",    // Google Fonts actual font files
                "https://cdnjs.cloudflare.com", // Font Awesome webfonts (woff2, ttf etc.)
                "data:"                         // Allow data URIs (e.g., for some inline SVG/base64 icons)
            ],
            imgSrc: [
                "'self'",
                "data:",                        // Allow data URIs for images
                "https://res.cloudinary.com",   // Cloudinary images (for logos, banners, products)
                "https://placehold.co"          // Placeholder images
            ],
            connectSrc: [
                "'self'",
                "https://generativelanguage.googleapis.com", // Gemini API calls
                "https://menu-qr-61oz.onrender.com", // Explicitly allow connections to your own backend domain
                "http://localhost:5000" // NEW: Allow frontend to connect to local backend
            ],
            objectSrc: ["'none'"], // Disallow <object>, <embed>, <applet>
            mediaSrc: ["'self'"], // Allow media from same origin
            frameSrc: ["'self'"], // Allow iframes from same origin
            workerSrc: ["'self'"], // Allow web workers from same origin
            // upgradeInsecureRequests: [], // Automatically convert HTTP to HTTPS - keep this if you want
        },
    },
    // You can disable specific headers if they cause issues, e.g.:
    // crossOriginEmbedderPolicy: false,
    // crossOriginOpenerPolicy: false,
    // crossOriginResourcePolicy: false,
}));


app.use(express.json()); // Body parser for raw JSON
app.use(express.urlencoded({ extended: false })); // Body parser for URL-encoded data

// API Routes - These should be placed before static file serving
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

// --- Serve Frontend Static Files ---
// This middleware will serve all your HTML, CSS, JS, and other static assets
// It should come AFTER your API routes to ensure API calls are not intercepted by static files
app.use(express.static(path.join(__dirname, '../frontend')));


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
