// qr-digital-menu-system/frontend/js/admin.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authentication Check
    // Ensure the user is authenticated and is an admin
    if (!window.checkAuthAndRedirect('admin')) {
        return; // Redirect handled by auth.js if not authenticated or wrong role
    }

    // --- DOM Element References ---
    // Mobile Menu
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const sidebar = document.getElementById('sidebar');

    // Dashboard Overview
    const totalProductsCount = document.getElementById('totalProductsCount');
    const totalCategoriesCount = document.getElementById('totalCategoriesCount');
    const categoryProductCountsList = document.getElementById('categoryProductCountsList');

    // Store Management
    const storeForm = document.getElementById('storeForm');
    const storeNameInput = document.getElementById('storeName');
    const storeAddressInput = document.getElementById('storeAddress');
    const storePhoneInput = document.getElementById('storePhone');
    const storeDescriptionInput = document.getElementById('storeDescription');
    const storeFacebookInput = document.getElementById('storeFacebook');
    const storeTelegramInput = document.getElementById('storeTelegram');
    const storeTikTokInput = document.getElementById('storeTikTok');
    const storeWebsiteInput = document.getElementById('storeWebsite');
    const storeLogoInput = document.getElementById('storeLogo');
    const currentLogoImg = document.getElementById('currentLogo');
    const removeLogoContainer = document.getElementById('removeLogoContainer');
    const removeStoreLogoCheckbox = document.getElementById('removeStoreLogo');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const downloadQrBtn = document.getElementById('downloadQrBtn');
    const publicMenuLinkInput = document.getElementById('publicMenuLink');
    const copyMenuLinkBtn = document.getElementById('copyMenuLinkBtn');
    const copyMessage = document.getElementById('copyMessage');

    // Category Management
    const categoryForm = document.getElementById('categoryForm');
    const categoryNameInput = document.getElementById('categoryName');
    const categoryListTableBody = document.getElementById('categoryList');
    const editCategoryModal = document.getElementById('editCategoryModal');
    const editCategoryForm = document.getElementById('editCategoryForm');
    const editCategoryIdInput = document.getElementById('editCategoryId');
    const editCategoryNameInput = document.getElementById('editCategoryName');
    const cancelEditCategoryBtn = document.getElementById('cancelEditCategoryBtn');

    // Product Management
    const productForm = document.getElementById('productForm');
    const productNameInput = document.getElementById('productName');
    const productCategorySelect = document.getElementById('productCategory');
    const productDescriptionInput = document.getElementById('productDescription');
    const productPriceInput = document.getElementById('productPrice');
    const productImageInput = document.getElementById('productImage');
    const newProductImagePreview = document.getElementById('newProductImagePreview');
    const productListTableBody = document.getElementById('productListTableBody');
    const productFilterCategorySelect = document.getElementById('productFilterCategory');
    const productSearchInput = document.getElementById('productSearchInput');
    const editProductModal = document.getElementById('editProductModal');
    const editProductForm = document.getElementById('editProductForm');
    const editProductIdInput = document.getElementById('editProductId');
    const editProductNameInput = document.getElementById('editProductName');
    const editProductCategorySelect = document.getElementById('editProductCategory');
    const editProductDescriptionInput = document.getElementById('editProductDescription');
    const editProductPriceInput = document.getElementById('editProductPrice');
    const editProductImageInput = document.getElementById('editProductImage');
    const currentProductImageImg = document.getElementById('currentProductImage');
    const cancelEditProductBtn = document.getElementById('cancelEditProductBtn');

    // Product Image Popup Modal (for admin page)
    const productImagePopupModal = document.getElementById('productImagePopupModal');
    const popupProductImage = document.getElementById('popupProductImage');
    const popupProductTitle = document.getElementById('popupProductTitle');
    const popupProductDescriptionDetail = document.getElementById('popupProductDescriptionDetail');
    const popupProductPriceDetail = document.getElementById('popupProductPriceDetail');
    const closeProductImagePopupBtn = document.getElementById('closeProductImagePopupBtn');

    // Custom Message/Confirmation Modal References
    const customMessageModal = document.getElementById('customMessageModal');
    const customMessageTitle = document.getElementById('customMessageTitle');
    const customMessageBody = document.getElementById('customMessageBody');
    const customMessageButtons = document.getElementById('customMessageButtons');


    let currentStore = null;

    // --- Utility Functions ---

    /**
     * Displays a custom message modal.
     * @param {string} title - The title of the message.
     * @param {string} message - The body of the message.
     * @param {boolean} isError - True if it's an error message.
     * @param {string} okButtonText - Text for the OK button.
     */
    function showMessageModal(title, message, isError = false, okButtonText = 'OK') {
        customMessageTitle.textContent = title;
        customMessageBody.textContent = message;
        customMessageButtons.innerHTML = ''; // Clear previous buttons

        const okBtn = document.createElement('button');
        okBtn.textContent = okButtonText;
        okBtn.classList.add('modal-button', 'ok-btn');
        okBtn.addEventListener('click', () => {
            customMessageModal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scroll
        });
        customMessageButtons.appendChild(okBtn);

        customMessageModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    }

    /**
     * Displays a custom confirmation modal.
     * @param {string} title - The title of the confirmation.
     * @param {string} message - The confirmation question.
     * @param {function} onConfirm - Callback function to execute if 'Yes' is clicked.
     * @param {function} onCancel - Callback function to execute if 'No' is clicked (optional).
     * @param {string} confirmButtonText - Text for the confirm button.
     * @param {string} cancelButtonText - Text for the cancel button.
     */
    function showConfirmationModal(title, message, onConfirm, onCancel = () => {}, confirmButtonText = 'Yes', cancelButtonText = 'No') {
        customMessageTitle.textContent = title;
        customMessageBody.textContent = message;
        customMessageButtons.innerHTML = ''; // Clear previous buttons

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelButtonText;
        cancelBtn.classList.add('modal-button', 'cancel-btn');
        cancelBtn.addEventListener('click', () => {
            customMessageModal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scroll
            onCancel(); // Execute cancel callback
        });
        customMessageButtons.appendChild(cancelBtn);

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = confirmButtonText;
        confirmBtn.classList.add('modal-button', 'confirm-btn');
        confirmBtn.addEventListener('click', () => {
            customMessageModal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scroll
            onConfirm(); // Execute confirm callback
        });
        customMessageButtons.appendChild(confirmBtn);

        customMessageModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    }


    // --- Mobile Menu Toggle ---
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            // Toggle 'hidden' class on sidebar for mobile view
            sidebar.classList.toggle('hidden');
            // Adjust body overflow to prevent scrolling when sidebar is open
            if (sidebar.classList.contains('hidden')) {
                document.body.style.overflow = '';
            } else {
                document.body.style.overflow = 'hidden';
            }
        });
        // Close sidebar when a navigation link is clicked on mobile
        sidebar.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024) { // Only close on smaller screens
                    sidebar.classList.add('hidden');
                    document.body.style.overflow = ''; // Restore scroll
                }
            });
        });
    }

    // --- Dashboard Overview Functions ---
    async function updateDashboardOverview() {
        try {
            const products = await apiRequest('/products/my-store', 'GET');
            const categories = await apiRequest('/categories/my-store', 'GET');

            totalProductsCount.textContent = products.length;
            totalCategoriesCount.textContent = categories.length;

            // Calculate and display products per category
            const categoryCounts = {};
            categories.forEach(cat => {
                categoryCounts[cat._id] = { name: cat.name, count: 0 };
            });

            products.forEach(product => {
                if (product.category && categoryCounts[product.category._id]) {
                    categoryCounts[product.category._id].count++;
                }
            });

            categoryProductCountsList.innerHTML = ''; // Clear previous list items
            if (categories.length === 0) {
                categoryProductCountsList.innerHTML = '<li class="text-gray-200">No categories added yet.</li>';
            } else {
                // Sort categories by name for consistent display
                categories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
                    const li = document.createElement('li');
                    li.classList.add('flex', 'justify-between', 'items-center', 'py-1');
                    li.innerHTML = `
                        <span>${categoryCounts[cat._id].name}:</span>
                        <span class="font-bold">${categoryCounts[cat._id].count}</span>
                    `;
                    categoryProductCountsList.appendChild(li);
                });
            }

        } catch (error) {
            console.error('Error fetching dashboard overview:', error.message);
            totalProductsCount.textContent = 'N/A';
            totalCategoriesCount.textContent = 'N/A';
            categoryProductCountsList.innerHTML = '<li class="text-red-200">Failed to load counts.</li>'; // Display error for counts
        }
    }


    // --- Store Management Functions ---

    async function fetchStoreDetails() {
        clearMessage(copyMessage); // Keep this for the copy link message
        try {
            currentStore = await apiRequest('/stores/my-store', 'GET');
            storeNameInput.value = currentStore.name;
            storeAddressInput.value = currentStore.address || '';
            storePhoneInput.value = currentStore.phone || '';
            storeDescriptionInput.value = currentStore.description || '';
            storeFacebookInput.value = currentStore.facebookUrl || '';
            storeTelegramInput.value = currentStore.telegramUrl || '';
            storeTikTokInput.value = currentStore.tiktokUrl || '';
            storeWebsiteInput.value = currentStore.websiteUrl || '';


            if (currentStore.logo) {
                currentLogoImg.src = currentStore.logo;
                currentLogoImg.style.display = 'block';
                removeLogoContainer.style.display = 'block';
                removeStoreLogoCheckbox.checked = false;
            } else {
                currentLogoImg.src = '';
                currentLogoImg.style.display = 'none';
                removeLogoContainer.style.display = 'none';
                removeStoreLogoCheckbox.checked = false;
            }

            // Generate QR code and display public link using the slug
            if (currentStore.slug) {
                const publicMenuUrl = `${window.location.origin}/menu_display.html?slug=${currentStore.slug}`;
                // Using window.generateQRCode and window.downloadCanvasAsPNG from utils.js
                const qrCanvas = window.generateQRCode(publicMenuUrl, qrCodeContainer, 256);
                if (qrCanvas) {
                    downloadQrBtn.style.display = 'inline-block';
                    downloadQrBtn.onclick = () => {
                        window.downloadCanvasAsPNG(qrCanvas, `${currentStore.name}_menu_qr.png`);
                    };
                }

                // Display the public menu link
                publicMenuLinkInput.value = publicMenuUrl;
                copyMenuLinkBtn.style.display = 'inline-block';

            } else {
                qrCodeContainer.innerHTML = '<p class="text-gray-500">Save store info to generate QR.</p>';
                downloadQrBtn.style.display = 'none';
                publicMenuLinkInput.value = 'Link will appear here after saving store info.';
                copyMenuLinkBtn.style.display = 'none';
            }

        }
        catch (error) {
            showMessageModal('Error', `Error fetching store details: ${error.message}`, true);
            currentLogoImg.src = '';
            currentLogoImg.style.display = 'none';
            removeLogoContainer.style.display = 'none';
            qrCodeContainer.innerHTML = '<p class="text-gray-500">Failed to load QR code.</p>';
            downloadQrBtn.style.display = 'none';
            publicMenuLinkInput.value = 'Failed to load menu link.';
            copyMenuLinkBtn.style.display = 'none';
        }
    }

    if (storeForm) {
        storeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('name', storeNameInput.value);
            formData.append('address', storeAddressInput.value);
            formData.append('phone', storePhoneInput.value);
            formData.append('description', storeDescriptionInput.value);
            formData.append('facebookUrl', storeFacebookInput.value);
            formData.append('telegramUrl', storeTelegramInput.value);
            formData.append('tiktokUrl', storeTikTokInput.value);
            formData.append('websiteUrl', storeWebsiteInput.value);

            if (storeLogoInput.files[0]) {
                formData.append('logo', storeLogoInput.files[0]);
            } else if (removeStoreLogoCheckbox.checked) {
                formData.append('logo', '');
            }

            try {
                const updatedStore = await apiRequest('/stores/my-store', 'PUT', formData, true, true);
                showMessageModal('Success', 'Store details updated successfully!', false);
                await fetchStoreDetails();
            } catch (error) {
                showMessageModal('Error', `Error updating store: ${error.message}`, true);
            }
        });
    }

    // Copy Menu Link functionality
    if (copyMenuLinkBtn) {
        copyMenuLinkBtn.addEventListener('click', async () => {
            try {
                publicMenuLinkInput.select();
                document.execCommand('copy');
                const tempMessageSpan = document.getElementById('copyMessage');
                if (tempMessageSpan) {
                    tempMessageSpan.textContent = 'Link copied to clipboard!';
                    tempMessageSpan.classList.remove('hidden');
                    tempMessageSpan.classList.add('text-green-600');
                    setTimeout(() => {
                        tempMessageSpan.textContent = '';
                        tempMessageSpan.classList.add('hidden');
                        tempMessageSpan.classList.remove('text-green-600', 'text-red-600');
                    }, 3000);
                }
            }
            catch (err) {
                console.error('Failed to copy text: ', err);
                const tempMessageSpan = document.getElementById('copyMessage');
                if (tempMessageSpan) {
                    tempMessageSpan.textContent = 'Failed to copy link. Please copy manually.';
                    tempMessageSpan.classList.remove('hidden');
                    tempMessageSpan.classList.add('text-red-600');
                    setTimeout(() => {
                        tempMessageSpan.textContent = '';
                        tempMessageSpan.classList.add('hidden');
                        tempMessageSpan.classList.remove('text-green-600', 'text-red-600');
                    }, 3000);
                }
            }
        });
    }


    // --- Category Management Functions ---

    async function fetchCategories() {
        categoryListTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-gray-500">Loading categories...</td></tr>';
        try {
            const categories = await apiRequest('/categories/my-store', 'GET');
            categoryListTableBody.innerHTML = '';

            // Clear all existing options before repopulating
            productCategorySelect.innerHTML = '<option value="">Select a Category</option>';
            editProductCategorySelect.innerHTML = '';
            productFilterCategorySelect.innerHTML = '<option value="all">All Categories</option>'; // Keep this default option

            if (categories.length === 0) {
                categoryListTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-gray-500">No categories added yet.</td></tr>';
                return;
            }

            categories.forEach(category => {
                const row = categoryListTableBody.insertRow();
                row.innerHTML = `
                    <td class="py-2 px-4 border-b border-gray-200">${category.name}</td>
                    <td class="py-2 px-4 border-b border-gray-200">
                        <button data-id="${category._id}" data-name="${category.name}" class="edit-category-btn bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-2 rounded mr-2 transition duration-300">Edit</button>
                        <button data-id="${category._id}" class="delete-category-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded transition duration-300">Delete</button>
                    </td>
                `;

                // Populating the 'Add Product' category select
                const optionAdd = document.createElement('option');
                optionAdd.value = category._id;
                optionAdd.textContent = category.name;
                productCategorySelect.appendChild(optionAdd);

                // Populating the 'Edit Product' category select
                const optionEdit = document.createElement('option');
                optionEdit.value = category._id;
                optionEdit.textContent = category.name;
                editProductCategorySelect.appendChild(optionEdit);

                // Populating the 'Filter by Category' select
                const optionFilter = document.createElement('option');
                optionFilter.value = category._id;
                optionFilter.textContent = category.name;
                productFilterCategorySelect.appendChild(optionFilter);
            });

            // Re-select the previously chosen filter category after repopulating
            const currentFilterValue = productFilterCategorySelect.dataset.currentFilter || 'all';
            productFilterCategorySelect.value = currentFilterValue;


            document.querySelectorAll('.edit-category-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    openEditCategoryModal(e.target.dataset.id, e.target.dataset.name);
                });
            });

            document.querySelectorAll('.delete-category-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const categoryIdToDelete = e.target.dataset.id;
                    showConfirmationModal(
                        'Confirm Deletion',
                        'Are you sure you want to delete this category? Products in this category will become uncategorized.',
                        () => deleteCategory(categoryIdToDelete)
                    );
                });
            });

        } catch (error) {
            showMessageModal('Error', `Error fetching categories: ${error.message}`, true);
            categoryListTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-gray-500">Failed to load categories.</td></tr>';
        }
    }

    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = categoryNameInput.value.trim();
            if (!name) {
                showMessageModal('Input Error', 'Category name cannot be empty.', true);
                return;
            }

            try {
                await apiRequest('/categories', 'POST', { name });
                showMessageModal('Success', 'Category added successfully!', false);
                categoryNameInput.value = '';
                await fetchCategories();
                // When adding/editing categories, re-fetch products with current filter and search term
                await fetchProducts(productFilterCategorySelect.value, productSearchInput.value.trim());
                updateDashboardOverview();
            } catch (error) {
                showMessageModal('Error', `Error adding category: ${error.message}`, true);
            }
        });
    }

    function openEditCategoryModal(id, name) {
        editCategoryIdInput.value = id;
        editCategoryNameInput.value = name;
        editCategoryModal.classList.remove('hidden');
    }

    if (cancelEditCategoryBtn) {
        cancelEditCategoryBtn.addEventListener('click', () => {
            editCategoryModal.classList.add('hidden');
        });
    }

    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = editCategoryIdInput.value;
            const name = editCategoryNameInput.value.trim();
            if (!name) {
                showMessageModal('Input Error', 'Category name cannot be empty.', true);
                return;
            }

            try {
                await apiRequest(`/categories/${id}`, 'PUT', { name });
                showMessageModal('Success', 'Category updated successfully!', false);
                editCategoryModal.classList.add('hidden');
                await fetchCategories();
                // When adding/editing categories, re-fetch products with current filter and search term
                await fetchProducts(productFilterCategorySelect.value, productSearchInput.value.trim());
                updateDashboardOverview();
            } catch (error) {
                showMessageModal('Error', `Error updating category: ${error.message}`, true);
            }
        });
    }

    async function deleteCategory(id) {
        try {
            await apiRequest(`/categories/${id}`, 'DELETE');
            showMessageModal('Success', 'Category deleted successfully!', false);
            await fetchCategories();
            // When deleting categories, re-fetch products with current filter and search term
            await fetchProducts(productFilterCategorySelect.value, productSearchInput.value.trim());
            updateDashboardOverview();
        } catch (error) {
            showMessageModal('Error', `Error deleting category: ${error.message}`, true);
        }
    }

    // --- Product Management Functions ---

    // fetchProducts now accepts both categoryId and searchTerm
    async function fetchProducts(categoryId = 'all', searchTerm = '') {
        productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Loading products...</td></tr>';
        try {
            let url = '/products/my-store';
            const queryParams = new URLSearchParams();

            if (categoryId && categoryId !== 'all') {
                queryParams.append('category', categoryId);
            }
            if (searchTerm) {
                queryParams.append('search', searchTerm); // Use 'search' parameter for backend
            }

            if (queryParams.toString()) {
                url += `?${queryParams.toString()}`;
            }

            console.log('Frontend: Fetching products with URL:', url);

            const products = await apiRequest(url, 'GET');

            console.log('Frontend: Received products for rendering:', products); // IMPORTANT: Check this log!

            productListTableBody.innerHTML = ''; // Clear existing rows

            if (products.length === 0) {
                productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No products found.</td></tr>';
                return;
            }

            products.forEach(product => {
                const row = productListTableBody.insertRow();
                const defaultImage = `https://placehold.co/50x50/e2e8f0/64748b?text=No+Img`;

                row.innerHTML = `
                    <td class="py-2 px-4 border-b border-gray-200">
                        <div class="product-list-image-container cursor-pointer" data-image="${product.image || defaultImage}" data-title="${product.title}" data-description="${product.description || ''}" data-price="${product.price || ''}">
                            <img src="${product.image || defaultImage}" alt="${product.title}" class="product-list-image">
                        </div>
                    </td>
                    <td class="py-2 px-4 border-b border-gray-200">${product.title}</td>
                    <td class="py-2 px-4 border-b border-gray-200">${product.category ? product.category.name : 'Uncategorized'}</td>
                    <td class="py-2 px-4 border-b border-gray-200">${product.price !== undefined && product.price !== null && product.price !== '' ? product.price : 'N/A'}</td>
                    <td class="py-2 px-4 border-b border-gray-200">
                        <button data-id="${product._id}" class="edit-product-btn bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-2 rounded mr-2 transition duration-300">Edit</button>
                        <button data-id="${product._id}" class="delete-product-btn bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-2 rounded transition duration-300">Delete</button>
                    </td>
                `;
            });

            document.querySelectorAll('.edit-product-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const productId = e.target.dataset.id;
                    const product = products.find(p => p._id === productId);
                    if (product) {
                        openEditProductModal(product);
                    }
                });
            });

            document.querySelectorAll('.delete-product-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const productIdToDelete = e.target.dataset.id;
                    showConfirmationModal(
                        'Confirm Deletion',
                        'Are you sure you want to delete this product?',
                        () => deleteProduct(productIdToDelete)
                    );
                });
            });

            document.querySelectorAll('.product-list-image-container').forEach(container => {
                container.addEventListener('click', (e) => {
                    const imageUrl = e.currentTarget.dataset.image;
                    const title = e.currentTarget.dataset.title;
                    const description = e.currentTarget.dataset.description;
                    const price = e.currentTarget.dataset.price;
                    openProductImagePopup(imageUrl, title, description, price);
                });
            });

        } catch (error) {
            showMessageModal('Error', `Error fetching products: ${error.message}`, true);
            productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Failed to load products.</td></tr>';
        }
    }

    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('title', productNameInput.value);
            formData.append('category', productCategorySelect.value);
            formData.append('description', productDescriptionInput.value);
            formData.append('price', productPriceInput.value);

            if (productImageInput.files[0]) {
                formData.append('image', productImageInput.files[0]);
            }

            try {
                await apiRequest('/products', 'POST', formData, true, true);
                showMessageModal('Success', 'Product added successfully!', false);
                productForm.reset();
                productImageInput.value = '';
                newProductImagePreview.src = '';
                newProductImagePreview.classList.add('hidden');
                // Re-fetch products with current filter and search term
                await fetchProducts(productFilterCategorySelect.value, productSearchInput.value.trim());
                updateDashboardOverview();
            } catch (error) {
                showMessageModal('Error', `Error adding product: ${error.message}`, true);
            }
        });
    }

    if (productImageInput) {
        productImageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    newProductImagePreview.src = e.target.result;
                    newProductImagePreview.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                newProductImagePreview.src = '';
                newProductImagePreview.classList.add('hidden');
            }
        });
    }


    function openEditProductModal(product) {
        editProductIdInput.value = product._id;
        editProductNameInput.value = product.title;
        editProductCategorySelect.value = product.category ? product.category._id : '';
        editProductDescriptionInput.value = product.description || '';
        editProductPriceInput.value = product.price !== undefined && product.price !== null ? product.price : '';

        if (product.image) {
            currentProductImageImg.src = product.image;
            currentProductImageImg.style.display = 'block';
        } else {
            currentProductImageImg.src = '';
            currentProductImageImg.style.display = 'none';
        }
        editProductImageInput.value = '';

        editProductModal.classList.remove('hidden');
    }

    if (cancelEditProductBtn) {
        cancelEditProductBtn.addEventListener('click', () => {
            editProductModal.classList.add('hidden');
        });
    }

    if (editProductForm) {
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('title', editProductNameInput.value);
            formData.append('category', editProductCategorySelect.value);
            formData.append('description', editProductDescriptionInput.value);
            formData.append('price', editProductPriceInput.value);

            if (editProductImageInput.files[0]) {
                formData.append('image', editProductImageInput.files[0]);
            } else if (currentProductImageImg.style.display === 'none' && currentProductImageImg.src === '') {
                formData.append('image', '');
            }

            try {
                await apiRequest(`/products/${editProductIdInput.value}`, 'PUT', formData, true, true);
                showMessageModal('Success', 'Product updated successfully!', false);
                editProductModal.classList.add('hidden');
                // Re-fetch products with current filter and search term
                await fetchProducts(productFilterCategorySelect.value, productSearchInput.value.trim());
                updateDashboardOverview();
            } catch (error) {
                showMessageModal('Error', `Error updating product: ${error.message}`, true);
            }
        });
    }

    async function deleteProduct(id) {
        try {
            await apiRequest(`/products/${id}`, 'DELETE');
            showMessageModal('Success', 'Product deleted successfully!', false);
            // Re-fetch products with current filter and search term
            await fetchProducts(productFilterCategorySelect.value, productSearchInput.value.trim());
            updateDashboardOverview();
        } catch (error) {
            showMessageModal('Error', `Error deleting product: ${error.message}`, true);
        }
    }

    // --- Product Image Popup Functions (for admin page) ---
    function openProductImagePopup(imageUrl, title, description, price) {
        popupProductImage.src = imageUrl;
        popupProductTitle.textContent = title;
        popupProductDescriptionDetail.textContent = description || 'No description available.';

        if (price !== undefined && price !== null && price !== '') {
            popupProductPriceDetail.textContent = `Price: ${price}`;
            popupProductPriceDetail.classList.remove('hidden');
        } else {
            popupProductPriceDetail.textContent = '';
            popupProductPriceDetail.classList.add('hidden');
        }

        productImagePopupModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeProductImagePopup() {
        productImagePopupModal.classList.add('hidden');
        popupProductImage.src = '';
        popupProductTitle.textContent = '';
        popupProductDescriptionDetail.textContent = '';
        popupProductPriceDetail.textContent = '';
        popupProductPriceDetail.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (closeProductImagePopupBtn) {
        closeProductImagePopupBtn.addEventListener('click', closeProductImagePopup);
    }
    if (productImagePopupModal) {
        productImagePopupModal.addEventListener('click', (e) => {
            if (e.target === productImagePopupModal) {
                closeProductImagePopup();
            }
        });
    }

    // --- Event listener for product category filter ---
    if (productFilterCategorySelect) {
        productFilterCategorySelect.addEventListener('change', () => {
            const selectedCategoryId = productFilterCategorySelect.value;
            const currentSearchTerm = productSearchInput.value.trim();
            productFilterCategorySelect.dataset.currentFilter = selectedCategoryId;
            console.log('Frontend: Category filter changed to:', selectedCategoryId);
            fetchProducts(selectedCategoryId, currentSearchTerm);
        });
    }

    // Event listener for product search input
    if (productSearchInput) {
        productSearchInput.addEventListener('input', () => {
            const currentSearchTerm = productSearchInput.value.trim();
            const selectedCategoryId = productFilterCategorySelect.value;
            console.log('Frontend: Search term changed to:', currentSearchTerm);
            fetchProducts(selectedCategoryId, currentSearchTerm);
        });
    }


    // --- Initial Data Load on Page Load ---
    (async () => {
        await fetchStoreDetails();
        await fetchCategories();
        // Initial load of products, applying default filter ('all') and empty search term
        await fetchProducts(productFilterCategorySelect.value, productSearchInput.value.trim());
        await updateDashboardOverview();
    })();
});

// A simple utility function for clearing messages that are NOT handled by the new modal
function clearMessage(element) {
    element.textContent = '';
    element.classList.add('hidden');
}
