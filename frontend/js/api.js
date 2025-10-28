// qr-digital-menu-system/frontend/js/api.js

// Security: Use environment-based API URL
const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000/api';
    } else {
        return 'https://menuqrcode.onrender.com/api';
    }
})();

// Security: Request timeout (8 seconds for better UX)
const REQUEST_TIMEOUT = 8000;

// Security: Cache for rate limiting awareness
const requestCache = new Map();

/**
 * Enhanced response handler to handle different API response formats
 */
function handleApiResponse(data, endpoint) {
    // For public endpoints like /website, return data directly
    if (endpoint.includes('/website')) {
        return data;
    }
    
    // For admin/superadmin endpoints, extract arrays from response objects
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Handle paginated responses
        if (endpoint.includes('/categories')) {
            return data.categories || data;
        }
        if (endpoint.includes('/products')) {
            return data.products || data;
        }
        if (endpoint.includes('/users')) {
            return data.admins || data;
        }
        if (endpoint.includes('/stores')) {
            return data.stores || data;
        }
        
        // If it's a pagination response with data array
        if (data.data && Array.isArray(data.data)) {
            return data.data;
        }
        
        // Check for any array property in the response
        for (const key in data) {
            if (Array.isArray(data[key]) && key !== 'pagination') {
                return data[key];
            }
        }
    }
    
    return data;
}

/**
 * Secure API request function with enhanced security features
 */
async function apiRequest(endpoint, method = 'GET', body = null, requiresAuth = true, isFormData = false, queryParams = null) {
    // DEBUG: Log the request
    console.log('🔍 API Request:', method, endpoint, 'Auth:', requiresAuth);

    // TEMPORARILY DISABLE ENDPOINT VALIDATION TO IDENTIFY THE REAL ISSUE
    // if (!isValidEndpoint(endpoint)) {
    //     console.error('❌ Endpoint validation failed:', endpoint);
    //     throw new Error('Invalid API endpoint');
    // }

    // Check for rate limiting
    if (isRateLimited(endpoint)) {
        throw new Error('Too many requests. Please wait and try again.');
    }

    const headers = new Headers();
    const config = { 
        method,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        credentials: 'include'
    };

    // Add security headers
    headers.append('X-Content-Type-Options', 'nosniff');
    headers.append('X-Frame-Options', 'DENY');
    headers.append('X-XSS-Protection', '1; mode=block');

// Enhanced token selection based on endpoint
if (requiresAuth) {
    let token = null;
    
    // Determine which user's token to use based on the endpoint
    if (endpoint.includes('/superadmin')) {
        // For superadmin endpoints, try to get superadmin token
        token = window.getStoredToken ? window.getStoredToken('superadmin') : null;
    } else if (endpoint.includes('/users') && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
        // For user management, use superadmin token
        token = window.getStoredToken ? window.getStoredToken('superadmin') : null;
    } else {
        // For other endpoints, use any available token
        token = window.getStoredToken ? window.getStoredToken() : localStorage.getItem('token');
    }
    
    if (!token) {
        console.error('❌ No valid token found for endpoint:', endpoint);
        if (window.redirectToLogin) {
            window.redirectToLogin();
        } else {
            window.location.href = '/login';
        }
        throw new Error('Authentication required');
    }
    
    headers.append('Authorization', `Bearer ${token}`);
}

    if (body) {
        if (isFormData) {
            config.body = body;
        } else {
            headers.append('Content-Type', 'application/json');
            const sanitizedBody = sanitizeRequestBody(body);
            config.body = JSON.stringify(sanitizedBody);
        }
    }

    config.headers = headers;

    let url = `${API_BASE_URL}${endpoint}`;
    if (queryParams) {
        const sanitizedParams = sanitizeQueryParams(queryParams);
        const params = new URLSearchParams(sanitizedParams);
        url += `?${params.toString()}`;
    }

    try {
        console.log('🔄 Making fetch request to:', url);
        trackRequest(endpoint);

        const response = await fetch(url, config);
        console.log('📨 Response status:', response.status, 'for:', endpoint);
        
        checkSecurityHeaders(response);

        const contentType = response.headers.get('content-type');
        let data = null;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('📊 Response data for', endpoint, ':', data);
            
            // Handle different response formats
            data = handleApiResponse(data, endpoint);
        } else if (response.status === 204) {
            // No content response
            return null;
        } else {
            console.error('❌ Invalid content type:', contentType);
            throw new Error('Invalid response format from server');
        }

        if (!response.ok) {
            console.error('❌ Response not OK:', response.status);
            handleErrorResponse(response, data, endpoint);
        }

        console.log('✅ API request successful for:', endpoint);
        return data;
    } catch (error) {
        console.error('❌ API request failed for:', endpoint, 'Error:', error);
        handleFetchError(error, endpoint);
    }
}

/**
 * Enhanced API methods with built-in security and better response handling
 */
const secureApi = {
    get: (endpoint, requiresAuth = true, queryParams = null) => 
        apiRequest(endpoint, 'GET', null, requiresAuth, false, queryParams),
    
    post: (endpoint, body, requiresAuth = true, isFormData = false) => 
        apiRequest(endpoint, 'POST', body, requiresAuth, isFormData),
    
    put: (endpoint, body, requiresAuth = true, isFormData = false) => 
        apiRequest(endpoint, 'PUT', body, requiresAuth, isFormData),
    
    patch: (endpoint, body, requiresAuth = true, isFormData = false) => 
        apiRequest(endpoint, 'PATCH', body, requiresAuth, isFormData),
    
    delete: (endpoint, requiresAuth = true, body = null) => 
        apiRequest(endpoint, 'DELETE', body, requiresAuth)
};

// ==================== SECURITY UTILITY FUNCTIONS ====================

function isValidEndpoint(endpoint) {
    // Allow all public store endpoints
    const publicEndpoints = [
        '/auth/login',
        '/auth/register',
        '/products/website',
        '/categories/website',
        '/stores/public/slug/',
        '/products/public-store/slug/',
        '/categories/store/slug/',
        '/categories/store/',
        '/stores/public/'
    ];
    
    // Check if it's a public endpoint
    if (publicEndpoints.some(publicEndpoint => endpoint.startsWith(publicEndpoint))) {
        return true;
    }
    
    // Validate protected endpoints pattern - COMPREHENSIVE LIST
    const validPatterns = [
        // Auth routes
        /^\/auth\/[a-zA-Z0-9-_]+$/,
        
        // User routes
        /^\/users\/?([a-zA-Z0-9-]*)?$/,
        /^\/users\/register-admin$/,
        /^\/users\/[a-f0-9]{24}$/,
        
        // Store routes
        /^\/stores\/?([a-zA-Z0-9-]*)?$/,
        /^\/stores\/[a-f0-9]{24}$/,
        /^\/stores\/my-store$/,
        /^\/stores\/public\/slug\/[a-zA-Z0-9-_.]+$/,
        /^\/stores\/public\/[a-f0-9]{24}$/,
        
        // Category routes
        /^\/categories\/?([a-zA-Z0-9-]*)?$/,
        /^\/categories\/superadmin\/?([a-f0-9]{24})?$/,
        /^\/categories\/[a-f0-9]{24}$/,
        /^\/categories\/my-store$/,
        /^\/categories\/store\/slug\/[a-zA-Z0-9-_.]+$/,
        /^\/categories\/store\/[a-f0-9]{24}$/,
        /^\/categories\/website$/,
        
        // Product routes
        /^\/products\/?([a-zA-Z0-9-]*)?$/,
        /^\/products\/superadmin\/?([a-f0-9]{24})?$/,
        /^\/products\/[a-f0-9]{24}$/,
        /^\/products\/my-store$/,
        /^\/products\/public-store\/slug\/[a-zA-Z0-9-_.]+$/,
        /^\/products\/website$/
    ];
    
    const isValid = validPatterns.some(pattern => pattern.test(endpoint)) &&
           !endpoint.includes('..') &&
           !endpoint.includes('//') &&
           endpoint.length < 200;
    
    console.log('🔍 Endpoint validation:', endpoint, '->', isValid ? 'VALID' : 'INVALID');
    return isValid;
}

function sanitizeRequestBody(body) {
    if (typeof body !== 'object' || body === null) return body;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
            sanitized[key] = value.trim()
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .substring(0, 1000);
        } else if (typeof value === 'number') {
            sanitized[key] = value;
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' ? item.substring(0, 100) : item
            );
        } else if (typeof value === 'boolean') {
            sanitized[key] = value;
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

function sanitizeQueryParams(params) {
    const sanitized = {};
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
            sanitized[key] = value.substring(0, 100);
        } else if (typeof value === 'number') {
            sanitized[key] = value;
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(item => 
                typeof item === 'string' ? item.substring(0, 50) : item
            );
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

function trackRequest(endpoint) {
    const now = Date.now();
    const key = `${endpoint}_${Math.floor(now / 60000)}`;
    
    const count = requestCache.get(key) || 0;
    if (count > 50) {
        throw new Error('Rate limit exceeded for this endpoint');
    }
    
    requestCache.set(key, count + 1);
    
    // Auto-cleanup after 2 minutes
    setTimeout(() => {
        requestCache.delete(key);
    }, 120000);
}

function isRateLimited(endpoint) {
    const now = Date.now();
    const key = `${endpoint}_${Math.floor(now / 60000)}`;
    return (requestCache.get(key) || 0) > 30;
}

function checkSecurityHeaders(response) {
    const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options'
    ];
    
    for (const header of requiredHeaders) {
        if (!response.headers.get(header)) {
            console.warn(`Missing security header: ${header}`);
        }
    }
}

function handleErrorResponse(response, data, endpoint) {
    let errorMessage = data?.message || response.statusText || 'Request failed';
    const status = response.status;

    console.error(`API Error [${status}] on ${endpoint}:`, errorMessage);

    // Handle different error formats
    if (data?.error) {
        errorMessage = data.error;
    }

    switch (status) {
        case 400:
            if (errorMessage.includes('password') || errorMessage.includes('email') || errorMessage.includes('name')) {
                throw new Error(errorMessage);
            }
            throw new Error(errorMessage || 'Bad request');
            
        case 401:
            console.warn('Authentication failed, redirecting to login');
            if (window.redirectToLogin) {
                window.redirectToLogin();
            } else {
                window.location.href = '/login';
            }
            throw new Error('Authentication required');
            
        case 403:
            console.warn('Access forbidden');
            if (window.getStoredToken && window.getStoredToken()) {
                if (window.redirectToLogin) {
                    window.redirectToLogin();
                } else {
                    window.location.href = '/login';
                }
            }
            throw new Error('Access denied');
            
        case 404:
            throw new Error(errorMessage || 'Resource not found');
            
        case 409:
            throw new Error(errorMessage || 'Conflict - resource already exists');
            
        case 413:
            throw new Error('File too large. Please choose a smaller file.');
            
        case 422:
            throw new Error(errorMessage || 'Validation failed');
            
        case 429:
            throw new Error('Too many requests. Please wait and try again.');
            
        case 500:
            throw new Error('Server error. Please try again later.');
            
        case 502:
        case 503:
        case 504:
            throw new Error('Service temporarily unavailable. Please try again later.');
            
        default:
            throw new Error(errorMessage || `Request failed with status ${status}`);
    }
}

function handleFetchError(error, endpoint) {
    if (error.name === 'AbortError') {
        console.error(`Request timeout for ${endpoint}`);
        throw new Error('Request timeout. Please try again.');
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        console.error(`Network error for ${endpoint}`);
        throw new Error('Network error. Please check your connection.');
    }

    // If it's already our custom error, re-throw it
    if (error.message && error.message !== 'Failed to fetch') {
        throw error;
    }

    console.error(`Unexpected error for ${endpoint}:`, error);
    throw new Error('An unexpected error occurred. Please try again.');
}

// ==================== SPECIALIZED API FUNCTIONS ====================

/**
 * Specialized function for public product fetching (used by index.js)
 */
async function fetchPublicProducts() {
    return apiRequest('/products/website', 'GET', null, false);
}

/**
 * Specialized function for superadmin data fetching
 */
const superadminApi = {
    getAdmins: () => secureApi.get('/users'),
    createAdmin: (adminData) => secureApi.post('/users/register-admin', adminData),
    updateAdmin: (id, adminData) => secureApi.put(`/users/${id}`, adminData),
    deleteAdmin: (id, password) => secureApi.delete(`/users/${id}`, true, { password }),
    
    getCategories: () => secureApi.get('/categories/superadmin'),
    createCategory: (categoryData) => secureApi.post('/categories/superadmin', categoryData),
    updateCategory: (id, categoryData) => secureApi.put(`/categories/superadmin/${id}`, categoryData),
    deleteCategory: (id) => secureApi.delete(`/categories/superadmin/${id}`),
    
    getProducts: () => secureApi.get('/products/superadmin'),
    createProduct: (productData, isFormData = false) => secureApi.post('/products/superadmin', productData, true, isFormData),
    updateProduct: (id, productData, isFormData = false) => secureApi.put(`/products/superadmin/${id}`, productData, true, isFormData),
    deleteProduct: (id) => secureApi.delete(`/products/superadmin/${id}`),
    getProduct: (id) => secureApi.get(`/products/superadmin/${id}`)
};

/**
 * Specialized function for admin store operations
 */
const adminApi = {
    getStoreProducts: () => secureApi.get('/products/my-store'),
    createStoreProduct: (productData, isFormData = false) => secureApi.post('/products', productData, true, isFormData),
    updateStoreProduct: (id, productData, isFormData = false) => secureApi.put(`/products/${id}`, productData, true, isFormData),
    deleteStoreProduct: (id) => secureApi.delete(`/products/${id}`),
    
    getStoreCategories: () => secureApi.get('/categories/my-store'),
    createStoreCategory: (categoryData) => secureApi.post('/categories', categoryData),
    updateStoreCategory: (id, categoryData) => secureApi.put(`/categories/${id}`, categoryData),
    deleteStoreCategory: (id) => secureApi.delete(`/categories/${id}`)
};

// ==================== GLOBAL EXPORTS ====================

// Make available globally
window.apiRequest = apiRequest;
window.secureApi = secureApi;
window.fetchPublicProducts = fetchPublicProducts;
window.superadminApi = superadminApi;
window.adminApi = adminApi;

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
    // Clear sensitive data if needed
    if (window.logout) {
        // Preserve token for page reloads, but clear on actual unload if needed
    }
});

// Periodic cleanup of request cache
setInterval(() => {
    const now = Date.now();
    const twoMinutesAgo = now - 120000;
    
    for (const [key] of requestCache) {
        const keyTime = parseInt(key.split('_')[1]);
        if (keyTime < twoMinutesAgo) {
            requestCache.delete(key);
        }
    }
}, 30000); // Clean every 30 seconds

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('API module initialized');
});