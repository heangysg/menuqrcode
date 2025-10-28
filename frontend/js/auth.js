// qr-digital-menu-system/frontend/js/auth.js

    function getStoredToken(requiredRole = null) {
    try {
        // Get ALL stored user IDs
        const allUserIds = JSON.parse(localStorage.getItem('all_user_ids') || '[]');
        console.log('🔍 All stored user IDs:', allUserIds);
        
        if (allUserIds.length === 0) {
            console.log('❌ No users found in storage');
            return null;
        }
        
        // 🚨 CRITICAL FIX: ALWAYS use last_active_user_id, NEVER fall back
        const lastActiveUserId = localStorage.getItem('last_active_user_id');
        console.log('🔍 Last active user ID:', lastActiveUserId);
        
        // If no active user ID, we CANNOT guess - return null
        if (!lastActiveUserId) {
            console.log('❌ No active user ID found - requiring fresh login');
            return null;
        }
        
        // 🚨 DOUBLE CHECK: Verify the active user exists in our stored users
        if (!allUserIds.includes(lastActiveUserId)) {
            console.log('❌ Active user ID not found in stored users:', lastActiveUserId);
            return null;
        }
        
        // If no specific role required, return ONLY the last active user's token
        if (!requiredRole) {
            const token = localStorage.getItem(`auth_token_${lastActiveUserId}`);
            console.log('🔍 Using active user token:', !!token, 'for user:', lastActiveUserId);
            return token;
        }
        
        // If role is specified, check if active user has the required role
        console.log(`🔍 Checking if active user has required role: ${requiredRole}`);
        
        const activeUserDataStr = localStorage.getItem(`user_data_${lastActiveUserId}`);
        if (activeUserDataStr) {
            const activeUserData = JSON.parse(activeUserDataStr);
            if (activeUserData.role === requiredRole) {
                const token = localStorage.getItem(`auth_token_${lastActiveUserId}`);
                console.log(`✅ Active user matches required role:`, activeUserData.email);
                return token;
            } else {
                console.log(`❌ Active user role mismatch: ${activeUserData.role} vs ${requiredRole}`);
            }
        }
        
        console.log(`❌ No ${requiredRole} user token found for active user`);
        return null;
        
    } catch (error) {
        console.error('Error retrieving token:', error);
        return null;
    }
}

function setStoredToken(token, userData) {
    try {
        if (!userData || !userData._id) {
            console.error('User data required for token storage');
            return;
        }
        
        const userId = userData._id;
        console.log('💾 Storing token for user:', userData.email, 'ID:', userId);
        
        // 🚨 CRITICAL FIX: CLEAR ALL OTHER USERS FIRST - Single session only!
        const allUserIds = JSON.parse(localStorage.getItem('all_user_ids') || '[]');
        
        // Remove all existing users
        allUserIds.forEach(existingUserId => {
            localStorage.removeItem(`auth_token_${existingUserId}`);
            localStorage.removeItem(`user_data_${existingUserId}`);
            console.log('🗑️ Removed previous user:', existingUserId);
        });
        
        // Start fresh with ONLY this user
        const newUserIds = [userId];
        localStorage.setItem('all_user_ids', JSON.stringify(newUserIds));
        localStorage.setItem('last_active_user_id', userId);
        
        // Store token with user-specific key
        localStorage.setItem(`auth_token_${userId}`, token);
        
        // Store user data separately
        localStorage.setItem(`user_data_${userId}`, JSON.stringify({
            _id: userData._id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            store: userData.store
        }));
        
        console.log('✅ Token stored successfully for SINGLE user:', userData.email);
        console.log('👥 Now only one user in storage:', newUserIds);
    } catch (error) {
        console.error('Error storing token:', error);
    }
}

function getStoredUserData() {
    try {
        // 🚨 CRITICAL FIX: Use ONLY last_active_user_id, NEVER fall back
        const lastActiveUserId = localStorage.getItem('last_active_user_id');
        console.log('🔍 Getting user data for active ID:', lastActiveUserId);
        
        // If no active user ID, return null - don't guess!
        if (!lastActiveUserId) {
            console.log('❌ No active user ID found');
            return null;
        }
        
        // 🚨 DOUBLE CHECK: Verify this user exists in our stored users
        const allUserIds = JSON.parse(localStorage.getItem('all_user_ids') || '[]');
        if (!allUserIds.includes(lastActiveUserId)) {
            console.log('❌ Active user ID not found in stored users:', lastActiveUserId);
            return null;
        }
        
        const userDataStr = localStorage.getItem(`user_data_${lastActiveUserId}`);
        const userData = userDataStr ? JSON.parse(userDataStr) : null;
        console.log('🔍 User data found:', !!userData, userData ? userData.email : 'none');
        return userData;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

function getStoredUserRole() {
    const userData = getStoredUserData();
    const role = userData ? userData.role : null;
    console.log('🔍 Stored user role:', role);
    return role;
}

    function clearStoredAuth() {
    try {
        const activeUserId = localStorage.getItem('last_active_user_id');
        console.log('🧹 Clearing auth for active user ID:', activeUserId);
        
        if (activeUserId) {
            // Only clear the active user's data
            localStorage.removeItem(`auth_token_${activeUserId}`);
            localStorage.removeItem(`user_data_${activeUserId}`);
            
            // Remove from all users list
            const allUserIds = JSON.parse(localStorage.getItem('all_user_ids') || '[]');
            const updatedUserIds = allUserIds.filter(id => id !== activeUserId);
            localStorage.setItem('all_user_ids', JSON.stringify(updatedUserIds));
            
            // Clear the active user ID - don't auto-select another user!
            localStorage.removeItem('last_active_user_id');
        }
        
        console.log('✅ Auth storage cleared for active user');
    } catch (error) {
        console.error('Error clearing auth storage:', error);
    }
}

function clearAllUserData() {
    try {
        console.log('🧹 Clearing ALL user data...');
        
        // Get all user IDs
        const allUserIds = JSON.parse(localStorage.getItem('all_user_ids') || '[]');
        
        // Clear all user-specific data
        allUserIds.forEach(userId => {
            localStorage.removeItem(`auth_token_${userId}`);
            localStorage.removeItem(`user_data_${userId}`);
            console.log('🗑️ Removed data for user:', userId);
        });
        
        // Clear management data
        localStorage.removeItem('all_user_ids');
        localStorage.removeItem('last_active_user_id');
        
        // Clear any old format tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_data');
        
        console.log('✅ All user data cleared');
    } catch (error) {
        console.error('Error clearing all user data:', error);
    }
}

function switchActiveUser(userId) {
    try {
        console.log('🔄 Switching to user:', userId);
        localStorage.setItem('last_active_user_id', userId);
        console.log('✅ Active user switched');
    } catch (error) {
        console.error('Error switching user:', error);
    }
}

function getAllStoredUsers() {
    try {
        const allUserIds = JSON.parse(localStorage.getItem('all_user_ids') || '[]');
        const users = [];
        
        allUserIds.forEach(userId => {
            const userDataStr = localStorage.getItem(`user_data_${userId}`);
            if (userDataStr) {
                users.push(JSON.parse(userDataStr));
            }
        });
        
        return users;
    } catch (error) {
        console.error('Error getting all users:', error);
        return [];
    }
}

function redirectToLogin() {
    console.log('🔄 Redirecting to login page');
    clearStoredAuth();
    window.location.href = '/login';
}

// Enhanced auth check with better error handling
async function checkAuthAndRedirect(requiredRole = null) {
    console.log('🛡️ Starting auth check...');
    
    const token = getStoredToken();
    const userData = getStoredUserData();

    console.log('🔐 Auth Check Details:', { 
        hasToken: !!token, 
        hasUserData: !!userData,
        userEmail: userData ? userData.email : 'none',
        userRole: userData ? userData.role : 'none',
        requiredRole: requiredRole 
    });

    // No token or user data - immediate redirect
    if (!token || !userData) {
        console.log('❌ No valid token or user data, redirecting to login');
        redirectToLogin();
        return false;
    }

    // Check if token is still valid with server
    try {
        console.log('🔍 Validating token with server...');
        const validation = await apiRequest('/auth/validate', 'GET', null, true);
        
        if (!validation.valid) {
            console.log('❌ Server token validation failed');
            redirectToLogin();
            return false;
        }

        console.log('✅ Server token validation passed');

        // IMPORTANT FIX: Check if the current user has the required role for this page
        if (requiredRole && userData.role !== requiredRole) {
            console.warn(`🚫 Access denied: User is ${userData.role}, but ${requiredRole} is required.`);
            
            // Don't redirect to login immediately - show a message and redirect to appropriate dashboard
            if (userData.role === 'superadmin' && requiredRole === 'admin') {
                // ALLOW superadmin to access admin pages
                console.log('✅ Superadmin allowed to access admin page');
                return true;
            } else if (userData.role === 'admin' && requiredRole === 'superadmin') {
                // Admin trying to access superadmin page - redirect to admin dashboard
                alert('Admin cannot access superadmin dashboard. Redirecting to admin dashboard.');
                window.location.href = '/admin';
                return false;
            } else {
                // Other role mismatch - go to login
                alert(`Access denied. You need ${requiredRole} privileges to access this page.`);
                redirectToLogin();
                return false;
            }
        }

        console.log('✅ All auth checks passed for user:', userData.email);
        return true;

    } catch (error) {
        console.error('❌ Token validation error:', error);
        
        // If it's a 403 error (access denied), handle it properly
        if (error.message.includes('403') || error.message.includes('Access denied')) {
            const userData = getStoredUserData();
            if (userData) {
                console.warn(`🚫 Access denied for ${userData.role} user, redirecting to appropriate dashboard`);
                
                if (userData.role === 'superadmin') {
                    window.location.href = '/superadmin';
                    return false;
                } else if (userData.role === 'admin') {
                    window.location.href = '/admin';
                    return false;
                }
            }
        }
        
        // If it's a 401 error, try to refresh the token
        if (error.message.includes('401') || error.message.includes('Authentication')) {
            try {
                console.log('🔄 Attempting token refresh...');
                const refresh = await apiRequest('/auth/refresh', 'POST', {}, true);
                if (refresh.token) {
                    // Get current user data to store with refreshed token
                    const currentUserData = getStoredUserData();
                    setStoredToken(refresh.token, currentUserData);
                    console.log('✅ Token refreshed successfully');
                    return true;
                }
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
            }
        }
        
        redirectToLogin();
        return false;
    }
}

// Login handler
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginMessage = document.getElementById('loginMessage');

    console.log('🔧 Auth module initialized');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim().toLowerCase();
            const password = document.getElementById('password').value;

            showLoginMessage('', 'info'); // Clear message

            // Basic validation
            if (!email || !password) {
                showLoginMessage('Please enter both email and password', 'error');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showLoginMessage('Please enter a valid email address', 'error');
                return;
            }

            try {
                console.log('🔐 Attempting login for:', email);
                
                const data = await apiRequest('/auth/login', 'POST', { email, password }, false);
                    console.log('🔍 LOGIN RESPONSE DATA:', JSON.stringify(data, null, 2));
        if (data.token && data._id) {
            // 🚨 CRITICAL: Set this user as the active user IMMEDIATELY
            localStorage.setItem('last_active_user_id', data._id);
            
            // Store token with user-specific data (will clear all others)
            setStoredToken(data.token, {
                _id: data._id,
                name: data.name,
                email: data.email,
                role: data.role,
                store: data.store
            });
    
    console.log('✅ Login successful, user set as active:', data.email);
    
    showLoginMessage('Login successful! Redirecting...', 'success');

    // Brief delay to show message
    setTimeout(() => {
        if (data.role === 'superadmin') {
            window.location.href = '/superadmin';
        } else if (data.role === 'admin') {
            window.location.href = '/admin';
        } else {
            showLoginMessage('Unknown user role, please contact support', 'error');
        }
    }, 1000);
}
                else {
                    throw new Error('No token or user data received from server');
                }
            } catch (error) {
                console.error('❌ Login error:', error.message);
                showLoginMessage(`Login failed: ${error.message}`, 'error');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                console.log('🚪 Logging out...');
                await apiRequest('/auth/logout', 'POST', {}, true);
            } catch (error) {
                console.warn('Logout API call failed:', error.message);
            } finally {
                clearStoredAuth();
                window.location.href = '/login';
            }
        });
    }

    // Auto-check auth on page load for protected pages
    const currentPath = window.location.pathname;
    console.log('📍 Current path:', currentPath);
    
    if (currentPath.includes('/admin') || currentPath.includes('/superadmin')) {
        console.log('🛡️ Protected page detected, checking auth on load...');
        
        // Get current auth state for debugging
        const token = getStoredToken();
        const userData = getStoredUserData();
        
        console.log('📊 Page load auth state:', {
            path: currentPath,
            hasToken: !!token,
            hasUserData: !!userData,
            userRole: userData ? userData.role : 'none'
        });
        
        // Set a timeout to check auth after a short delay to ensure all scripts are loaded
        setTimeout(() => {
            const requiredRole = currentPath.includes('/superadmin') ? 'superadmin' : 'admin';
            console.log(`🔒 Page requires role: ${requiredRole}`);
            checkAuthAndRedirect(requiredRole);
        }, 100);
    }

    // Helper function for login messages
    // Helper function for login messages
function showLoginMessage(message, type = 'info') {
    if (!loginMessage) return;
    
    loginMessage.textContent = message;
    loginMessage.className = ''; // Clear all classes
    
    if (message) {
        loginMessage.classList.remove('hidden');
        // 🎯 ADD CENTER ALIGNMENT
        loginMessage.classList.add('text-center', 'w-full');
        
        if (type === 'error') {
            loginMessage.classList.add('text-red-500', 'font-medium');
        } else if (type === 'success') {
            loginMessage.classList.add('text-green-500', 'font-medium');
        } else {
            loginMessage.classList.add('text-blue-500', 'font-medium');
        }
    } else {
        loginMessage.classList.add('hidden');
    }
}

    // Make functions globally available
    window.checkAuthAndRedirect = checkAuthAndRedirect;
    window.redirectToLogin = redirectToLogin;
    window.clearStoredAuth = clearStoredAuth;
    window.clearAllUserData = clearAllUserData;
    window.setStoredToken = setStoredToken;
    window.getStoredToken = getStoredToken;
    window.getStoredUserRole = getStoredUserRole;
    window.getStoredUserData = getStoredUserData;
    window.switchActiveUser = switchActiveUser;
    window.getAllStoredUsers = getAllStoredUsers;
});

// Debug function to check storage state
function debugAuthState() {
    console.log('🔍 DEBUG AUTH STATE:');
    console.log('all_user_ids:', JSON.parse(localStorage.getItem('all_user_ids') || '[]'));
    console.log('last_active_user_id:', localStorage.getItem('last_active_user_id'));
    
    const allUserIds = JSON.parse(localStorage.getItem('all_user_ids') || '[]');
    allUserIds.forEach(userId => {
        console.log(`User ${userId}:`);
        console.log(`  auth_token:`, localStorage.getItem(`auth_token_${userId}`) ? 'EXISTS' : 'MISSING');
        console.log(`  user_data:`, localStorage.getItem(`user_data_${userId}`) ? 'EXISTS' : 'MISSING');
        
        const userData = localStorage.getItem(`user_data_${userId}`);
        if (userData) {
            console.log('  User info:', JSON.parse(userData));
        }
    });
}

// Make it available globally
window.debugAuthState = debugAuthState;