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
                const data = await apiRequest('/auth/login', 'POST', { email, password }, false);

                sessionStorage.setItem('token', data.token); // Changed to sessionStorage
                sessionStorage.setItem('userRole', data.role); // Changed to sessionStorage

                loginMessage.textContent = 'Login successful! Redirecting...';
                loginMessage.classList.remove('hidden');
                loginMessage.classList.add('text-green-500');

                setTimeout(() => {
                    if (data.role === 'superadmin') {
                        window.location.href = '/superadmin';
                    } else if (data.role === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        console.error('Unknown user role:', data.role);
                        window.location.href = '/login';
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
            sessionStorage.removeItem('token'); // Changed to sessionStorage
            sessionStorage.removeItem('userRole'); // Changed to sessionStorage
            window.location.href = '/login';
        });
    }

    function checkAuthAndRedirect(requiredRole = null) {
        const token = sessionStorage.getItem('token'); // Changed to sessionStorage
        const userRole = sessionStorage.getItem('userRole'); // Changed to sessionStorage

        if (!token || !userRole) {
            window.location.href = '/login';
            return false;
        }

        if (requiredRole && userRole !== requiredRole) {
            console.warn(`Access denied: User is ${userRole}, but ${requiredRole} is required.`);
            sessionStorage.removeItem('token'); // Changed to sessionStorage
            sessionStorage.removeItem('userRole'); // Changed to sessionStorage
            window.location.href = '/login';
            return false;
        }
        return true;
    }

    window.checkAuthAndRedirect = checkAuthAndRedirect;
});