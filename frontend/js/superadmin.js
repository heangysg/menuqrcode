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

    // Function to display messages
    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.classList.remove('hidden', 'text-red-500', 'text-green-500');
        element.classList.add(isError ? 'text-red-500' : 'text-green-500');
    }

    // Function to fetch and display admins
    async function fetchAdmins() {
        adminListTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Loading admins...</td></tr>';
        try {
            const admins = await apiRequest('/users', 'GET'); // Get all users (admins)

            adminListTableBody.innerHTML = ''; // Clear loading message

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
                        <button data-id="${admin._id}" class="delete-admin-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded transition duration-300">Delete</button>
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
                    if (confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
                        deleteAdmin(id);
                    }
                });
            });

        } catch (error) {
            console.error('Error fetching admins:', error.message);
            adminListTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Failed to load admins: ${error.message}</td></tr>`;
        }
    }

    // Handle Create Admin Form submission
    if (createAdminForm) {
        createAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('adminName').value;
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const confirmPassword = document.getElementById('confirmAdminPassword').value;

            if (password !== confirmPassword) {
                displayMessage(createAdminMessage, 'Passwords do not match.', true);
                return;
            }

            try {
                await apiRequest('/users/register-admin', 'POST', { name, email, password });
                displayMessage(createAdminMessage, 'Admin created successfully!', false);
                createAdminForm.reset(); // Clear form
                fetchAdmins(); // Refresh list
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

            const updateData = { name, email };
            if (password) {
                updateData.password = password;
            }

            try {
                await apiRequest(`/users/${id}`, 'PUT', updateData);
                displayMessage(editAdminMessage, 'Admin updated successfully!', false);
                editAdminModal.classList.add('hidden'); // Close modal
                fetchAdmins(); // Refresh list
            } catch (error) {
                displayMessage(editAdminMessage, `Error updating admin: ${error.message}`, true);
            }
        });
    }

    // Delete Admin
    async function deleteAdmin(id) {
        try {
            await apiRequest(`/users/${id}`, 'DELETE');
            displayMessage(createAdminMessage, 'Admin deleted successfully!', false); // Use this for general messages
            fetchAdmins(); // Refresh list
        } catch (error) {
            displayMessage(createAdminMessage, `Error deleting admin: ${error.message}`, true);
        }
    }

    // Initial load of admins when the page loads
    fetchAdmins();
});