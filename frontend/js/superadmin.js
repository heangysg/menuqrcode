// qr-digital-menu-system/frontend/js/superadmin.js

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure the user is authenticated and is a superadmin
    if (!window.checkAuthAndRedirect('superadmin')) {
        return; // Redirect handled by auth.js
    }

    const createAdminForm = document.getElementById('createAdminForm');
    const createAdminMessage = document.getElementById('createAdminMessage');
    const adminListTableBody = document.getElementById('adminList');

    const editAdminModal = document.getElementById('editAdminModal');
    const editAdminForm = document.getElementById('editAdminForm');
    const editAdminId = document.getElementById('editAdminId');
    const editAdminName = document.getElementById('editAdminName');
    const editAdminEmail = document.getElementById('editAdminEmail');
    const editAdminPassword = document.getElementById('editAdminPassword');
    const editAdminMessage = document.getElementById('editAdminMessage');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    // Password confirmation modal elements
    const passwordConfirmModal = document.getElementById('passwordConfirmModal');
    const passwordInput = document.getElementById('confirmPasswordInput');
    const confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const passwordConfirmMessage = document.getElementById('passwordConfirmMessage');
    const passwordConfirmText = document.getElementById('passwordConfirmText');
    let adminToDeleteId = null;

    // Function to display messages
    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.classList.remove('hidden', 'text-red-500', 'text-green-500');
        element.classList.add(isError ? 'text-red-500' : 'text-green-500');
        if (!isError) {
            // Auto-hide success messages after 3 seconds
            setTimeout(() => {
                element.textContent = '';
                element.classList.add('hidden');
            }, 3000);
        }
    }

    // Function to fetch and display admins
    async function fetchAdmins() {
        adminListTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Loading admins...</td></tr>';
        try {
            const admins = await apiRequest('/users', 'GET');
            adminListTableBody.innerHTML = '';

            if (admins.length === 0) {
                adminListTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No admins found.</td></tr>';
                return;
            }

            admins.forEach(admin => {
                const row = adminListTableBody.insertRow();
                row.innerHTML = `
                    <td class="py-2 px-4 border-b border-gray-200">${admin.name}</td>
                    <td class="py-2 px-4 border-b border-gray-200">${admin.email}</td>
                    <td class="py-2 px-4 border-b border-gray-200">
                        <button data-id="${admin._id}" data-name="${admin.name}" data-email="${admin.email}" class="edit-admin-btn bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-2 rounded mr-2 transition duration-300">Edit</button>
                        <button data-id="${admin._id}" data-name="${admin.name}" class="delete-admin-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded transition duration-300">Delete</button>
                    </td>
                `;
            });

            // Attach event listeners to new buttons
            document.querySelectorAll('.edit-admin-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const name = e.target.dataset.name;
                    const email = e.target.dataset.email;
                    openEditModal(id, name, email);
                });
            });

            document.querySelectorAll('.delete-admin-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.dataset.id;
                    const name = e.target.dataset.name;
                    openPasswordConfirmModal(id, name);
                });
            });

        } catch (error) {
            console.error('Error fetching admins:', error.message);
            adminListTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Failed to load admins: ${error.message}</td></tr>`;
        }
    }

    // Open Password Confirmation Modal
    function openPasswordConfirmModal(adminId, adminName) {
        adminToDeleteId = adminId;
        passwordInput.value = '';
        passwordConfirmMessage.textContent = '';
        passwordConfirmMessage.classList.add('hidden');
        
        // Update modal text with admin name
        if (passwordConfirmText) {
            passwordConfirmText.textContent = `Please enter your superadmin password to delete "${adminName}":`;
        }
        
        passwordConfirmModal.classList.remove('hidden');
        passwordInput.focus();
    }

    // Close Password Confirmation Modal
    function closePasswordConfirmModal() {
        passwordConfirmModal.classList.add('hidden');
        adminToDeleteId = null;
    }

    // Handle Password Confirmation
    if (confirmPasswordBtn) {
        confirmPasswordBtn.addEventListener('click', async () => {
            const password = passwordInput.value.trim();
            
            if (!password) {
                displayMessage(passwordConfirmMessage, 'Please enter your password.', true);
                return;
            }

            try {
                await deleteAdmin(adminToDeleteId, password);
                closePasswordConfirmModal();
            } catch (error) {
                displayMessage(passwordConfirmMessage, error.message, true);
            }
        });
    }

    // Cancel Password Confirmation
    if (cancelPasswordBtn) {
        cancelPasswordBtn.addEventListener('click', () => {
            closePasswordConfirmModal();
        });
    }

    // Handle Enter key in password input
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmPasswordBtn.click();
            }
        });
    }

    // Handle Create Admin Form submission
    if (createAdminForm) {
        createAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('adminName').value;
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const confirmPassword = document.getElementById('confirmAdminPassword').value;

            // Validate password length
            if (password.length < 6) {
                displayMessage(createAdminMessage, 'Password must be at least 6 characters long.', true);
                return;
            }

            if (password !== confirmPassword) {
                displayMessage(createAdminMessage, 'Passwords do not match.', true);
                return;
            }

            try {
                const result = await apiRequest('/users/register-admin', 'POST', { name, email, password });
                
                displayMessage(createAdminMessage, 'Admin created successfully!', false);
                createAdminForm.reset(); // Clear form
                
                // Refresh the admin list
                setTimeout(() => {
                    fetchAdmins();
                }, 500);
                
            } catch (error) {
                displayMessage(createAdminMessage, `Error creating admin: ${error.message}`, true);
            }
        });
    }

    // Open Edit Admin Modal
    function openEditModal(id, name, email) {
        editAdminId.value = id;
        editAdminName.value = name;
        editAdminEmail.value = email;
        editAdminPassword.value = ''; // Clear password field for security
        displayMessage(editAdminMessage, '', false); // Clear previous messages
        editAdminMessage.classList.add('hidden');
        editAdminModal.classList.remove('hidden');
    }

    // Close Edit Admin Modal
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            editAdminModal.classList.add('hidden');
        });
    }

    // Handle Edit Admin Form submission
    if (editAdminForm) {
        editAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editAdminId.value;
            const name = editAdminName.value;
            const email = editAdminEmail.value;
            const password = editAdminPassword.value; // Optional

            // Validate password length if provided
            if (password && password.length < 6) {
                displayMessage(editAdminMessage, 'Password must be at least 6 characters long.', true);
                return;
            }

            const updateData = { name, email };
            if (password) {
                updateData.password = password;
            }

            try {
                await apiRequest(`/users/${id}`, 'PUT', updateData);
                displayMessage(editAdminMessage, 'Admin updated successfully!', false);
                
                // Close modal and refresh after a short delay
                setTimeout(() => {
                    editAdminModal.classList.add('hidden');
                    fetchAdmins(); // Refresh list
                }, 1000);
                
            } catch (error) {
                displayMessage(editAdminMessage, `Error updating admin: ${error.message}`, true);
            }
        });
    }

    // Delete Admin with password confirmation
    async function deleteAdmin(id, password) {
        try {
            await apiRequest(`/users/${id}`, 'DELETE', { password });
            displayMessage(createAdminMessage, 'Admin deleted successfully!', false);
            fetchAdmins(); // Refresh list
        } catch (error) {
            // Check if it's a password error
            if (error.message.includes('Invalid password') || error.message.includes('401')) {
                throw new Error('Invalid superadmin password. Please try again.');
            } else {
                throw new Error(`Error deleting admin: ${error.message}`);
            }
        }
    }

    // Initial load of admins when the page loads
    fetchAdmins();

    // Add refresh button functionality if needed
    const refreshButton = document.getElementById('refreshAdminsBtn');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            fetchAdmins();
        });
    }
});