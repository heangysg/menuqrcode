// qr-digital-menu-system/backend/config/cloudinary.js

const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');

// Enhanced Cloudinary configuration with security features
const connectCloudinary = () => {
    try {
        // Validate required environment variables
        const requiredEnvVars = [
            'CLOUDINARY_CLOUD_NAME',
            'CLOUDINARY_API_KEY', 
            'CLOUDINARY_API_SECRET'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required Cloudinary environment variables: ${missingVars.join(', ')}`);
        }

        // Validate environment variable formats
        if (!/^[a-z0-9-]+$/.test(process.env.CLOUDINARY_CLOUD_NAME)) {
            throw new Error('Invalid Cloudinary cloud name format');
        }

        if (!/^\d+$/.test(process.env.CLOUDINARY_API_KEY)) {
            throw new Error('Invalid Cloudinary API key format');
        }

        if (process.env.CLOUDINARY_API_SECRET.length < 20) {
            throw new Error('Cloudinary API secret appears to be invalid');
        }

        // Configure Cloudinary with enhanced security settings
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true, // Force HTTPS
            secure_distribution: null, // Use default secure distribution
            private_cdn: false, // Don't use private CDN unless configured
            secure_cdn_subdomain: false, // Disable secure CDN subdomain
            cname: null, // No custom CNAME unless specified
            shorten: false, // Don't shorten URLs
            use_filename: false, // Don't use original filenames
            unique_filename: true, // Generate unique filenames
            overwrite: false, // Don't overwrite existing files
            resource_type: 'auto', // Auto-detect resource type
            type: 'upload', // Default to upload type
            timeout: 60000, // 60 second timeout
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || null // Use upload preset if available
        });

        // Test Cloudinary connection with a secure method
        testCloudinaryConnection();

        console.log('✅ Cloudinary Connected Successfully');
        
    } catch (error) {
        console.error('❌ Cloudinary Connection Failed:', error.message);
        
        // Don't throw error in production to prevent app crash
        if (process.env.NODE_ENV === 'production') {
            console.warn('⚠️  Continuing without Cloudinary connection in production');
        } else {
            throw error; // Throw in development for immediate feedback
        }
    }
};

// Test Cloudinary connection securely
const testCloudinaryConnection = async () => {
    try {
        // Use a simple API call that doesn't expose sensitive information
        const result = await cloudinary.api.ping();
        
        if (result.status !== 'ok') {
            throw new Error('Cloudinary ping test failed');
        }
        
        console.log('🔒 Cloudinary Security Test Passed');
    } catch (error) {
        console.error('❌ Cloudinary Security Test Failed:', error.message);
        throw new Error('Cloudinary authentication failed - check your API credentials');
    }
};

// Enhanced secure upload function with validation
const secureUpload = async (file, options = {}) => {
    try {
        // Validate input
        if (!file || !file.buffer || !file.mimetype) {
            throw new Error('Invalid file provided for upload');
        }

        // Basic file validation
        if (file.buffer.length === 0) {
            throw new Error('Empty file provided');
        }

        if (file.buffer.length > (options.maxFileSize || 10 * 1024 * 1024)) { // 10MB default
            throw new Error(`File size too large: ${(file.buffer.length / 1024 / 1024).toFixed(2)}MB`);
        }

        // MIME type validation
        const allowedMimeTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'image/svg+xml', 'image/bmp', 'image/tiff'
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`Unsupported file type: ${file.mimetype}`);
        }

        // Enhanced upload options with security settings
        const uploadOptions = {
            resource_type: 'image',
            quality: 'auto:good',
            format: 'webp', // Convert to WebP for better compression and security
            fetch_format: 'auto',
            transformation: [
                { width: 1200, crop: 'limit' }, // Limit maximum width
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ],
            // Security settings
            invalidate: true, // Invalidate CDN cache
            type: 'upload',
            access_mode: 'public', // or 'authenticated' for private files
            ...options // Allow custom options to override
        };

        // Generate secure public_id to prevent filename guessing
        const securePublicId = generateSecurePublicId(file.originalname);

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
                ...uploadOptions,
                public_id: securePublicId
            }
        );

        // Validate upload result
        if (!uploadResult.secure_url) {
            throw new Error('Cloudinary upload failed - no secure URL returned');
        }

        // Security: Log successful upload (without sensitive data)
        console.log(`✅ File uploaded securely: ${uploadResult.public_id} (${uploadResult.bytes} bytes)`);

        return {
            success: true,
            url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            format: uploadResult.format,
            bytes: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height,
            created_at: uploadResult.created_at
        };

    } catch (error) {
        console.error('❌ Secure upload failed:', error.message);
        
        // Don't expose Cloudinary-specific errors to clients
        const safeError = error.message.includes('Cloudinary') 
            ? 'File upload service temporarily unavailable'
            : error.message;

        throw new Error(safeError);
    }
};

// Secure delete function
const secureDelete = async (publicId) => {
    try {
        // Validate public_id
        if (!publicId || typeof publicId !== 'string' || publicId.length > 255) {
            throw new Error('Invalid public ID provided for deletion');
        }

        // Prevent deletion of important folders
        const protectedFolders = ['ysgstore/superadmin-products/', 'ysgstore/store-products/', 'ysgstore/logos/', 'ysgstore/banners/'];
        if (protectedFolders.some(folder => publicId.startsWith(folder))) {
            throw new Error('Cannot delete files from protected folders');
        }

        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            invalidate: true
        });

        if (result.result !== 'ok') {
            throw new Error(`Deletion failed: ${result.result}`);
        }

        console.log(`✅ File deleted securely: ${publicId}`);
        
        return {
            success: true,
            message: 'File deleted successfully',
            public_id: publicId
        };

    } catch (error) {
        console.error('❌ Secure delete failed:', error.message);
        throw new Error('File deletion failed');
    }
};

// Generate secure public_id to prevent filename guessing attacks
const generateSecurePublicId = (originalFilename) => {
    try {
        // Extract extension safely
        const extension = originalFilename ? 
            originalFilename.split('.').pop().toLowerCase().substring(0, 10) : 
            'file';

        // Generate random component
        const randomBytes = crypto.randomBytes(16).toString('hex');
        
        // Add timestamp
        const timestamp = Date.now();
        
        // Create secure public_id
        const secureId = `img_${timestamp}_${randomBytes}.${extension}`;
        
        return secureId.substring(0, 255); // Cloudinary limit
    } catch (error) {
        // Fallback to UUID if anything fails
        return `img_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }
};

// Security: Validate Cloudinary URL to prevent malicious URLs
const validateCloudinaryUrl = (url) => {
    try {
        if (!url || typeof url !== 'string') {
            return false;
        }

        // Basic URL validation
        const urlPattern = /^https:\/\/res\.cloudinary\.com\/[a-z0-9-]+\/image\/upload\/.+/;
        if (!urlPattern.test(url)) {
            return false;
        }

        // Check for suspicious patterns
        const suspiciousPatterns = [
            /\.\.\//, // Path traversal
            /\/\.\//, // Hidden directories
            /\/\/\//, // Multiple slashes
            /javascript:/i, // JavaScript protocol
            /data:/i, // Data protocol
            /vbscript:/i // VBScript protocol
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(url))) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
};

// Security: Extract public_id safely from Cloudinary URL
const extractPublicId = (url) => {
    try {
        if (!validateCloudinaryUrl(url)) {
            throw new Error('Invalid Cloudinary URL');
        }

        const urlParts = url.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        
        if (uploadIndex === -1 || uploadIndex >= urlParts.length - 1) {
            throw new Error('Invalid Cloudinary URL format');
        }

        // Get the part after 'upload'
        const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
        
        // Remove file extension
        const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");
        
        return publicId;
    } catch (error) {
        console.error('Error extracting public_id:', error.message);
        return null;
    }
};

// Security: Get Cloudinary account usage (for monitoring)
const getAccountUsage = async () => {
    try {
        const usage = await cloudinary.api.usage();
        
        return {
            plan: usage.plan,
            usage: {
                credits: usage.credits?.usage || 0,
                bandwidth: usage.bandwidth?.usage || 0,
                storage: usage.storage?.usage || 0,
                transformations: usage.transformations?.usage || 0
            },
            limits: usage.credits?.limit || 0
        };
    } catch (error) {
        console.error('Error fetching Cloudinary usage:', error.message);
        return null;
    }
};

module.exports = {
    connectCloudinary,
    secureUpload,
    secureDelete,
    validateCloudinaryUrl,
    extractPublicId,
    getAccountUsage,
    cloudinary // Export cloudinary instance for advanced operations
};