// qr-digital-menu-system/frontend/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginMessage = document.getElementById('loginMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            loginMessage.textContent = '';
            loginMessage.classList.add('hidden');
            loginMessage.classList.remove('text-red-500', 'text-green-500');

            try {
                // apiRequest is defined in api.js
                const data = await apiRequest('/auth/login', 'POST', { email, password }, false); // Login does not require auth initially

                localStorage.setItem('token', data.token);
                localStorage.setItem('userRole', data.role); // Store the user's role

                loginMessage.textContent = 'Login successful! Redirecting...';
                loginMessage.classList.remove('hidden');
                loginMessage.classList.add('text-green-500');

                // Redirect based on role
                setTimeout(() => {
                    if (data.role === 'superadmin') {
                        window.location.href = 'superadmin.html';
                    } else if (data.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        // Fallback or error if role is unexpected
                        console.error('Unknown user role:', data.role);
                        window.location.href = 'login.html';
                    }
                }, 1000);

            } catch (error) {
                console.error('Login error:', error.message);
                loginMessage.textContent = `Login failed: ${error.message}`;
                loginMessage.classList.remove('hidden');
                loginMessage.classList.add('text-red-500');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            window.location.href = 'login.html'; // Redirect to login page
        });
    }

    // Function to check authentication and redirect if necessary
    // This will be called from each protected page (superadmin.html, admin.html)
    function checkAuthAndRedirect(requiredRole = null) {
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('userRole');

        if (!token || !userRole) {
            window.location.href = 'login.html'; // No token or role, go to login
            return false;
        }

        if (requiredRole && userRole !== requiredRole) {
            console.warn(`Access denied: User is ${userRole}, but ${requiredRole} is required.`);
            localStorage.removeItem('token'); // Clear invalid token
            localStorage.removeItem('userRole');
            window.location.href = 'login.html'; // Mismatch role, go to login
            return false;
        }
        return true;
    }

    // Expose checkAuthAndRedirect to the global scope or specific pages can import/call it
    // For simplicity with direct HTML/JS, we can make it global, but for larger apps, modules are better.
    window.checkAuthAndRedirect = checkAuthAndRedirect;
});