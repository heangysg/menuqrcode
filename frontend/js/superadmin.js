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

    // Product Management Elements
    const createProductForm = document.getElementById('createProductForm');
    const createProductMessage = document.getElementById('createProductMessage');
    const productListTableBody = document.getElementById('productList');

    // Category Management Elements
    const createCategoryForm = document.getElementById('createCategoryForm');
    const createCategoryMessage = document.getElementById('createCategoryMessage');
    const categoryListTableBody = document.getElementById('categoryList');

    // Edit Product Modal Elements
    const editProductModal = document.getElementById('editProductModal');
    const editProductForm = document.getElementById('editProductForm');
    const editProductId = document.getElementById('editProductId');
    const editProductTitle = document.getElementById('editProductTitle');
    const editProductDescription = document.getElementById('editProductDescription');
    const editProductPrice = document.getElementById('editProductPrice');
    const editProductCategory = document.getElementById('editProductCategory');
    const editProductImageUrl = document.getElementById('editProductImageUrl');
    const editProductIsAvailable = document.getElementById('editProductIsAvailable');
    const editProductCurrentImage = document.getElementById('editProductCurrentImage');
    const editProductMessage = document.getElementById('editProductMessage');
    const cancelEditProductBtn = document.getElementById('cancelEditProductBtn');
    const removeImageCheckbox = document.getElementById('removeImageCheckbox');

    // Edit Category Modal Elements
    const editCategoryModal = document.getElementById('editCategoryModal');
    const editCategoryForm = document.getElementById('editCategoryForm');
    const editCategoryId = document.getElementById('editCategoryId');
    const editCategoryName = document.getElementById('editCategoryName');
    const editCategoryOrder = document.getElementById('editCategoryOrder');
    const editCategoryMessage = document.getElementById('editCategoryMessage');
    const cancelEditCategoryBtn = document.getElementById('cancelEditCategoryBtn');

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

    // ==================== ADMIN MANAGEMENT FUNCTIONS ====================

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

    // ==================== CATEGORY MANAGEMENT FUNCTIONS ====================

    // Fetch and display categories
    async function fetchCategories() {
        categoryListTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">Loading categories...</td></tr>';
        try {
            // Use superadmin route for categories
            const categories = await apiRequest('/categories/superadmin', 'GET');
            
            // Populate category dropdowns for product forms
            if (editProductCategory && document.getElementById('productCategory')) {
                editProductCategory.innerHTML = '<option value="">Select Category</option>' + categories.map(category => `<option value="${category._id}">${category.name}</option>`).join('');
                document.getElementById('productCategory').innerHTML = '<option value="">Select Category</option>' + categories.map(category => `<option value="${category._id}">${category.name}</option>`).join('');
            }
            
            // Populate category table
            categoryListTableBody.innerHTML = '';
            if (categories.length === 0) {
                categoryListTableBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No categories found.</td></tr>';
                return;
            }
            
            categories.forEach(category => {
                const row = categoryListTableBody.insertRow();
                row.innerHTML = `
                    <td class="py-2 px-4 border-b border-gray-200">${category.name}</td>
                    <td class="py-2 px-4 border-b border-gray-200">${category.order || 0}</td>
                    <td class="py-2 px-4 border-b border-gray-200">
                        <button data-id="${category._id}" data-name="${category.name}" data-order="${category.order || 0}" class="edit-category-btn bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-2 rounded mr-2 transition duration-300">Edit</button>
                        <button data-id="${category._id}" class="delete-category-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded transition duration-300">Delete</button>
                    </td>
                `;
            });
            
            // Add event listeners for category buttons
            document.querySelectorAll('.edit-category-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const categoryId = e.target.dataset.id;
                    const name = e.target.dataset.name;
                    const order = e.target.dataset.order;
                    editCategoryId.value = categoryId;
                    editCategoryName.value = name;
                    editCategoryOrder.value = order;
                    editCategoryModal.classList.remove('hidden');
                });
            });
            
            document.querySelectorAll('.delete-category-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const categoryId = e.target.dataset.id;
                    if (confirm('Are you sure you want to delete this category?')) {
                        deleteCategory(categoryId);
                    }
                });
            });
            
        } catch (error) {
            console.error('Error fetching categories:', error);
            categoryListTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-red-500">Failed to load categories: ${error.message}</td></tr>`;
        }
    }

    // Handle Create Category Form
    if (createCategoryForm) {
        createCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('categoryName').value;
            const order = document.getElementById('categoryOrder').value || 0;

            if (!name) {
                displayMessage(createCategoryMessage, 'Please enter a category name.', true);
                return;
            }

            try {
                // Use superadmin route for category creation
                await apiRequest('/categories/superadmin', 'POST', { name, order });
                
                displayMessage(createCategoryMessage, 'Category created successfully!', false);
                createCategoryForm.reset();
                document.getElementById('categoryOrder').value = 0;
                fetchCategories(); // Refresh category list
            } catch (error) {
                displayMessage(createCategoryMessage, `Error creating category: ${error.message}`, true);
            }
        });
    }

    // Open Edit Category Modal
    function openEditCategoryModal(id, name, order) {
        editCategoryId.value = id;
        editCategoryName.value = name;
        editCategoryOrder.value = order;
        displayMessage(editCategoryMessage, '', false);
        editCategoryMessage.classList.add('hidden');
        editCategoryModal.classList.remove('hidden');
    }

    // Close Edit Category Modal
    if (cancelEditCategoryBtn) {
        cancelEditCategoryBtn.addEventListener('click', () => {
            editCategoryModal.classList.add('hidden');
        });
    }

    // Handle Edit Category Form
    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = editCategoryId.value;
            const name = editCategoryName.value;
            const order = editCategoryOrder.value || 0;

            if (!name) {
                displayMessage(editCategoryMessage, 'Please enter a category name.', true);
                return;
            }

            try {
                // Use superadmin route for category update
                await apiRequest(`/categories/superadmin/${id}`, 'PUT', { name, order });
                displayMessage(editCategoryMessage, 'Category updated successfully!', false);
                
                setTimeout(() => {
                    editCategoryModal.classList.add('hidden');
                    fetchCategories(); // Refresh category list
                }, 1000);
                
            } catch (error) {
                displayMessage(editCategoryMessage, `Error updating category: ${error.message}`, true);
            }
        });
    }

    // Delete Category
    async function deleteCategory(categoryId) {
        try {
            // Use superadmin route for category deletion
            await apiRequest(`/categories/superadmin/${categoryId}`, 'DELETE');
            displayMessage(createCategoryMessage, 'Category deleted successfully!', false);
            fetchCategories(); // Refresh category list
        } catch (error) {
            displayMessage(createCategoryMessage, `Error deleting category: ${error.message}`, true);
        }
    }

    // ==================== PRODUCT MANAGEMENT FUNCTIONS ====================

    // Fetch and display products
    async function fetchProducts() {
        productListTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">Loading products...</td></tr>';
        try {
            // Use superadmin route for products
            const products = await apiRequest('/products/superadmin', 'GET');
            
            productListTableBody.innerHTML = '';
            if (products.length === 0) {
                productListTableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No products found.</td></tr>';
                return;
            }
            
            products.forEach(product => {
                const price = product.price !== undefined && product.price !== '' ? product.price : 'N/A';
                const status = product.isAvailable ? 
                    '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Available</span>' :
                    '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">Unavailable</span>';
                
                const row = productListTableBody.insertRow();
                row.innerHTML = `
                    <td class="py-2 px-4 border-b border-gray-200">
                        ${product.image || product.imageUrl ? `<img src="${product.image || product.imageUrl}" alt="${product.title}" class="w-12 h-12 object-cover rounded">` : 'No Image'}
                    </td>
                    <td class="py-2 px-4 border-b border-gray-200 font-medium">${product.title}</td>
                    <td class="py-2 px-4 border-b border-gray-200">${price}</td>
                    <td class="py-2 px-4 border-b border-gray-200">${product.category?.name || 'Uncategorized'}</td>
                    <td class="py-2 px-4 border-b border-gray-200">${status}</td>
                    <td class="py-2 px-4 border-b border-gray-200">
                        <button data-id="${product._id}" class="edit-product-btn bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-2 rounded mr-2 transition duration-300">Edit</button>
                        <button data-id="${product._id}" class="delete-product-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded transition duration-300">Delete</button>
                    </td>
                `;
            });
            
            // Add event listeners for product buttons
            document.querySelectorAll('.edit-product-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.target.dataset.id;
                    openEditProductModal(productId);
                });
            });
            
            document.querySelectorAll('.delete-product-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.target.dataset.id;
                    if (confirm('Are you sure you want to delete this product?')) {
                        deleteProduct(productId);
                    }
                });
            });
            
        } catch (error) {
            console.error('Error fetching products:', error);
            productListTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-500">Failed to load products: ${error.message}</td></tr>`;
        }
    }

    // Open Edit Product Modal
// In superadmin.js - Update the openEditProductModal function
async function openEditProductModal(productId) {
    try {
        // Use superadmin route to get product
        const product = await apiRequest(`/products/superadmin/${productId}`, 'GET');
        
        editProductId.value = product._id;
        editProductTitle.value = product.title;
        editProductDescription.value = product.description || '';
        editProductPrice.value = product.price || '';
        editProductImageUrl.value = product.imageUrl || '';
        editProductIsAvailable.checked = product.isAvailable;
        if (removeImageCheckbox) removeImageCheckbox.checked = false;
        
        // Set category
        if (editProductCategory) {
            editProductCategory.value = product.category?._id || '';
        }
        
        // Show current image
        const currentImageUrl = product.image || product.imageUrl;
        if (currentImageUrl && editProductCurrentImage) {
            editProductCurrentImage.src = currentImageUrl;
            editProductCurrentImage.classList.remove('hidden');
        } else if (editProductCurrentImage) {
            editProductCurrentImage.classList.add('hidden');
        }
        
        displayMessage(editProductMessage, '', false);
        editProductMessage.classList.add('hidden');
        editProductModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error fetching product for edit:', error);
        alert('Error loading product details: ' + error.message);
    }
}

    // Close Edit Product Modal
    if (cancelEditProductBtn) {
        cancelEditProductBtn.addEventListener('click', () => {
            editProductModal.classList.add('hidden');
        });
    }

// In superadmin.js - Update the edit product function
if (editProductForm) {
    editProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productId = editProductId.value;
        const formData = new FormData();
        
        formData.append('title', editProductTitle.value);
        formData.append('description', editProductDescription.value);
        formData.append('price', editProductPrice.value);
        formData.append('category', editProductCategory.value);
        formData.append('imageUrl', editProductImageUrl.value);
        formData.append('isAvailable', editProductIsAvailable.checked);
        
        if (removeImageCheckbox && removeImageCheckbox.checked) {
            formData.append('removeImage', 'true');
        }
        
        const imageFile = document.getElementById('editProductImage') ? document.getElementById('editProductImage').files[0] : null;
        if (imageFile) {
            formData.append('image', imageFile);
        }
        
        try {
            // Use superadmin route for product update
            await apiRequest(`/products/superadmin/${productId}`, 'PUT', formData, true, true);
            displayMessage(editProductMessage, 'Product updated successfully!', false);
            
            setTimeout(() => {
                editProductModal.classList.add('hidden');
                fetchProducts(); // Refresh product list
            }, 1000);
            
        } catch (error) {
            displayMessage(editProductMessage, `Error updating product: ${error.message}`, true);
        }
    });
}

// Update delete product function
async function deleteProduct(productId) {
    try {
        // Use superadmin route for product deletion
        await apiRequest(`/products/superadmin/${productId}`, 'DELETE');
        displayMessage(createProductMessage, 'Product deleted successfully!', false);
        fetchProducts(); // Refresh the list
    } catch (error) {
        displayMessage(createProductMessage, `Error deleting product: ${error.message}`, true);
    }
}

    // Handle Create Product Form
    if (createProductForm) {
        createProductForm.addEventListener('submit', async (e) => {
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
            
            try {
                // Use superadmin route for product creation
                await apiRequest('/products/superadmin', 'POST', formData, true, true);
                displayMessage(createProductMessage, 'Product created successfully!', false);
                createProductForm.reset();
                fetchProducts(); // Refresh product list
            } catch (error) {
                displayMessage(createProductMessage, `Error creating product: ${error.message}`, true);
            }
        });
    }

    // ==================== INITIALIZATION ====================

    // Initialize everything when page loads
    async function initialize() {
        await fetchAdmins();
        await fetchCategories();
        await fetchProducts();
    }

    // Start the initialization
    initialize();
});