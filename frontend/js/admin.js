// Optimize Cloudinary images for delivery (auto format, auto quality, max width 600px)
function getOptimizedImageUrl(url) {
    if (!url) return url;
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
        return url.replace("/upload/", "/upload/f_auto,q_auto,w_800/")
    }
    return url;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authentication Check
    if (!window.checkAuthAndRedirect('admin')) {
        return;
    }

    // --- DOM Element References ---
    // Mobile Menu
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const sidebar = document.getElementById('sidebar');

    // Main Content Sections (UPDATED: Separate sections for Add Products and Your Products)
    const dashboardOverviewSection = document.getElementById('dashboard-overview-section');
    const storeManagementSection = document.getElementById('store-management-section');
    const categoryManagementSection = document.getElementById('category-management-section');
    const addProductsSection = document.getElementById('add-products-section'); // NEW
    const yourProductsSection = document.getElementById('your-products-section'); // NEW

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
    const storeBannerInput = document.getElementById('storeBanner');
    const currentBannersPreview = document.getElementById('currentBannersPreview');
    const removeBannerContainer = document.getElementById('removeBannerContainer');
    const removeStoreBannerCheckbox = document.getElementById('removeStoreBanner');
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

    // Product Management (UPDATED: Now separate for Add Products and Your Products)
    const productForm = document.getElementById('productForm');
    const productNameInput = document.getElementById('productName');
    const productCategorySelect = document.getElementById('productCategory');
    const productDescriptionInput = document.getElementById('productDescription');
    const productPriceInput = document.getElementById('productPrice');
    const productImageUrlInput = document.getElementById('productImageUrl');
    const productImageInput = document.getElementById('productImage');
    const newProductImagePreview = document.getElementById('newProductImagePreview');
    
    // Your Products Section
    const productListTableBody = document.getElementById('productListTableBody');
    const productFilterCategorySelect = document.getElementById('productFilterCategory');
    const productSearchInput = document.getElementById('productSearchInput');
    
    // Edit Product Modal (shared between sections)
    const editProductModal = document.getElementById('editProductModal');
    const editProductForm = document.getElementById('editProductForm');
    const editProductIdInput = document.getElementById('editProductId');
    const editProductNameInput = document.getElementById('editProductName');
    const editProductCategorySelect = document.getElementById('editProductCategory');
    const editProductDescriptionInput = document.getElementById('editProductDescription');
    const editProductPriceInput = document.getElementById('editProductPrice');
    const editProductAvailabilityCheckbox = document.getElementById('editProductAvailabilityCheckbox');
    const editProductImageUrlInput = document.getElementById('editProductImageUrl');
    const editProductImageInput = document.getElementById('editProductImage');
    const currentProductImageImg = document.getElementById('currentProductImage');
    const removeProductImageContainer = document.getElementById('removeProductImageContainer');
    const removeProductImageCheckbox = document.getElementById('removeProductImage');
    const cancelEditProductBtn = document.getElementById('cancelEditProductBtn');

    // Product Image Popup Modal
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
    let allProducts = []; // Store all products for filtering

    // --- Utility Functions ---

    // Function to prepend CORS proxy if the URL is external and not already proxied
    function getProxiedImageUrl(url) {
        if (!url) return '';
        if (url.startsWith('https://corsproxy.io/?')) {
            return url;
        }
        const isCloudinary = url.includes('res.cloudinary.com');
        const isPlaceholder = url.includes('placehold.co');
        const isSameOrigin = url.startsWith(window.location.origin);

        if (!isCloudinary && !isPlaceholder && !isSameOrigin) {
            return `https://corsproxy.io/?${encodeURIComponent(url)}`;
        }
        return url;
    }

    /**
     * Displays a custom message modal.
     */
    function showMessageModal(title, message, isError = false, okButtonText = 'OK') {
        customMessageTitle.textContent = title;
        customMessageBody.textContent = message;
        customMessageButtons.innerHTML = '';

        const okBtn = document.createElement('button');
        okBtn.textContent = okButtonText;
        okBtn.classList.add('modal-button', 'ok-btn');
        okBtn.addEventListener('click', () => {
            customMessageModal.classList.add('hidden');
            document.body.style.overflow = '';
        });
        customMessageButtons.appendChild(okBtn);

        customMessageModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Displays a custom confirmation modal.
     */
    function showConfirmationModal(title, message, onConfirm, onCancel = () => {}, confirmButtonText = 'Yes', cancelButtonText = 'No') {
        customMessageTitle.textContent = title;
        customMessageBody.textContent = message;
        customMessageButtons.innerHTML = '';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelButtonText;
        cancelBtn.classList.add('modal-button', 'cancel-btn');
        cancelBtn.addEventListener('click', () => {
            customMessageModal.classList.add('hidden');
            document.body.style.overflow = '';
            onCancel();
        });
        customMessageButtons.appendChild(cancelBtn);

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = confirmButtonText;
        confirmBtn.classList.add('modal-button', 'confirm-btn');
        confirmBtn.addEventListener('click', () => {
            customMessageModal.classList.add('hidden');
            document.body.style.overflow = '';
            onConfirm();
        });
        customMessageButtons.appendChild(confirmBtn);

        customMessageModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    // --- Mobile Menu Toggle ---
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            if (sidebar.classList.contains('hidden')) {
                document.body.style.overflow = '';
            } else {
                document.body.style.overflow = 'hidden';
            }
        });
        sidebar.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 1024) {
                    sidebar.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // --- Section Visibility Management (UPDATED) ---
    const allSections = document.querySelectorAll('main section[id$="-section"]');

    function hideAllSections() {
        allSections.forEach(section => {
            section.classList.add('hidden');
        });
    }

    function showSection(sectionId) {
        hideAllSections();
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            // Scroll to top of the section
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    }

    // Event listeners for sidebar links (UPDATED: Simple section switching)
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSectionId = e.currentTarget.dataset.target;
            showSection(targetSectionId);

            // Update active state for sidebar links
            document.querySelectorAll('.sidebar-link').forEach(innerLink => {
                innerLink.classList.remove('bg-gray-700', 'text-blue-300', 'active:bg-gray-700');
                innerLink.classList.add('hover:bg-gray-700', 'hover:text-blue-300');
            });
            e.currentTarget.classList.add('bg-gray-700', 'text-blue-300');
            e.currentTarget.classList.remove('hover:bg-gray-700', 'hover:text-blue-300');
        });
    });

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

            categoryProductCountsList.innerHTML = '';
            if (categories.length === 0) {
                categoryProductCountsList.innerHTML = '<li class="text-gray-200">No categories added yet.</li>';
            } else {
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
            categoryProductCountsList.innerHTML = '<li class="text-red-200">Failed to load counts.</li>';
        }
    }

    // --- Store Management Functions ---
    async function fetchStoreDetails() {
        clearMessage(copyMessage);
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

            currentBannersPreview.innerHTML = '';
            if (Array.isArray(currentStore.banner) && currentStore.banner.length > 0) {
                currentStore.banner.forEach(url => {
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = 'Store Banner';
                    img.classList.add('w-full', 'h-32', 'object-cover', 'rounded-lg', 'shadow-md', 'border', 'border-gray-200', 'p-2');
                    currentBannersPreview.appendChild(img);
                });
                removeBannerContainer.style.display = 'block';
                removeStoreBannerCheckbox.checked = false;
            } else {
                currentBannersPreview.innerHTML = '';
                removeBannerContainer.style.display = 'none';
                removeStoreBannerCheckbox.checked = false;
            }

            if (currentStore.slug) {
                const publicMenuUrl = `${window.location.origin}/menu/${currentStore.slug}`;
                const qrCanvas = window.generateQRCode(publicMenuUrl, qrCodeContainer, 256);
                if (qrCanvas) {
                    downloadQrBtn.style.display = 'inline-block';
                    downloadQrBtn.onclick = () => {
                        window.downloadCanvasAsPNG(qrCanvas, `${currentStore.name}_menu_qr.png`);
                    };
                }

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
            currentBannersPreview.innerHTML = '';
            removeBannerContainer.style.display = 'none';
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
                formData.append('removeLogo', 'true');
            }

            if (storeBannerInput.files.length > 0) {
                for (let i = 0; i < storeBannerInput.files.length; i++) {
                    formData.append('banner', storeBannerInput.files[i]);
                }
            } else if (removeStoreBannerCheckbox.checked) {
                formData.append('removeBanner', 'true');
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
            productFilterCategorySelect.innerHTML = '<option value="all">All Categories</option>';

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
                await fetchProductsForDisplay();
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
                await fetchProductsForDisplay();
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
            await fetchProductsForDisplay();
            updateDashboardOverview();
        } catch (error) {
            showMessageModal('Error', `Error deleting category: ${error.message}`, true);
        }
    }

    // --- Product Management Functions ---

    // Fetch products for display in "Your Products" section
    async function fetchProductsForDisplay(categoryId = 'all', searchTerm = '') {
        productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Loading products...</td></tr>';
        try {
            let url = '/products/my-store';
            const queryParams = new URLSearchParams();

            if (categoryId && categoryId !== 'all') {
                queryParams.append('category', categoryId);
            }
            if (searchTerm) {
                queryParams.append('search', searchTerm);
            }

            if (queryParams.toString()) {
                url += `?${queryParams.toString()}`;
            }

            console.log('Frontend: Fetching products with URL:', url);
            allProducts = await apiRequest(url, 'GET');
            console.log('Frontend: Received products for rendering:', allProducts);

            renderProductsTable(allProducts);

        } catch (error) {
            showMessageModal('Error', `Error fetching products: ${error.message}`, true);
            productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Failed to load products.</td></tr>';
        }
    }

    // Render products table
    function renderProductsTable(products) {
        productListTableBody.innerHTML = '';

        if (products.length === 0) {
            productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">No products found.</td></tr>';
            return;
        }

        products.forEach(product => {
            const row = productListTableBody.insertRow();
            const displayImage =
                (product.imageUrl && product.imageUrl.trim() !== '' ? getProxiedImageUrl(product.imageUrl) : null) ||
                (product.image && product.image.trim() !== '' ? product.image : null) ||
                `https://placehold.co/300x300?text=No+Img`;

            row.innerHTML = `
                <td class="py-2 px-4 border-b border-gray-200">
                    <div class="product-list-image-container cursor-pointer" data-image="${displayImage}" data-title="${product.title}" data-description="${product.description || ''}" data-price="${product.price || ''}">
                        <img src="${displayImage}" alt="${product.title}" class="product-list-image">
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

        // Add event listeners for the newly created buttons
        document.querySelectorAll('.edit-product-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                const product = allProducts.find(p => p._id === productId);
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
    }

    // Add Product Form
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('title', productNameInput.value);
            formData.append('category', productCategorySelect.value);
            formData.append('description', productDescriptionInput.value);
            formData.append('price', productPriceInput.value);
            formData.append('imageUrl', productImageUrlInput.value);

            if (productImageInput.files[0]) {
                formData.append('image', productImageInput.files[0]);
            }

            try {
                await apiRequest('/products', 'POST', formData, true, true);
                showMessageModal('Success', 'Product added successfully!', false);
                productForm.reset();
                productImageInput.value = '';
                productImageUrlInput.value = '';
                newProductImagePreview.src = '';
                newProductImagePreview.classList.add('hidden');
                await fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim());
                updateDashboardOverview();
            } catch (error) {
                showMessageModal('Error', `Error adding product: ${error.message}`, true);
            }
        });
    }

    // Handle preview for file input (for add product form)
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
                productImageUrlInput.value = '';
                newProductImagePreview.onerror = null;
            } else {
                newProductImagePreview.src = '';
                newProductImagePreview.classList.add('hidden');
            }
        });
    }

    // Live preview for Product Image URL input (Add Product Form)
    if (productImageUrlInput) {
        productImageUrlInput.addEventListener('input', () => {
            const url = productImageUrlInput.value.trim();
            if (url) {
                const proxiedUrl = getProxiedImageUrl(url);
                newProductImagePreview.src = proxiedUrl;
                newProductImagePreview.classList.remove('hidden');
                productImageInput.value = '';
                newProductImagePreview.onerror = () => {
                    newProductImagePreview.src = 'https://placehold.co/150x150/e2e8f0/64748b?text=Image+Load+Error';
                    console.error('Failed to load image from URL:', url);
                };
            } else {
                newProductImagePreview.src = '';
                newProductImagePreview.classList.add('hidden');
                newProductImagePreview.onerror = null;
            }
        });
    }

    // Edit Product Modal Functions
    function openEditProductModal(product) {
        editProductIdInput.value = product._id;
        editProductNameInput.value = product.title;
        editProductCategorySelect.value = product.category ? product.category._id : '';
        editProductDescriptionInput.value = product.description || '';
        editProductPriceInput.value = product.price !== undefined && product.price !== null ? product.price : '';
        editProductImageUrlInput.value = product.imageUrl || '';
        editProductAvailabilityCheckbox.checked = product.isAvailable !== false;

        const displayImage =
            (product.imageUrl && product.imageUrl.trim() !== '' ? getProxiedImageUrl(product.imageUrl) : null) ||
            (product.image && product.image.trim() !== '' ? product.image : null) ||
            `https://placehold.co/300x300?text=No+Img`;
        
        if (displayImage) {
            currentProductImageImg.src = displayImage;
            currentProductImageImg.style.display = 'block';
            removeProductImageContainer.style.display = 'block';
        } else {
            currentProductImageImg.src = '';
            currentProductImageImg.style.display = 'none';
            removeProductImageContainer.style.display = 'none';
        }
        
        editProductImageInput.value = '';
        removeProductImageCheckbox.checked = false;

        editProductModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    if (cancelEditProductBtn) {
        cancelEditProductBtn.addEventListener('click', () => {
            editProductModal.classList.add('hidden');
            document.body.style.overflow = '';
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
            formData.append('isAvailable', editProductAvailabilityCheckbox.checked);

            if (editProductImageUrlInput.value.trim() !== '') {
                formData.append('imageUrl', editProductImageUrlInput.value.trim());
            } else if (editProductImageInput.files[0]) {
                formData.append('image', editProductImageInput.files[0]);
            } else if (removeProductImageCheckbox.checked) {
                formData.append('removeImage', 'true');
            }

            try {
                await apiRequest(`/products/${editProductIdInput.value}`, 'PUT', formData, true, true);
                showMessageModal('Success', 'Product updated successfully!', false);
                editProductModal.classList.add('hidden');
                document.body.style.overflow = '';
                await fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim());
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
            await fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim());
            updateDashboardOverview();
        } catch (error) {
            showMessageModal('Error', `Error deleting product: ${error.message}`, true);
        }
    }

    // Event listener for product category filter
    if (productFilterCategorySelect) {
        productFilterCategorySelect.addEventListener('change', () => {
            const selectedCategoryId = productFilterCategorySelect.value;
            const currentSearchTerm = productSearchInput.value.trim();
            productFilterCategorySelect.dataset.currentFilter = selectedCategoryId;
            console.log('Frontend: Category filter changed to:', selectedCategoryId);
            fetchProductsForDisplay(selectedCategoryId, currentSearchTerm);
        });
    }

    // Event listener for product search input
    if (productSearchInput) {
        productSearchInput.addEventListener('input', () => {
            const currentSearchTerm = productSearchInput.value.trim();
            const selectedCategoryId = productFilterCategorySelect.value;
            console.log('Frontend: Search term changed to:', currentSearchTerm);
            fetchProductsForDisplay(selectedCategoryId, currentSearchTerm);
        });
    }

    // --- Product Image Popup Functions ---
    function openProductImagePopup(imageUrl, title, description, price) {
        const displayImageUrl = getProxiedImageUrl(imageUrl);
        popupProductImage.src = displayImageUrl;
        popupProductTitle.textContent = title;
        popupProductDescriptionDetail.textContent = description || '';

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

    // --- Initial Data Load on Page Load ---
    (async () => {
        // Set initial active state for Dashboard Overview
        const initialLink = document.querySelector('.sidebar-link[data-target="dashboard-overview-section"]');
        if (initialLink) {
            initialLink.classList.add('bg-gray-700', 'text-blue-300');
            initialLink.classList.remove('hover:bg-gray-700', 'hover:text-blue-300');
        }

        // Show only the dashboard overview section initially
        showSection('dashboard-overview-section'); 

        await fetchStoreDetails();
        await fetchCategories();
        await fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim());
        await updateDashboardOverview();
    })();
});

// A simple utility function for clearing messages that are NOT handled by the new modal
function clearMessage(element) {
    element.textContent = '';
    element.classList.add('hidden');
}