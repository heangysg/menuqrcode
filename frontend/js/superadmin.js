// qr-digital-menu-system/frontend/js/superadmin.js

// ==================== GLOBAL VARIABLES ====================
let wallpaperManagement = {};
let productManagement = {};
let adminManagement = {};
let adminToDeleteId = null;
let adminToDeleteName = null;

// ==================== UTILITY FUNCTIONS ====================

// Set the active user for superadmin page
function setActiveUserForSuperadminPage() {
    try {
        const allUserIds = JSON.parse(localStorage.getItem('all_user_ids') || '[]');
        let superadminUserId = null;
        
        console.log('🔄 Setting active user for superadmin page...');
        
        // Find the superadmin user
        for (const userId of allUserIds) {
            const userDataStr = localStorage.getItem(`user_data_${userId}`);
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                console.log(`👑 Checking user: ${userData.email} (${userData.role})`);
                if (userData.role === 'superadmin') {
                    superadminUserId = userId;
                    console.log(`✅ Found superadmin user: ${userData.email}`);
                    break;
                }
            }
        }
        
        if (superadminUserId) {
            localStorage.setItem('last_active_user_id', superadminUserId);
            console.log('✅ Active user set to superadmin:', superadminUserId);
        } else {
            console.error('❌ No superadmin user found');
        }
    } catch (error) {
        console.error('Error setting active superadmin user:', error);
    }
}

// Wait for authentication to complete
function waitForAuth() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        function checkAuth() {
            attempts++;
            const token = window.getStoredToken ? window.getStoredToken('superadmin') : null;
            const userData = window.getStoredUserData ? window.getStoredUserData() : null;
            
            console.log(`🔐 Auth check attempt ${attempts}:`, { 
                hasToken: !!token, 
                hasUserData: !!userData,
                userRole: userData ? userData.role : 'none'
            });
            
            if (token && userData) {
                console.log('✅ Auth confirmed, proceeding...');
                resolve(true);
                return;
            }
            
            if (attempts >= maxAttempts) {
                console.error('❌ Auth timeout after', attempts, 'attempts');
                resolve(false);
                return;
            }
            
            // Check again in 100ms
            setTimeout(checkAuth, 100);
        }
        
        checkAuth();
    });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('👑 Superadmin page loading...');
    
    try {
        // Set the correct active user for superadmin page FIRST
        setActiveUserForSuperadminPage();
        
        // Wait for authentication to complete
        console.log('🔐 Waiting for authentication...');
        const isAuthenticated = await waitForAuth();
        
        if (!isAuthenticated) {
            console.error('❌ Authentication failed, redirecting to login...');
            window.location.href = '/login';
            return;
        }

        console.log('✅ Authentication confirmed, initializing dashboard...');
        await initializeSuperadminDashboard();
        
    } catch (error) {
        console.error('❌ Error initializing superadmin dashboard:', error);
        showNotification('Error initializing dashboard: ' + error.message, 'error');
    }
});

async function initializeSuperadminDashboard() {
    try {
        console.log('👑 Superadmin dashboard initializing...');

        // Initialize all elements and functionality
        await initializeSuperadminDashboardContent();
        
        console.log('✅ Superadmin dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing superadmin dashboard:', error);
        showNotification('Error initializing dashboard: ' + error.message, 'error');
    }
}

async function initializeSuperadminDashboardContent() {
    try {
        // Update admin header with current user info
        updateSuperadminHeader();
        
        // Initialize tab functionality
        initializeTabs();
        
        // Initialize admin management
        await initializeAdminManagement();
        
        // Initialize category management
        await initializeCategoryManagement();

        // Initialize wallpaper management BEFORE product management
        await initializeWallpaperManagement();
        
        // Initialize product management (now this comes after wallpaper)
        await initializeProductManagement();
        
    } catch (error) {
        console.error('Error in superadmin dashboard content:', error);
        throw error;
    }
}

function updateSuperadminHeader() {
    const adminNameElement = document.getElementById('adminName');
    const userData = window.getStoredUserData ? window.getStoredUserData() : null;
    
    if (adminNameElement && userData) {
        adminNameElement.innerHTML = `${userData.name} <span class="bg-purple-600 text-white text-xs px-2 py-1 rounded-full ml-2">Superadmin</span>`;
    }
}

// ==================== TAB MANAGEMENT ====================

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active', 'bg-blue-600', 'text-white'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current button and content
            button.classList.add('active', 'bg-blue-600', 'text-white');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Refresh data for the active tab
            switch(tabId) {
                case 'admins':
                    fetchAdmins();
                    break;
                case 'categories':
                    fetchCategories();
                    break;
                case 'products':
                    fetchProducts();
                    break;
                case 'wallpapers':
                    loadWallpapers();
                    updateWallpaperCount();
                    break;
            }
        });
    });
}

// ==================== ADMIN MANAGEMENT ====================

async function initializeAdminManagement() {
    // Cache DOM elements
    adminManagement = {
        form: document.getElementById('createAdminForm'),
        message: document.getElementById('createAdminMessage'),
        tableBody: document.getElementById('adminList'),
        editModal: document.getElementById('editAdminModal'),
        editForm: document.getElementById('editAdminForm'),
        editId: document.getElementById('editAdminId'),
        editName: document.getElementById('editAdminName'),
        editEmail: document.getElementById('editAdminEmail'),
        editSlug: document.getElementById('editAdminSlug'),
        editPassword: document.getElementById('editAdminPassword'),
        editMessage: document.getElementById('editAdminMessage'),
        cancelEditBtn: document.getElementById('cancelEditBtn'),
        passwordModal: document.getElementById('passwordConfirmModal'),
        passwordInput: document.getElementById('confirmPasswordInput'),
        confirmPasswordBtn: document.getElementById('confirmPasswordBtn'),
        cancelPasswordBtn: document.getElementById('cancelPasswordBtn'),
        passwordMessage: document.getElementById('passwordConfirmMessage'),
        passwordConfirmText: document.getElementById('passwordConfirmText'),
        slugInput: document.getElementById('adminSlug'),
        slugPreview: document.getElementById('slugPreview'),
        editSlugPreview: document.getElementById('editSlugPreview')
    };
    adminToDeleteId = null;
    adminToDeleteName = null;
    
    // Initialize event listeners
    if (adminManagement.form) {
        adminManagement.form.addEventListener('submit', handleCreateAdmin);
    }
    
    if (adminManagement.editForm) {
        adminManagement.editForm.addEventListener('submit', handleEditAdmin);
    }
    
    if (adminManagement.cancelEditBtn) {
        adminManagement.cancelEditBtn.addEventListener('click', closeEditModal);
    }
    
    if (adminManagement.confirmPasswordBtn) {
        adminManagement.confirmPasswordBtn.addEventListener('click', handlePasswordConfirmation);
    }
    
    if (adminManagement.cancelPasswordBtn) {
        adminManagement.cancelPasswordBtn.addEventListener('click', closePasswordConfirmModal);
    }
    
    if (adminManagement.passwordInput) {
        adminManagement.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                adminManagement.confirmPasswordBtn.click();
            }
        });
    }

    // Slug preview functionality
    if (adminManagement.slugInput && adminManagement.slugPreview) {
        adminManagement.slugInput.addEventListener('input', (e) => {
            const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
            adminManagement.slugPreview.textContent = slug || 'slug';
            e.target.value = slug; // Auto-correct to valid format
        });
    }

    if (adminManagement.editSlug && adminManagement.editSlugPreview) {
        adminManagement.editSlug.addEventListener('input', (e) => {
            const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
            adminManagement.editSlugPreview.textContent = slug || 'slug';
            e.target.value = slug; // Auto-correct to valid format
        });
    }
    
    // Load initial data
    await fetchAdmins();
}

async function fetchAdmins() {
    if (!adminManagement.tableBody) return;
    
    adminManagement.tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading admins...</td></tr>';
    
    try {
        const response = await apiRequest('/users', 'GET');
        let admins = [];
        
        // Handle different response formats
        if (Array.isArray(response)) {
            admins = response;
        } else if (response && response.admins) {
            admins = response.admins;
        } else if (response && Array.isArray(response.data)) {
            admins = response.data;
        } else {
            // Extract any array property
            for (const key in response) {
                if (Array.isArray(response[key]) && key !== 'pagination') {
                    admins = response[key];
                    break;
                }
            }
        }
        
        renderAdminsTable(admins);
        
    } catch (error) {
        console.error('Error fetching admins:', error);
        adminManagement.tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>Failed to load admins: ${error.message}</td></tr>`;
    }
}

function renderAdminsTable(admins) {
    if (!adminManagement.tableBody) return;
    
    adminManagement.tableBody.innerHTML = '';
    
    if (admins.length === 0) {
        adminManagement.tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-gray-500"><i class="fas fa-users mr-2"></i>No admins found.</td></tr>';
        return;
    }
    
    admins.forEach(admin => {
        const row = adminManagement.tableBody.insertRow();
        row.className = 'fade-in';
        row.innerHTML = `
            <td class="py-4 px-6 border-b border-gray-200">
                <div class="flex items-center">
                    <div class="bg-blue-100 text-blue-600 rounded-full p-2 mr-3">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${admin.name}</div>
                        <div class="text-sm text-gray-500">${admin.email}</div>
                        ${admin.store ? `
                            <div class="text-xs text-blue-600">Store: ${admin.store.name}</div>
                            <div class="text-xs text-green-600 font-semibold">Slug: ${admin.store.slug}</div>
                            <div class="text-xs text-gray-500">URL: /menu/${admin.store.slug}</div>
                        ` : '<div class="text-xs text-red-500">No store assigned</div>'}
                    </div>
                </div>
            </td>
            <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-500">
                <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Active</span>
            </td>
            <td class="py-4 px-6 border-b border-gray-200 text-right">
                <button data-id="${admin._id}" data-name="${admin.name}" data-email="${admin.email}" data-slug="${admin.store ? admin.store.slug : ''}" class="edit-admin-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2 px-4 rounded-lg mr-2 transition duration-200">
                    <i class="fas fa-edit mr-1"></i>Edit
                </button>
                <button data-id="${admin._id}" data-name="${admin.name}" class="delete-admin-btn bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition duration-200">
                    <i class="fas fa-trash mr-1"></i>Delete
                </button>
            </td>
        `;
    });
    
    attachAdminEventListeners();
}

function attachAdminEventListeners() {
    document.querySelectorAll('.edit-admin-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            const name = e.target.closest('button').dataset.name;
            const email = e.target.closest('button').dataset.email;
            const slug = e.target.closest('button').dataset.slug;
            openEditModal(id, name, email, slug);
        });
    });
    
    document.querySelectorAll('.delete-admin-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.target.closest('button').dataset.id;
            const name = e.target.closest('button').dataset.name;
            openPasswordConfirmModal(id, name);
        });
    });
}

async function handleCreateAdmin(e) {
    e.preventDefault();
    
    const name = document.getElementById('adminName').value.trim();
    const email = document.getElementById('adminEmail').value.trim();
    const slug = document.getElementById('adminSlug').value.trim();
    const password = document.getElementById('adminPassword').value;
    const confirmPassword = document.getElementById('confirmAdminPassword').value;
    
    console.log('Creating admin with:', { name, email, slug, password: password ? '***' : 'missing', confirmPassword: confirmPassword ? '***' : 'missing' });
    
    // Validate inputs
    if (!name || !email || !password || !confirmPassword) {
        showMessage(adminManagement.message, 'Please fill in all required fields.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage(adminManagement.message, 'Password must be at least 6 characters long.', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage(adminManagement.message, 'Passwords do not match.', 'error');
        return;
    }

    // Validate slug format
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
        showMessage(adminManagement.message, 'Slug can only contain lowercase letters, numbers, and hyphens.', 'error');
        return;
    }

    if (slug && (slug.length < 2 || slug.length > 50)) {
        showMessage(adminManagement.message, 'Slug must be between 2 and 50 characters.', 'error');
        return;
    }
    
    const submitBtn = adminManagement.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
    
    try {
        const result = await apiRequest('/users/register-admin', 'POST', { 
            name, 
            email, 
            slug,
            password,
            confirmPassword 
        });
        
        console.log('Admin creation response:', result);
        showMessage(adminManagement.message, 'Admin created successfully! Store URL: /menu/' + (result.slug || result.storeSlug), 'success');
        adminManagement.form.reset();
        await fetchAdmins();
        
    } catch (error) {
        console.error('Admin creation error:', error);
        showMessage(adminManagement.message, `Error creating admin: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitBtn, false, originalText);
    }
}

function openEditModal(id, name, email, slug) {
    adminManagement.editId.value = id;
    adminManagement.editName.value = name;
    adminManagement.editEmail.value = email;
    adminManagement.editSlug.value = slug || '';
    adminManagement.editSlugPreview.textContent = slug || 'slug';
    adminManagement.editPassword.value = '';
    showMessage(adminManagement.editMessage, '', 'success');
    adminManagement.editModal.classList.remove('hidden');
}

function closeEditModal() {
    adminManagement.editModal.classList.add('hidden');
}

async function handleEditAdmin(e) {
    e.preventDefault();
    
    const id = adminManagement.editId.value;
    const name = adminManagement.editName.value.trim();
    const email = adminManagement.editEmail.value.trim();
    const slug = adminManagement.editSlug.value.trim();
    const password = adminManagement.editPassword.value;
    
    if (!name || !email) {
        showMessage(adminManagement.editMessage, 'Please fill in all required fields.', 'error');
        return;
    }
    
    if (password && password.length < 6) {
        showMessage(adminManagement.editMessage, 'Password must be at least 6 characters long.', 'error');
        return;
    }

    // Validate slug format
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
        showMessage(adminManagement.editMessage, 'Slug can only contain lowercase letters, numbers, and hyphens.', 'error');
        return;
    }

    if (slug && (slug.length < 2 || slug.length > 50)) {
        showMessage(adminManagement.editMessage, 'Slug must be between 2 and 50 characters.', 'error');
        return;
    }
    
    const submitBtn = adminManagement.editForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
    
    try {
        // First update admin details (name, email, password)
        const updateData = { name, email };
        if (password) {
            updateData.password = password;
            updateData.confirmPassword = password;
        }
        
        await apiRequest(`/users/${id}`, 'PUT', updateData);
        
        // Then update store slug if changed
        if (slug) {
            const currentAdmin = await apiRequest(`/users/${id}`, 'GET');
            if (currentAdmin.store && slug !== currentAdmin.store.slug) {
                await apiRequest(`/users/${id}/store-slug`, 'PUT', { slug });
            }
        }
        
        showMessage(adminManagement.editMessage, 'Admin updated successfully! Store URL: /menu/' + slug, 'success');
        
        setTimeout(() => {
            closeEditModal();
            fetchAdmins();
        }, 1500);
        
    } catch (error) {
        showMessage(adminManagement.editMessage, `Error updating admin: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitBtn, false, originalText);
    }
}

function openPasswordConfirmModal(adminId, adminName) {
    adminToDeleteId = adminId;
    adminToDeleteName = adminName;
    adminManagement.passwordInput.value = '';
    showMessage(adminManagement.passwordMessage, '', 'error');
    
    if (adminManagement.passwordConfirmText) {
        adminManagement.passwordConfirmText.textContent = `Please enter your superadmin password to delete "${adminName}":`;
    }
    
    adminManagement.passwordModal.classList.remove('hidden');
    adminManagement.passwordInput.focus();
}

function closePasswordConfirmModal() {
    adminManagement.passwordModal.classList.add('hidden');
    adminToDeleteId = null;
    adminToDeleteName = null;
}

async function handlePasswordConfirmation() {
    const password = adminManagement.passwordInput.value.trim();
    
    if (!password) {
        showMessage(adminManagement.passwordMessage, 'Please enter your password.', 'error');
        return;
    }
    
    const submitBtn = adminManagement.confirmPasswordBtn;
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
    
    try {
        await deleteAdmin(adminToDeleteId, password, adminToDeleteName);
        closePasswordConfirmModal();
    } catch (error) {
        showMessage(adminManagement.passwordMessage, error.message, 'error');
    } finally {
        setButtonLoading(submitBtn, false, originalText);
    }
}

async function deleteAdmin(id, password, adminName) {
    try {
        console.log('🗑️ Deleting admin:', { id, adminName });
        
        const deleteData = {
            password: password,
            confirmPassword: password, // Send password as both fields
            confirmDelete: true 
        };
        
        console.log('📤 Sending delete data:', { 
            ...deleteData, 
            password: '***', 
            confirmPassword: '***' 
        });
        
        await apiRequest(`/users/${id}`, 'DELETE', deleteData);
        
        showNotification('Admin deleted successfully!', 'success');
        await fetchAdmins(); // Refresh the list
        
    } catch (error) {
        console.error('Delete admin error:', error);
        
        // Handle specific error cases
        if (error.message.includes('Password confirmation') || error.message.includes('400')) {
            throw new Error('Password confirmation failed. Please try again.');
        } else if (error.message.includes('Invalid password') || error.message.includes('401')) {
            throw new Error('Invalid superadmin password. Please try again.');
        } else if (error.message.includes('confirmDelete')) {
            throw new Error('Deletion confirmation required. Please try again.');
        } else {
            throw new Error(`Error deleting admin: ${error.message}`);
        }
    }
}

// ==================== CATEGORY MANAGEMENT ====================

let categoryManagement = {};

async function initializeCategoryManagement() {
    categoryManagement = {
        form: document.getElementById('createCategoryForm'),
        message: document.getElementById('createCategoryMessage'),
        tableBody: document.getElementById('categoryList'),
        editModal: document.getElementById('editCategoryModal'),
        editForm: document.getElementById('editCategoryForm'),
        editId: document.getElementById('editCategoryId'),
        editName: document.getElementById('editCategoryName'),
        editOrder: document.getElementById('editCategoryOrder'),
        editMessage: document.getElementById('editCategoryMessage'),
        cancelEditBtn: document.getElementById('cancelEditCategoryBtn')
    };
    
    if (categoryManagement.form) {
        categoryManagement.form.addEventListener('submit', handleCreateCategory);
    }
    
    if (categoryManagement.editForm) {
        categoryManagement.editForm.addEventListener('submit', handleEditCategory);
    }
    
    if (categoryManagement.cancelEditBtn) {
        categoryManagement.cancelEditBtn.addEventListener('click', closeEditCategoryModal);
    }
    
    await fetchCategories();
}

async function fetchCategories() {
    if (!categoryManagement.tableBody) return;
    
    categoryManagement.tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading categories...</td></tr>';
    
    try {
        // FIXED: Use correct superadmin endpoint
        const response = await apiRequest('/categories/superadmin', 'GET');
        let categories = [];
        
        if (Array.isArray(response)) {
            categories = response;
        } else if (response && response.categories) {
            categories = response.categories;
        } else if (response && Array.isArray(response.data)) {
            categories = response.data;
        } else {
            for (const key in response) {
                if (Array.isArray(response[key]) && key !== 'pagination') {
                    categories = response[key];
                    break;
                }
            }
        }
        
        renderCategoriesTable(categories);
        populateCategoryDropdowns(categories);
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        categoryManagement.tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>Failed to load categories: ${error.message}</td></tr>`;
    }
}

function renderCategoriesTable(categories) {
    if (!categoryManagement.tableBody) return;
    
    categoryManagement.tableBody.innerHTML = '';
    
    if (categories.length === 0) {
        categoryManagement.tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-8 text-gray-500"><i class="fas fa-tags mr-2"></i>No categories found.</td></tr>';
        return;
    }
    
    categories.forEach(category => {
        const row = categoryManagement.tableBody.insertRow();
        row.className = 'fade-in';
        row.innerHTML = `
            <td class="py-4 px-6 border-b border-gray-200">
                <div class="flex items-center">
                    <div class="bg-green-100 text-green-600 rounded-full p-2 mr-3">
                        <i class="fas fa-tag"></i>
                    </div>
                    <span class="font-medium text-gray-900">${category.name}</span>
                </div>
            </td>
            <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-500">
                ${category.order || 0}
            </td>
            <td class="py-4 px-6 border-b border-gray-200 text-right">
                <button data-id="${category._id}" data-name="${category.name}" data-order="${category.order || 0}" class="edit-category-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2 px-4 rounded-lg mr-2 transition duration-200">
                    <i class="fas fa-edit mr-1"></i>Edit
                </button>
                <button data-id="${category._id}" data-name="${category.name}" class="delete-category-btn bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition duration-200">
                    <i class="fas fa-trash mr-1"></i>Delete
                </button>
            </td>
        `;
    });
    
    attachCategoryEventListeners();
}

function populateCategoryDropdowns(categories) {
    const productCategory = document.getElementById('productCategory');
    const editProductCategory = document.getElementById('editProductCategory');
    
    if (productCategory) {
        productCategory.innerHTML = '<option value="">Select Category</option>' + 
            categories.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
    }
    
    if (editProductCategory) {
        editProductCategory.innerHTML = '<option value="">Select Category</option>' + 
            categories.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');
    }
}

function attachCategoryEventListeners() {
    document.querySelectorAll('.edit-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            const categoryId = button.dataset.id;
            const name = button.dataset.name;
            const order = button.dataset.order;
            openEditCategoryModal(categoryId, name, order);
        });
    });
    
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            const categoryId = button.dataset.id;
            const categoryName = button.dataset.name;
            if (confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
                deleteCategory(categoryId);
            }
        });
    });
}

async function handleCreateCategory(e) {
    e.preventDefault();
    
    const name = document.getElementById('categoryName').value.trim();
    const order = document.getElementById('categoryOrder').value || 0;
    
    if (!name) {
        showMessage(categoryManagement.message, 'Please enter a category name.', 'error');
        return;
    }
    
    const submitBtn = categoryManagement.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
    
    try {
        await apiRequest('/categories/superadmin', 'POST', { name, order });
        showMessage(categoryManagement.message, 'Category created successfully!', 'success');
        categoryManagement.form.reset();
        document.getElementById('categoryOrder').value = 0;
        await fetchCategories();
        
    } catch (error) {
        showMessage(categoryManagement.message, `Error creating category: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitBtn, false, originalText);
    }
}

function openEditCategoryModal(id, name, order) {
    categoryManagement.editId.value = id;
    categoryManagement.editName.value = name;
    categoryManagement.editOrder.value = order;
    showMessage(categoryManagement.editMessage, '', 'success');
    categoryManagement.editModal.classList.remove('hidden');
}

function closeEditCategoryModal() {
    categoryManagement.editModal.classList.add('hidden');
}

async function handleEditCategory(e) {
    e.preventDefault();
    
    const id = categoryManagement.editId.value;
    const name = categoryManagement.editName.value.trim();
    const order = categoryManagement.editOrder.value || 0;
    
    if (!name) {
        showMessage(categoryManagement.editMessage, 'Please enter a category name.', 'error');
        return;
    }
    
    const submitBtn = categoryManagement.editForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
    
    try {
        await apiRequest(`/categories/superadmin/${id}`, 'PUT', { name, order });
        showMessage(categoryManagement.editMessage, 'Category updated successfully!', 'success');
        
        setTimeout(() => {
            closeEditCategoryModal();
            fetchCategories();
        }, 1500);
        
    } catch (error) {
        showMessage(categoryManagement.editMessage, `Error updating category: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitBtn, false, originalText);
    }
}

async function deleteCategory(categoryId) {
    try {
        await apiRequest(`/categories/superadmin/${categoryId}`, 'DELETE', { confirmDelete: true });
        showNotification('Category deleted successfully!', 'success');
        await fetchCategories();
    } catch (error) {
        showNotification(`Error deleting category: ${error.message}`, 'error');
    }
}

// ==================== WALLPAPER MANAGEMENT ====================

async function initializeWallpaperManagement() {
    try {
        console.log('🖼️ Initializing wallpaper management...');
        
        // Initialize wallpaperManagement object
        wallpaperManagement = {
            form: document.getElementById('uploadWallpaperForm'),
            status: document.getElementById('wallpaperUploadStatus'),
            message: document.getElementById('wallpaperUploadMessage'),
            grid: document.getElementById('wallpapersGrid'),
            previewContainer: document.getElementById('wallpaperPreviewContainer'),
            preview: document.getElementById('wallpaperPreview'),
            countInfo: document.getElementById('wallpaperCount'),
            limitInfo: document.getElementById('wallpaperLimitInfo'),
            loading: document.getElementById('wallpapersLoading'),
            noWallpapersMessage: document.getElementById('noWallpapersMessage'),
            removeWallpaperBtn: document.getElementById('removeWallpaperBtn')
        };

        // DEBUG: Log all found elements
        console.log('🔍 Wallpaper management elements found:');
        Object.keys(wallpaperManagement).forEach(key => {
            console.log(`- ${key}:`, !!wallpaperManagement[key]);
        });

        // Check if all required elements exist
        const requiredElements = ['form', 'grid', 'loading', 'noWallpapersMessage'];
        const missingElements = requiredElements.filter(key => !wallpaperManagement[key]);
        
        if (missingElements.length > 0) {
            console.error('❌ Missing required wallpaper elements:', missingElements);
            return;
        }

        // Initialize event listeners
        if (wallpaperManagement.form) {
            wallpaperManagement.form.addEventListener('submit', handleUploadWallpaper);
        }
        
        // Preview wallpaper before upload
        const wallpaperFileInput = document.getElementById('wallpaperFile');
        if (wallpaperFileInput && wallpaperManagement.preview) {
            wallpaperFileInput.addEventListener('change', previewWallpaper);
        }

        // Load initial data
        await loadWallpapers();
        await updateWallpaperCount();
        
        console.log('✅ Wallpaper management initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing wallpaper management:', error);
    }
}

function previewWallpaper(e) {
    const file = e.target.files[0];
    const preview = wallpaperManagement.preview;
    const container = wallpaperManagement.previewContainer;
    
    if (!preview || !container) {
        console.error('Preview elements not found');
        return;
    }
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            container.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        container.classList.add('hidden');
    }
}

async function handleUploadWallpaper(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('wallpaperName');
    const fileInput = document.getElementById('wallpaperFile');
    
    if (!nameInput || !fileInput) {
        showWallpaperMessage('Form elements not found', 'error');
        return;
    }
    
    const name = nameInput.value.trim();
    const file = fileInput.files[0];
    
    if (!name) {
        showWallpaperMessage('Please enter a wallpaper name', 'error');
        return;
    }
    
    if (!file) {
        showWallpaperMessage('Please select a wallpaper image', 'error');
        return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showWallpaperMessage('File size too large. Maximum size is 5MB.', 'error');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showWallpaperMessage('Please select a valid image file', 'error');
        return;
    }
    
    const submitBtn = wallpaperManagement.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
    
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('wallpaper', file);
        
        console.log('📤 Uploading wallpaper...', { name, file: file.name });
        
        const response = await apiRequest('/wallpapers', 'POST', formData, true, true);
        
        console.log('✅ Wallpaper upload successful:', response);
        showWallpaperMessage('Wallpaper uploaded successfully!', 'success');
        
        // Reset form
        wallpaperManagement.form.reset();
        if (wallpaperManagement.previewContainer) {
            wallpaperManagement.previewContainer.classList.add('hidden');
        }
        
        // Reload data
        await loadWallpapers();
        await updateWallpaperCount();
        
    } catch (error) {
        console.error('❌ Error uploading wallpaper:', error);
        showWallpaperMessage(`Error uploading wallpaper: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitBtn, false, originalText);
    }
}

function showWallpaperMessage(message, type = 'info') {
    const status = wallpaperManagement.status;
    const messageEl = wallpaperManagement.message;
    
    if (!status || !messageEl) {
        console.error('Wallpaper message elements not found');
        return;
    }
    
    // Reset classes
    status.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'bg-blue-100', 'border-green-200', 'border-red-200', 'border-blue-200');
    messageEl.classList.remove('text-green-800', 'text-red-800', 'text-blue-800');
    
    // Set new classes based on type
    if (type === 'success') {
        status.classList.add('bg-green-100', 'border-green-200');
        messageEl.classList.add('text-green-800');
    } else if (type === 'error') {
        status.classList.add('bg-red-100', 'border-red-200');
        messageEl.classList.add('text-red-800');
    } else {
        status.classList.add('bg-blue-100', 'border-blue-200');
        messageEl.classList.add('text-blue-800');
    }
    
    messageEl.textContent = message;
    status.classList.remove('hidden');
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            status.classList.add('hidden');
        }, 5000);
    }
}

async function loadWallpapers() {
    const grid = wallpaperManagement.grid;
    const loading = wallpaperManagement.loading;
    const noWallpapers = wallpaperManagement.noWallpapersMessage;
    
    if (!grid || !loading || !noWallpapers) {
        console.error('❌ Wallpaper management elements not found');
        return;
    }
    
    // SHOW LOADING STATE
    loading.classList.remove('hidden');
    grid.classList.add('hidden');
    noWallpapers.classList.add('hidden');
    
    try {
        console.log('📥 Loading wallpapers...');
        const response = await apiRequest('/wallpapers', 'GET', null, true);
        
        console.log('🔍 Full wallpapers response:', response);
        
        // Handle different response structures
        let wallpapers = [];
        
        if (response && Array.isArray(response.wallpapers)) {
            wallpapers = response.wallpapers;
        } else if (response && Array.isArray(response)) {
            wallpapers = response;
        } else if (response && response.data && Array.isArray(response.data)) {
            wallpapers = response.data;
        }
        
        console.log(`✅ Processed ${wallpapers.length} wallpapers from response`);
        console.log('🔍 Wallpapers data:', wallpapers);
        
        renderWallpapersGrid(wallpapers);
        
    } catch (error) {
        console.error('❌ Error loading wallpapers:', error);
        
        // HIDE LOADING AND SHOW ERROR
        loading.classList.add('hidden');
        grid.classList.add('hidden');
        
        noWallpapers.classList.remove('hidden');
        noWallpapers.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p class="text-lg font-semibold">Failed to load wallpapers</p>
                <p class="text-sm">${error.message}</p>
                <button onclick="loadWallpapers()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-200">
                    <i class="fas fa-redo mr-2"></i>Try Again
                </button>
            </div>
        `;
    }
}

function renderWallpapersGrid(wallpapers) {
    const grid = wallpaperManagement.grid;
    const loading = wallpaperManagement.loading;
    const noWallpapers = wallpaperManagement.noWallpapersMessage;
    
    if (!grid || !loading || !noWallpapers) {
        console.error('❌ Missing required elements');
        return;
    }
    
    // Hide loading state
    loading.classList.add('hidden');
    noWallpapers.classList.add('hidden');
    
    console.log('🎨 Rendering wallpapers grid with:', wallpapers.length, 'items');
    
    if (!wallpapers || wallpapers.length === 0) {
        console.log('📭 No wallpapers to display');
        noWallpapers.classList.remove('hidden');
        grid.classList.add('hidden');
        return;
    }
    
    // Show the grid
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    
    wallpapers.forEach((wallpaper, index) => {
        console.log(`🖼️ Processing wallpaper ${index + 1}:`, wallpaper);
        
        const wallpaperId = wallpaper._id || wallpaper.id || `temp-${index}`;
        const wallpaperName = wallpaper.name || 'Unnamed Wallpaper';
        const wallpaperUrl = wallpaper.imageUrl || wallpaper.url || '';
        const uploadedByName = wallpaper.uploadedBy?.name || 'Superadmin';
        const createdAt = wallpaper.createdAt ? new Date(wallpaper.createdAt).toLocaleDateString() : 'Unknown date';
        
        if (!wallpaperUrl) {
            console.warn('❌ Wallpaper missing image URL:', wallpaper);
            return;
        }
        
        const card = document.createElement('div');
        card.className = 'wallpaper-card bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300';
        
        // USE PROPER EVENT LISTENERS INSTEAD OF ONCLICK ATTRIBUTES
        card.innerHTML = `
            <div class="relative group">
                <img src="${wallpaperUrl}" alt="${wallpaperName}" 
                     class="wallpaper-image w-full h-48 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                     data-preview-url="${wallpaperUrl}" data-preview-name="${wallpaperName}">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                <div class="absolute top-3 right-3">
                    <span class="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                        ${createdAt}
                    </span>
                </div>
                <div class="absolute bottom-3 left-3 right-3">
                    <span class="bg-gradient-to-r from-black to-transparent text-white text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm">
                        ${wallpaperName}
                    </span>
                </div>
            </div>
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <p class="text-xs text-gray-500">
                        <i class="fas fa-user mr-1"></i>
                        ${uploadedByName}
                    </p>
                    <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        HD Wallpaper
                    </span>
                </div>
                <div class="flex justify-between items-center">
                    <button class="preview-btn bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition duration-200 flex items-center"
                            data-preview-url="${wallpaperUrl}" data-preview-name="${wallpaperName}">
                        <i class="fas fa-eye mr-1"></i>Preview
                    </button>
                    <button class="delete-btn bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition duration-200 flex items-center"
                            data-wallpaper-id="${wallpaperId}" data-wallpaper-name="${wallpaperName}">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    // ADD EVENT LISTENERS AFTER RENDERING
    addWallpaperEventListeners();
    
    console.log('✅ Wallpapers grid rendered successfully');
}

// ADD THIS FUNCTION TO HANDLE EVENT LISTENERS
function addWallpaperEventListeners() {
    const grid = wallpaperManagement.grid;
    if (!grid) return;
    
    // Preview button click
    grid.addEventListener('click', function(e) {
        const previewBtn = e.target.closest('.preview-btn');
        const wallpaperImage = e.target.closest('.wallpaper-image');
        
        if (previewBtn) {
            const url = previewBtn.getAttribute('data-preview-url');
            const name = previewBtn.getAttribute('data-preview-name');
            console.log('👁️ Preview button clicked:', { url, name });
            previewWallpaperLarge(url, name);
        }
        
        if (wallpaperImage) {
            const url = wallpaperImage.getAttribute('data-preview-url');
            const name = wallpaperImage.getAttribute('data-preview-name');
            console.log('👁️ Wallpaper image clicked:', { url, name });
            previewWallpaperLarge(url, name);
        }
    });
    
    // Delete button click
    grid.addEventListener('click', function(e) {
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.getAttribute('data-wallpaper-id');
            const name = deleteBtn.getAttribute('data-wallpaper-name');
            console.log('🗑️ Delete button clicked:', { id, name });
            deleteWallpaper(id, name);
        }
    });
}

function previewWallpaperLarge(imageUrl, name) {
    console.log('🖼️ previewWallpaperLarge called with:', { imageUrl, name });
    
    // Remove any existing modal first
    const existingModal = document.querySelector('.wallpaper-preview-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'wallpaper-preview-modal fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl max-w-6xl max-h-[90vh] w-full overflow-hidden shadow-2xl">
            <div class="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <h3 class="text-2xl font-bold">${name}</h3>
                <button class="close-preview-btn text-white hover:text-gray-200 text-2xl transition duration-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-8 flex justify-center items-center bg-gray-100">
                <img src="${imageUrl}" alt="${name}" 
                     class="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg">
            </div>
            <div class="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div class="text-sm text-gray-600">
                    <i class="fas fa-info-circle mr-2"></i>
                    Click outside to close
                </div>
                <button class="close-preview-btn bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-xl transition duration-200 flex items-center">
                    <i class="fas fa-times mr-2"></i>Close Preview
                </button>
            </div>
        </div>
    `;
    
    // Add close event listeners
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.closest('.close-preview-btn')) {
            closeWallpaperPreview();
        }
    });
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    console.log('✅ Preview modal created');
}

// ADD THIS FUNCTION - Close wallpaper preview modal
function closeWallpaperPreview() {
    console.log('🔒 closeWallpaperPreview called');
    
    const modal = document.querySelector('.wallpaper-preview-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        console.log('✅ Preview modal closed');
    }
}

async function deleteWallpaper(wallpaperId, wallpaperName = 'this wallpaper') {
    console.log('🗑️ deleteWallpaper called with:', { wallpaperId, wallpaperName });
    
    if (!confirm(`Are you sure you want to delete "${wallpaperName}"? This action cannot be undone and will remove the wallpaper from all stores using it.`)) {
        console.log('❌ Delete cancelled by user');
        return;
    }
    
    try {
        console.log(`🗑️ Deleting wallpaper: ${wallpaperId}`);
        
        await apiRequest(`/wallpapers/${wallpaperId}`, 'DELETE', null, true);
        
        showNotification(`Wallpaper "${wallpaperName}" deleted successfully!`, 'success');
        
        // Reload data
        await loadWallpapers();
        await updateWallpaperCount();
        
    } catch (error) {
        console.error('❌ Error deleting wallpaper:', error);
        showNotification(`Error deleting wallpaper: ${error.message}`, 'error');
    }
}

async function updateWallpaperCount() {
    try {
        const response = await apiRequest('/wallpapers/count/my-wallpapers', 'GET', null, true);
        const countInfo = wallpaperManagement.countInfo;
        const limitInfo = wallpaperManagement.limitInfo;
        
        if (countInfo) {
            countInfo.textContent = `${response.count}/${response.maxLimit}`;
            
            // Update styling based on count
            if (response.count >= response.maxLimit) {
                countInfo.classList.add('text-red-600', 'font-bold');
                countInfo.classList.remove('text-gray-600');
            } else if (response.count >= response.maxLimit - 1) {
                countInfo.classList.add('text-orange-600', 'font-semibold');
                countInfo.classList.remove('text-gray-600');
            } else {
                countInfo.classList.remove('text-red-600', 'text-orange-600', 'font-bold', 'font-semibold');
                countInfo.classList.add('text-gray-600');
            }
        }
        
        if (limitInfo) {
            if (response.count >= response.maxLimit) {
                limitInfo.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> Maximum limit reached!';
                limitInfo.classList.add('text-red-600', 'font-semibold');
                limitInfo.classList.remove('text-gray-600');
            } else {
                limitInfo.textContent = `Maximum ${response.maxLimit} wallpapers allowed`;
                limitInfo.classList.remove('text-red-600', 'font-semibold');
                limitInfo.classList.add('text-gray-600');
            }
        }
        
    } catch (error) {
        console.error('❌ Error updating wallpaper count:', error);
    }
}

// ==================== PRODUCT MANAGEMENT ====================

async function initializeProductManagement() {
    productManagement = {
        form: document.getElementById('createProductForm'),
        message: document.getElementById('createProductMessage'),
        tableBody: document.getElementById('productList'),
        editModal: document.getElementById('editProductModal'),
        editForm: document.getElementById('editProductForm'),
        editId: document.getElementById('editProductId'),
        editTitle: document.getElementById('editProductTitle'),
        editDescription: document.getElementById('editProductDescription'),
        editPrice: document.getElementById('editProductPrice'),
        editCategory: document.getElementById('editProductCategory'),
        editImageUrl: document.getElementById('editProductImageUrl'),
        editIsAvailable: document.getElementById('editProductIsAvailable'),
        editCurrentImage: document.getElementById('editProductCurrentImage'),
        editMessage: document.getElementById('editProductMessage'),
        cancelEditBtn: document.getElementById('cancelEditProductBtn'),
        removeImageCheckbox: document.getElementById('removeImageCheckbox')
    };
    
    if (productManagement.form) {
        productManagement.form.addEventListener('submit', handleCreateProduct);
    }
    
    if (productManagement.editForm) {
        productManagement.editForm.addEventListener('submit', handleEditProduct);
    }
    
    if (productManagement.cancelEditBtn) {
        productManagement.cancelEditBtn.addEventListener('click', closeEditProductModal);
    }
    
    await fetchProducts();
}

async function fetchProducts() {
    if (!productManagement.tableBody) return;
    
    productManagement.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Loading products...</td></tr>';
    
    try {
        // FIXED: Use correct superadmin endpoint
        const response = await apiRequest('/products/superadmin', 'GET');
        let products = [];
        
        if (Array.isArray(response)) {
            products = response;
        } else if (response && response.products) {
            products = response.products;
        } else if (response && Array.isArray(response.data)) {
            products = response.data;
        } else {
            for (const key in response) {
                if (Array.isArray(response[key]) && key !== 'pagination') {
                    products = response[key];
                    break;
                }
            }
        }
        
        renderProductsTable(products);
        
    } catch (error) {
        console.error('Error fetching products:', error);
        productManagement.tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-red-500"><i class="fas fa-exclamation-triangle mr-2"></i>Failed to load products: ${error.message}</td></tr>`;
    }
}

function renderProductsTable(products) {
    if (!productManagement.tableBody) return;
    
    productManagement.tableBody.innerHTML = '';
    
    if (products.length === 0) {
        productManagement.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500"><i class="fas fa-utensils mr-2"></i>No products found.</td></tr>';
        return;
    }
    
    products.forEach(product => {
        const price = product.price !== undefined && product.price !== '' ? `$${parseFloat(product.price).toFixed(2)}` : 'N/A';
        const status = product.isAvailable ? 
            '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Available</span>' :
            '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Unavailable</span>';
        
        const row = productManagement.tableBody.insertRow();
        row.className = 'fade-in';
        row.innerHTML = `
            <td class="py-4 px-6 border-b border-gray-200">
                ${product.image || product.imageUrl ? 
                    `<img src="${product.image || product.imageUrl}" alt="${product.title}" class="w-16 h-16 object-cover rounded-lg">` : 
                    '<div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500"><i class="fas fa-image"></i></div>'
                }
            </td>
            <td class="py-4 px-6 border-b border-gray-200">
                <div class="font-medium text-gray-900">${product.title}</div>
                <div class="text-sm text-gray-500 mt-1">${product.description || 'No description'}</div>
            </td>
            <td class="py-4 px-6 border-b border-gray-200 font-medium">${price}</td>
            <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-500">
                ${product.category?.name || 'Uncategorized'}
            </td>
            <td class="py-4 px-6 border-b border-gray-200">${status}</td>
            <td class="py-4 px-6 border-b border-gray-200 text-right">
                <button data-id="${product._id}" class="edit-product-btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2 px-4 rounded-lg mr-2 transition duration-200">
                    <i class="fas fa-edit mr-1"></i>Edit
                </button>
                <button data-id="${product._id}" class="delete-product-btn bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition duration-200">
                    <i class="fas fa-trash mr-1"></i>Delete
                </button>
            </td>
        `;
    });
    
    attachProductEventListeners();
}

function attachProductEventListeners() {
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('button').dataset.id;
            openEditProductModal(productId);
        });
    });
    
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('button').dataset.id;
            const productTitle = e.target.closest('tr').querySelector('td:nth-child(2) .font-medium').textContent;
            if (confirm(`Are you sure you want to delete "${productTitle}"? This action cannot be undone.`)) {
                deleteProduct(productId);
            }
        });
    });
}

async function handleCreateProduct(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('productTitle').value);
    formData.append('description', document.getElementById('productDescription').value);
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('category', document.getElementById('productCategory').value);
    formData.append('imageUrl', document.getElementById('productImageUrl').value);
    formData.append('isAvailable', document.getElementById('productIsAvailable').checked);
    
    const imageFile = document.getElementById('productImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const submitBtn = productManagement.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
    
    try {
        await apiRequest('/products/superadmin', 'POST', formData, true, true);
        showMessage(productManagement.message, 'Product created successfully!', 'success');
        productManagement.form.reset();
        await fetchProducts();
        
    } catch (error) {
        showMessage(productManagement.message, `Error creating product: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitBtn, false, originalText);
    }
}

async function openEditProductModal(productId) {
    try {
        const product = await apiRequest(`/products/superadmin/${productId}`, 'GET');
        
        productManagement.editId.value = product._id;
        productManagement.editTitle.value = product.title;
        productManagement.editDescription.value = product.description || '';
        productManagement.editPrice.value = product.price || '';
        productManagement.editImageUrl.value = product.imageUrl || '';
        productManagement.editIsAvailable.checked = product.isAvailable;
        
        if (productManagement.removeImageCheckbox) {
            productManagement.removeImageCheckbox.checked = false;
        }
        
        if (productManagement.editCategory) {
            productManagement.editCategory.value = product.category?._id || '';
        }
        
        const currentImageUrl = product.image || product.imageUrl;
        if (currentImageUrl && productManagement.editCurrentImage) {
            productManagement.editCurrentImage.src = currentImageUrl;
            productManagement.editCurrentImage.classList.remove('hidden');
        } else if (productManagement.editCurrentImage) {
            productManagement.editCurrentImage.classList.add('hidden');
        }
        
        showMessage(productManagement.editMessage, '', 'success');
        productManagement.editModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error fetching product for edit:', error);
        showNotification('Error loading product details: ' + error.message, 'error');
    }
}

function closeEditProductModal() {
    productManagement.editModal.classList.add('hidden');
}

async function handleEditProduct(e) {
    e.preventDefault();
    
    const productId = productManagement.editId.value;
    const formData = new FormData();
    
    formData.append('title', productManagement.editTitle.value);
    formData.append('description', productManagement.editDescription.value);
    formData.append('price', productManagement.editPrice.value);
    formData.append('category', productManagement.editCategory.value);
    formData.append('imageUrl', productManagement.editImageUrl.value);
    formData.append('isAvailable', productManagement.editIsAvailable.checked);
    
    if (productManagement.removeImageCheckbox && productManagement.removeImageCheckbox.checked) {
        formData.append('removeImage', 'true');
    }
    
    const imageFile = document.getElementById('editProductImage') ? document.getElementById('editProductImage').files[0] : null;
    if (imageFile) {
        formData.append('image', imageFile);
    }
    
    const submitBtn = productManagement.editForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    setButtonLoading(submitBtn, true);
    
    try {
        await apiRequest(`/products/superadmin/${productId}`, 'PUT', formData, true, true);
        showMessage(productManagement.editMessage, 'Product updated successfully!', 'success');
        
        setTimeout(() => {
            closeEditProductModal();
            fetchProducts();
        }, 1500);
        
    } catch (error) {
        showMessage(productManagement.editMessage, `Error updating product: ${error.message}`, 'error');
    } finally {
        setButtonLoading(submitBtn, false, originalText);
    }
}

async function deleteProduct(productId) {
    try {
        await apiRequest(`/products/superadmin/${productId}`, 'DELETE');
        showNotification('Product deleted successfully!', 'success');
        await fetchProducts();
    } catch (error) {
        showNotification(`Error deleting product: ${error.message}`, 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================

function showMessage(element, message, type = 'info') {
    if (!element) return;
    
    element.textContent = message;
    element.className = 'text-sm mt-2';
    
    if (type === 'error') {
        element.classList.add('text-red-600');
        element.classList.remove('text-green-600', 'text-blue-600', 'hidden');
    } else if (type === 'success') {
        element.classList.add('text-green-600');
        element.classList.remove('text-red-600', 'text-blue-600', 'hidden');
    } else {
        element.classList.add('text-blue-600');
        element.classList.remove('text-red-600', 'text-green-600', 'hidden');
    }
    
    if (!message) {
        element.classList.add('hidden');
    } else if (type === 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.classList.add('hidden');
        }, 5000);
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm transform transition-transform duration-300 translate-x-full`;
    
    if (type === 'success') {
        notification.classList.add('bg-green-500');
    } else if (type === 'error') {
        notification.classList.add('bg-red-500');
    } else {
        notification.classList.add('bg-blue-500');
    }
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

function setButtonLoading(button, isLoading, originalText = null) {
    if (isLoading) {
        button.disabled = true;
        button.classList.add('btn-loading');
        if (originalText) {
            button.dataset.originalText = originalText;
        }
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading');
        button.innerHTML = originalText || button.dataset.originalText || 'Submit';
    }
}

function logout() {
    console.log('🚪 Logging out from superadmin...');
    window.clearStoredAuth();
    window.location.href = '/login';
}

// ==================== ANCHOR NAVIGATION HANDLER ====================

document.addEventListener('DOMContentLoaded', function() {
    // Handle anchor navigation for wallpaper section
    const wallpaperLink = document.querySelector('a[href="#manage-wallpapers"]');
    if (wallpaperLink) {
        wallpaperLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Load wallpapers when the section is accessed
            loadWallpapers();
            updateWallpaperCount();
        });
    }
});

// ==================== DEBUG FUNCTIONS ====================

// ADD THIS FUNCTION - Debug wallpaper functions
function debugWallpapers() {
    console.log('🔧 Debug wallpaper functions:');
    console.log('- closeWallpaperPreview:', typeof closeWallpaperPreview);
    console.log('- previewWallpaperLarge:', typeof previewWallpaperLarge);
    console.log('- deleteWallpaper:', typeof deleteWallpaper);
    console.log('- wallpaperManagement:', wallpaperManagement);
}

function debugWallpaperHTML() {
    console.log('🔍 Searching for wallpaper-related elements in HTML:');
    
    // Check for exact IDs
    const idsToCheck = [
        'uploadWallpaperForm',
        'wallpaperUploadStatus', 
        'wallpaperUploadMessage',
        'wallpapersGrid',
        'wallpaperPreviewContainer',
        'wallpaperPreview',
        'wallpaperCount',
        'wallpaperLimitInfo',
        'wallpapersLoading',
        'noWallpapersMessage',
        'removeWallpaperBtn'
    ];
    
    idsToCheck.forEach(id => {
        const element = document.getElementById(id);
        console.log(`- #${id}:`, element ? 'FOUND' : 'NOT FOUND');
        if (element) {
            console.log('  Classes:', element.className);
            console.log('  Parent:', element.parentElement?.id || element.parentElement?.className);
        }
    });
    
    // Also check for elements with similar names
    const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    const wallpaperIds = allIds.filter(id => id.toLowerCase().includes('wallpaper') || id.toLowerCase().includes('wallpapers'));
    console.log('🔍 All IDs containing "wallpaper":', wallpaperIds);
}

// Call this function temporarily to see what's happening
debugWallpaperHTML();

// ==================== GLOBAL EXPORTS ====================

// Make functions globally available for HTML onclick events
window.logout = logout;
window.setActiveUserForSuperadminPage = setActiveUserForSuperadminPage;
window.initializeSuperadminDashboard = initializeSuperadminDashboard;
window.closeWallpaperPreview = closeWallpaperPreview;
window.previewWallpaperLarge = previewWallpaperLarge;
window.deleteWallpaper = deleteWallpaper;
window.showWallpaperMessage = showWallpaperMessage;
window.loadWallpapers = loadWallpapers;
window.updateWallpaperCount = updateWallpaperCount;
window.initializeWallpaperManagement = initializeWallpaperManagement;
window.debugWallpapers = debugWallpapers;
window.debugWallpaperHTML = debugWallpaperHTML;