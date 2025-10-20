// qr-digital-menu-system/frontend/js/api.js

// IMPORTANT: Change this to your deployed Render backend URL when deploying!
const API_BASE_URL = 'https://menuqrcode.onrender.com/api'; 

// const API_BASE_URL = 'http://localhost:5000/api'; 

/**
 * Helper function to make authenticated API requests.
 * @param {string} endpoint - The API endpoint (e.g., '/auth/login', '/users', '/products').
 * @param {string} method - HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE').
 * @param {object} [body=null] - Request body for POST/PUT requests.
 * @param {boolean} [requiresAuth=true] - Whether the request requires a JWT token.
 * @param {boolean} [isFormData=false] - Whether the body is FormData (for file uploads).
 * @param {object} [queryParams=null] - Optional object for query parameters (e.g., { category: 'id123' }).
 * @returns {Promise<object>} - A promise that resolves with the JSON response.
 */
// qr-digital-menu-system/frontend/js/api.js

async function apiRequest(endpoint, method = 'GET', body = null, requiresAuth = true, isFormData = false, queryParams = null) {
    const headers = {};
    const config = { method };

    if (requiresAuth) {
        const token = sessionStorage.getItem('token'); // Changed to sessionStorage
        if (!token) {
            console.error('No authentication token found. Redirecting to login.');
            window.location.href = '/login';
            throw new Error('Authentication token missing.');
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
        if (isFormData) {
            config.body = body;
        } else {
            headers['Content-Type'] = 'application/json';
            config.body = JSON.stringify(body);
        }
    }

    config.headers = headers;

    let url = `${API_BASE_URL}${endpoint}`;
    if (queryParams) {
        const params = new URLSearchParams(queryParams);
        url += `?${params.toString()}`;
    }

    try {
        const response = await fetch(url, config);
        const contentType = response.headers.get('content-type');
        let data = null;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const error = data.message || response.statusText || 'Something went wrong';
            const status = response.status;
            throw new Error(JSON.stringify({ message: error, status }));
        }

        return data;
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        let errorMessage = 'An unknown error occurred.';
        let errorStatus = 500;

        try {
            const parsedError = JSON.parse(error.message);
            errorMessage = parsedError.message || errorMessage;
            errorStatus = parsedError.status || errorStatus;
        } catch (parseError) {
            errorMessage = error.message || errorMessage;
        }

        if (errorStatus === 401) {
            const isPasswordError = errorMessage.includes('Invalid password') ||
                errorMessage.includes('Password is required') ||
                errorMessage.includes('password');

            if (isPasswordError) {
                console.warn('Password verification failed:', errorMessage);
                throw new Error(errorMessage);
            } else {
                console.warn('Unauthorized request. Redirecting to login.');
                sessionStorage.removeItem('token'); // Changed to sessionStorage
                sessionStorage.removeItem('userRole'); // Changed to sessionStorage
                window.location.href = '/login';
                throw new Error('Authentication failed. Please login again.');
            }
        }

        if (errorStatus === 400 && errorMessage.includes('password')) {
            console.warn('Password validation error:', errorMessage);
            throw new Error(errorMessage);
        }

        throw new Error(errorMessage);
    }
}