// qr-digital-menu-system/frontend/js/admin.js

// Optimize Cloudinary images for delivery (auto format, auto quality, max width 600px)
function getOptimizedImageUrl(url) {
    if (!url) return url;
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
        return url.replace("/upload/", "/upload/f_auto,q_auto,w_800/")
    }
    return url;
}

// Global variables
let currentStore = null;
let allProducts = []; // Store all products for filtering
let currentPage = 1; // 🆕 Pagination current page
let productsPerPage = 8; // 🆕 8 products per page

function updatePaginationControls(pagination) {
    console.log('🔄 updatePaginationControls called with:', pagination);
    
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!paginationContainer) {
        console.log('❌ Pagination container not found, creating it...');
        createPaginationContainer();
        return;
    }

    const { page, pages, total } = pagination || {};
    
    console.log(`📄 Page: ${page}, Pages: ${pages}, Total: ${total}`);
    
    if (!page || !pages || pages <= 1) {
        console.log('📄 No pagination needed (only one page)');
        paginationContainer.innerHTML = '';
        return;
    }

    console.log('📄 Generating pagination UI...');
    
    // Generate page numbers HTML
    const pageNumbersHTML = generatePageNumbers(page, pages);
    
    paginationContainer.innerHTML = `
        <div class="flex items-center justify-between mt-6">
            <div class="text-sm text-gray-700">
                Showing ${((page - 1) * productsPerPage) + 1} to ${Math.min(page * productsPerPage, total)} of ${total} products
            </div>
            <div class="flex space-x-2" id="paginationButtons">
                <button data-page="${page - 1}" class="pagination-btn prev-btn px-3 py-1 rounded border ${page <= 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}" ${page <= 1 ? 'disabled' : ''}>
                    Previous
                </button>
                
                ${pageNumbersHTML}
                
                <button data-page="${page + 1}" class="pagination-btn next-btn px-3 py-1 rounded border ${page >= pages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}" ${page >= pages ? 'disabled' : ''}>
                    Next
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners to pagination buttons
    setupPaginationEventListeners();
    
    console.log('✅ Pagination controls updated');
}

// 🆕 New function to handle pagination button clicks
function setupPaginationEventListeners() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;
    
    // Use event delegation for pagination buttons
    paginationContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('pagination-btn') && !e.target.disabled) {
            const newPage = parseInt(e.target.dataset.page);
            if (!isNaN(newPage) && newPage !== currentPage) {
                changePage(newPage);
            }
        }
        
        // Also handle page number buttons
        if (e.target.classList.contains('page-btn') && !e.target.disabled) {
            const newPage = parseInt(e.target.dataset.page);
            if (!isNaN(newPage) && newPage !== currentPage) {
                changePage(newPage);
            }
        }
    });
}

function generatePageNumbers(currentPage, totalPages) {
    let pages = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate range around current page
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis if needed
    if (start > 2) pages.push('...');
    
    // Add pages in range
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
    
    // Add ellipsis if needed
    if (end < totalPages - 1) pages.push('...');
    
    // Always show last page if there's more than one page
    if (totalPages > 1) pages.push(totalPages);
    
    return pages.map(page => {
        if (page === '...') {
            return '<span class="px-2 py-1">...</span>';
        }
        return `
            <button data-page="${page}" class="page-btn px-3 py-1 rounded border ${page === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}">
                ${page}
            </button>
        `;
    }).join('');
}

function changePage(newPage) {
    if (newPage === currentPage) return;
    
    console.log(`🔄 Changing page from ${currentPage} to ${newPage}`);
    
    currentPage = newPage;
    const productFilterCategorySelect = document.getElementById('productFilterCategory');
    const productSearchInput = document.getElementById('productSearchInput');
    
    fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim())
        .then(() => {
            // 🆕 Scroll to TOP of products section (search/filter area)
            const productsSection = document.getElementById('your-products-section');
            if (productsSection) {
                productsSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' // This scrolls to the TOP of the section
                });
            }
        });
}

function createPaginationContainer() {
    const productsSection = document.getElementById('your-products-section');
    if (!productsSection) return;
    
    // Check if pagination container already exists
    let paginationContainer = document.getElementById('paginationContainer');
    
    if (!paginationContainer) {
        // Create pagination container if it doesn't exist
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationContainer';
        paginationContainer.className = 'mt-6';
        
        // Add it after the products table
        const table = productsSection.querySelector('table');
        if (table) {
            table.parentNode.insertBefore(paginationContainer, table.nextSibling);
        } else {
            // Fallback: add to the end of the section
            productsSection.appendChild(paginationContainer);
        }
    }
    
    return paginationContainer;
}

function clearPaginationControls() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
}

// 🆕 Reset to page 1 when filtering or searching
function resetToFirstPage() {
    currentPage = 1;
    clearPaginationControls(); // Also clear the display when resetting
}

// ADD: Improved Telegram Links Management Functions
function initializeTelegramLinks() {
    const container = document.getElementById('telegramLinksContainer');
    const addBtn = document.getElementById('addTelegramLinkBtn');
    
    if (!container || !addBtn) {
        console.log('❌ Telegram links container or add button not found');
        return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Add event listener for add button
    addBtn.addEventListener('click', addTelegramLinkField);
    
    // Load existing Telegram links from currentStore
    if (currentStore && currentStore.telegramLinks && currentStore.telegramLinks.length > 0) {
        console.log('📱 Loading existing Telegram links:', currentStore.telegramLinks);
        currentStore.telegramLinks.forEach(link => {
            addTelegramLinkField(link.name, link.url);
        });
    } else {
        console.log('📱 No existing Telegram links found');
        // Add one empty field by default
        addTelegramLinkField();
    }
}

function addTelegramLinkField(name = '', url = '') {
    const container = document.getElementById('telegramLinksContainer');
    if (!container) return;
    
    // Check if we've reached the maximum (5 links)
    const existingLinks = container.querySelectorAll('.telegram-link-item');
    if (existingLinks.length >= 5) {
        showMessageModal('Limit Reached', 'You can only add up to 5 Telegram links.', true);
        return;
    }
    
    const linkId = Date.now(); // Simple unique ID
    const linkItem = document.createElement('div');
    linkItem.className = 'telegram-link-item';
    linkItem.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div>
                <label class="block text-gray-700 text-sm font-semibold mb-2">Agent Name:</label>
                <input type="text" class="telegram-link-name telegram-link-input" 
                    placeholder="e.g., Sales Agent 1" value="${name}" maxlength="50" required>
                <p class="text-xs text-gray-500 mt-1">Name to display for this agent</p>
            </div>
            <div>
                <label class="block text-gray-700 text-sm font-semibold mb-2">Telegram URL:</label>
                <input type="url" class="telegram-link-url telegram-link-input" 
                    placeholder="https://t.me/username" value="${url}" required>
                <p class="text-xs text-gray-500 mt-1">Full Telegram profile URL (https://t.me/username)</p>
            </div>
        </div>
        <button type="button" class="remove-telegram-link">
            <i class="fas fa-trash mr-1"></i>Remove Link
        </button>
    `;
    
    container.appendChild(linkItem);
    
    // Add event listener for remove button
    const removeBtn = linkItem.querySelector('.remove-telegram-link');
    removeBtn.addEventListener('click', function() {
        linkItem.remove();
        updateAddButtonVisibility();
    });

    updateAddButtonVisibility();
}

function updateAddButtonVisibility() {
    const container = document.getElementById('telegramLinksContainer');
    const addBtn = document.getElementById('addTelegramLinkBtn');
    
    if (!container || !addBtn) return;
    
    const existingLinks = container.querySelectorAll('.telegram-link-item');
    if (existingLinks.length >= 5) {
        addBtn.style.display = 'none';
    } else {
        addBtn.style.display = 'inline-block';
    }
}

function getTelegramLinksData() {
    const container = document.getElementById('telegramLinksContainer');
    if (!container) return [];
    
    const linkItems = container.querySelectorAll('.telegram-link-item');
    const links = [];
    
    linkItems.forEach(item => {
        const nameInput = item.querySelector('.telegram-link-name');
        const urlInput = item.querySelector('.telegram-link-url');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const url = urlInput ? urlInput.value.trim() : '';
        
        // Only include links that have both name and URL
        if (name && url) {
            // Validate URL format
            if (url.startsWith('https://t.me/') || url.startsWith('https://telegram.me/')) {
                links.push({ name, url });
            } else {
                console.warn('Invalid Telegram URL format:', url);
            }
        }
    });
    
    console.log('📱 Collected Telegram links:', links);
    return links;
}

// SIMPLIFIED version - remove the complex multi-user logic
function setActiveUserForAdminPage() {
    try {
        console.log('🔄 Setting active user for admin page...');
        
        // Use the simple auth system - just get the current user
        const userData = window.getStoredUserData ? window.getStoredUserData() : null;
        
        if (!userData) {
            console.log('❌ No user data found');
            return null;
        }
        
        console.log('✅ Active user found:', userData.email, 'Role:', userData.role);
        
        // Update UI with current user info
        const adminNameElement = document.getElementById('adminName');
        if (adminNameElement && userData) {
            if (userData.role === 'superadmin') {
                adminNameElement.innerHTML = `${userData.name} <span class="bg-purple-600 text-white text-xs px-2 py-1 rounded-full ml-2">Superadmin</span>`;
            } else {
                adminNameElement.textContent = userData.name;
            }
        }
        
        return userData;
    } catch (error) {
        console.error('Error setting active user:', error);
        return null;
    }
}

// Wait for authentication to complete
function waitForAuth() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        function checkAuth() {
            attempts++;
            const token = window.getStoredToken ? window.getStoredToken('admin') : null;
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

async function initializeAdminDashboard() {
    console.log('🚀 Starting admin dashboard initialization...');
    
    try {
        // SIMPLIFIED: Just wait for auth, don't try to set active user first
        console.log('🔐 Waiting for authentication...');
        const isAuthenticated = await waitForAuth();
        
        if (!isAuthenticated) {
            console.error('❌ Authentication failed, stopping initialization');
            return;
        }
        
        console.log('✅ Authentication confirmed, loading data...');
        
        // Check current user
        const userData = window.getStoredUserData ? window.getStoredUserData() : null;
        console.log('👤 Current user:', userData ? `${userData.email} (${userData.role})` : 'none');
        
        // Update admin name in header
        updateAdminHeader();
        
        // Load data based on user role
        if (userData && userData.role === 'superadmin') {
            console.log('👑 Superadmin detected - loading admin dashboard with full access');
            await loadSuperadminData();
        } else {
            // Regular admin - load everything
            console.log('👤 Regular admin - loading store data');
            await loadAdminData();
        }
        
        // Initialize event listeners
        initializeEventListeners();
        
        console.log('✅ Admin dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showMessageModal('Error', `Initialization failed: ${error.message}`, true);
    }
}

async function loadAdminData() {
    try {
        await Promise.all([
            fetchStoreDetails(),
            fetchCategories(),
            fetchProductsForDisplay()
        ]);
        
        await updateDashboardOverview();
        
    } catch (error) {
        console.error('Error loading admin data:', error);
        throw error;
    }
}

async function loadSuperadminData() {
    try {
        // Superadmin can access all admin functions
        await Promise.all([
            fetchStoreDetails(),
            fetchCategories(),
            fetchProductsForDisplay()
        ]);
        
        await updateDashboardOverview();
        
        // Show superadmin badge
        const dashboardHeader = document.querySelector('h1');
        if (dashboardHeader) {
            const badge = document.createElement('span');
            badge.className = 'ml-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full';
            badge.textContent = 'Superadmin Mode';
            dashboardHeader.appendChild(badge);
        }
        
    } catch (error) {
        console.error('Error loading superadmin data:', error);
        throw error;
    }
}

function updateAdminHeader() {
    const adminNameElement = document.getElementById('adminName');
    const userData = window.getStoredUserData ? window.getStoredUserData() : null;
    
    if (adminNameElement && userData) {
        if (userData.role === 'superadmin') {
            adminNameElement.innerHTML = `${userData.name} <span class="bg-purple-600 text-white text-xs px-2 py-1 rounded-full ml-2">Superadmin</span>`;
        } else {
            adminNameElement.textContent = userData.name;
        }
    }
}

// --- Store Management Functions ---
async function fetchStoreDetails() {
    const copyMessage = document.getElementById('copyMessage');
    clearMessage(copyMessage);
    try {
        console.log('🏪 Fetching store details...');
        
        // Check current user
        const userData = window.getStoredUserData ? window.getStoredUserData() : null;
        console.log('👤 Fetching store as:', userData ? userData.role : 'unknown');
        
        currentStore = await apiRequest('/stores/my-store', 'GET', null, true);
        
        if (currentStore && currentStore._id) {
            const storeNameInput = document.getElementById('storeName');
            const storeAddressInput = document.getElementById('storeAddress');
            const storePhoneInput = document.getElementById('storePhone');
            const storeDescriptionInput = document.getElementById('storeDescription');
            const storeFacebookInput = document.getElementById('storeFacebook');
            const storeTikTokInput = document.getElementById('storeTikTok');
            const storeWebsiteInput = document.getElementById('storeWebsite');
            const currentLogoImg = document.getElementById('currentLogo');
            const removeLogoContainer = document.getElementById('removeLogoContainer');
            const removeStoreLogoCheckbox = document.getElementById('removeStoreLogo');
            const currentBannersPreview = document.getElementById('currentBannersPreview');
            const removeBannerContainer = document.getElementById('removeBannerContainer');
            const removeStoreBannerCheckbox = document.getElementById('removeStoreBanner');
            const qrCodeContainer = document.getElementById('qrCodeContainer');
            const downloadQrBtn = document.getElementById('downloadQrBtn');
            const publicMenuLinkInput = document.getElementById('publicMenuLink');
            const copyMenuLinkBtn = document.getElementById('copyMenuLinkBtn');

            // Populate store form
            storeNameInput.value = currentStore.name;
            storeAddressInput.value = currentStore.address || '';
            storePhoneInput.value = currentStore.phone || '';
            storeDescriptionInput.value = currentStore.description || '';
            storeFacebookInput.value = currentStore.facebookUrl || '';
            storeTikTokInput.value = currentStore.tiktokUrl || '';
            storeWebsiteInput.value = currentStore.websiteUrl || '';

            // ADD: Initialize Telegram links
            initializeTelegramLinks();

            // Handle logo
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

            // Handle banners
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

            // Handle QR code and menu link
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
            console.log('✅ Store details loaded:', currentStore.name);
            return currentStore;
        } else {
            throw new Error('Invalid store data received');
        }
    } catch (error) {
        console.error('❌ Error fetching store details:', error);
        
        // If it's an auth error, don't throw - let the auth system handle it
        if (error.message.includes('Authentication') || error.message.includes('401')) {
            console.log('🔐 Auth error in store fetch, waiting for redirect...');
            return null;
        }
        
        showMessageModal('Error', `Error fetching store details: ${error.message}`, true);
        const currentLogoImg = document.getElementById('currentLogo');
        const removeLogoContainer = document.getElementById('removeLogoContainer');
        const currentBannersPreview = document.getElementById('currentBannersPreview');
        const removeBannerContainer = document.getElementById('removeBannerContainer');
        const qrCodeContainer = document.getElementById('qrCodeContainer');
        const downloadQrBtn = document.getElementById('downloadQrBtn');
        const publicMenuLinkInput = document.getElementById('publicMenuLink');
        const copyMenuLinkBtn = document.getElementById('copyMenuLinkBtn');

        currentLogoImg.src = '';
        currentLogoImg.style.display = 'none';
        removeLogoContainer.style.display = 'none';
        currentBannersPreview.innerHTML = '';
        removeBannerContainer.style.display = 'none';
        qrCodeContainer.innerHTML = '<p class="text-gray-500">Failed to load QR code.</p>';
        downloadQrBtn.style.display = 'none';
        publicMenuLinkInput.value = 'Failed to load menu link.';
        copyMenuLinkBtn.style.display = 'none';
        return null;
    }
}

// --- Category Management Functions ---
async function fetchCategories() {
    const categoryListTableBody = document.getElementById('categoryList');
    const productCategorySelect = document.getElementById('productCategory');
    const editProductCategorySelect = document.getElementById('editProductCategory');
    const productFilterCategorySelect = document.getElementById('productFilterCategory');

    categoryListTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-gray-500">Loading categories...</td></tr>';
    try {
        console.log('📂 Fetching categories...');
        const categories = await apiRequest('/categories/my-store', 'GET', null, true);

        categoryListTableBody.innerHTML = '';

        // Clear all existing options before repopulating
        productCategorySelect.innerHTML = '<option value="">Select a Category</option>';
        editProductCategorySelect.innerHTML = '';
        productFilterCategorySelect.innerHTML = '<option value="all">All Categories</option>';

        // Enable dropdowns
        productCategorySelect.disabled = false;
        editProductCategorySelect.disabled = false;
        productFilterCategorySelect.disabled = false;

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
                                const categoryName = e.target.closest('tr').querySelector('td:first-child').textContent;
                
                showConfirmationModal(
                    'Confirm Deletion',
                    `Are you sure you want to delete the category "${categoryName}"? Products in this category will become uncategorized.`,
                    () => deleteCategory(categoryIdToDelete)
                );
            });
        });

    } catch (error) {
        console.error('❌ Error fetching categories:', error);
        showMessageModal('Error', `Error fetching categories: ${error.message}`, true);
        categoryListTableBody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-gray-500">Failed to load categories.</td></tr>';
    }
}

function openEditCategoryModal(id, name) {
    const editCategoryModal = document.getElementById('editCategoryModal');
    const editCategoryIdInput = document.getElementById('editCategoryId');
    const editCategoryNameInput = document.getElementById('editCategoryName');

    editCategoryIdInput.value = id;
    editCategoryNameInput.value = name;
    editCategoryModal.classList.remove('hidden');
}

async function deleteCategory(id) {
    try {
        // Send confirmation flag in the request body
        await apiRequest(`/categories/${id}`, 'DELETE', { confirmDelete: true }, true);
        showMessageModal('Success', 'Category deleted successfully!', false);
        await fetchCategories();
        await fetchProductsForDisplay();
        updateDashboardOverview();
    } catch (error) {
        showMessageModal('Error', `Error deleting category: ${error.message}`, true);
    }
}

async function fetchProductsForDisplay(categoryId = 'all', searchTerm = '') {
    const productListTableBody = document.getElementById('productListTableBody');
    const productFilterCategorySelect = document.getElementById('productFilterCategory');
    const productSearchInput = document.getElementById('productSearchInput');

    productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Loading products...</td></tr>';
    try {
        console.log('📦 Fetching products...');
        let url = '/products/my-store';
        const queryParams = new URLSearchParams();

        if (categoryId && categoryId !== 'all') {
            queryParams.append('category', categoryId);
        }
        if (searchTerm) {
            queryParams.append('search', searchTerm);
        }

        // 🆕 Add pagination parameters
        queryParams.append('page', currentPage);
        queryParams.append('limit', productsPerPage);

        if (queryParams.toString()) {
            url += `?${queryParams.toString()}`;
        }

        console.log('Frontend: Fetching products with URL:', url);
        const response = await apiRequest(url, 'GET', null, true);
        
        console.log('🔍 Full API Response:', response);
        
        // 🆕 FIX: Handle the response properly - don't extract just products
        // The response should already contain both products and pagination
        const products = response.products || [];
        const pagination = response.pagination;
        
        console.log('Frontend: Products received:', products.length);
        console.log('Frontend: Pagination data:', pagination);

        renderProductsTable(products);
        
        // 🆕 Update pagination controls with the actual pagination data
        if (pagination) {
            console.log('✅ Updating pagination controls with:', pagination);
            updatePaginationControls(pagination);
        } else {
            console.log('❌ No pagination data received');
            // Fallback: create basic pagination info
            const total = products.length;
            updatePaginationControls({
                page: currentPage,
                limit: productsPerPage,
                total: total,
                pages: Math.ceil(total / productsPerPage)
            });
        }

    } catch (error) {
        console.error('❌ Error fetching products:', error);
        showMessageModal('Error', `Error fetching products: ${error.message}`, true);
        productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Failed to load products.</td></tr>';
        
        // 🆕 Clear pagination on error
        clearPaginationControls();
    }
}

// Render products table
function renderProductsTable(products) {
    const productListTableBody = document.getElementById('productListTableBody');
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

function openEditProductModal(product) {
    const editProductModal = document.getElementById('editProductModal');
    const editProductIdInput = document.getElementById('editProductId');
    const editProductNameInput = document.getElementById('editProductName');
    const editProductCategorySelect = document.getElementById('editProductCategory');
    const editProductDescriptionInput = document.getElementById('editProductDescription');
    const editProductPriceInput = document.getElementById('editProductPrice');
    const editProductAvailabilityCheckbox = document.getElementById('editProductAvailabilityCheckbox');
    const editProductImageUrlInput = document.getElementById('editProductImageUrl');
    const currentProductImageImg = document.getElementById('currentProductImage');
    const removeProductImageContainer = document.getElementById('removeProductImageContainer');
    const removeProductImageCheckbox = document.getElementById('removeProductImage');

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
    
    const editProductImageInput = document.getElementById('editProductImage');
    editProductImageInput.value = '';
    removeProductImageCheckbox.checked = false;

    editProductModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

async function deleteProduct(id) {
    try {
        await apiRequest(`/products/${id}`, 'DELETE', null, true);
        showMessageModal('Success', 'Product deleted successfully!', false);
        const productFilterCategorySelect = document.getElementById('productFilterCategory');
        const productSearchInput = document.getElementById('productSearchInput');
        await fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim());
        updateDashboardOverview();
    } catch (error) {
        showMessageModal('Error', `Error deleting product: ${error.message}`, true);
    }
}

// --- Dashboard Overview Functions ---
async function updateDashboardOverview() {
    try {
        console.log('🔄 Updating dashboard overview...');
        
        const userData = window.getStoredUserData ? window.getStoredUserData() : null;
        
        // Update the UI elements
        const totalProductsCount = document.getElementById('totalProductsCount');
        const totalCategoriesCount = document.getElementById('totalCategoriesCount');
        const categoryProductCountsList = document.getElementById('categoryProductCountsList');

        // Fetch and display actual data
        const productsResponse = await apiRequest('/products/my-store', 'GET', null, true);
        const categoriesResponse = await apiRequest('/categories/my-store', 'GET', null, true);
        
        // Extract products array - handle different response formats
        let products = [];
        if (Array.isArray(productsResponse)) {
            products = productsResponse;
        } else if (productsResponse && Array.isArray(productsResponse.products)) {
            products = productsResponse.products;
        } else if (productsResponse && productsResponse.data) {
            products = productsResponse.data;
        } else {
            products = productsResponse || [];
        }

        // Extract categories array - handle different response formats
        let categories = [];
        if (Array.isArray(categoriesResponse)) {
            categories = categoriesResponse;
        } else if (categoriesResponse && Array.isArray(categoriesResponse.categories)) {
            categories = categoriesResponse.categories;
        } else if (categoriesResponse && categoriesResponse.data) {
            categories = categoriesResponse.data;
        } else {
            categories = categoriesResponse || [];
        }

        console.log('🔍 DEBUG - Final Products Count:', products.length);
        console.log('🔍 DEBUG - Final Categories Count:', categories.length);

        if (totalProductsCount) {
            totalProductsCount.textContent = products.length;
        }
        
        if (totalCategoriesCount) {
            totalCategoriesCount.textContent = categories.length;
        }

        // Calculate and display products per category
        const categoryCounts = {};
        categories.forEach(cat => {
            if (cat && cat._id && cat.name) {
                categoryCounts[cat._id] = { name: cat.name, count: 0 };
            }
        });

        products.forEach(product => {
            if (product.category) {
                const categoryId = product.category._id || product.category;
                if (categoryCounts[categoryId]) {
                    categoryCounts[categoryId].count++;
                }
            }
        });

        if (categoryProductCountsList) {
            categoryProductCountsList.innerHTML = '';
            if (categories.length === 0) {
                categoryProductCountsList.innerHTML = '<li class="text-gray-200">No categories added yet.</li>';
            } else {
                categories.sort((a, b) => a.name.localeCompare(b.name)).forEach(cat => {
                    if (cat && cat._id && cat.name) {
                        const count = categoryCounts[cat._id] ? categoryCounts[cat._id].count : 0;
                        const li = document.createElement('li');
                        li.classList.add('flex', 'justify-between', 'items-center', 'py-1');
                        li.innerHTML = `
                            <span>${cat.name}:</span>
                            <span class="font-bold">${count}</span>
                        `;
                        categoryProductCountsList.appendChild(li);
                    }
                });
            }
        }

        console.log('✅ Dashboard overview updated successfully');

    } catch (error) {
        console.error('❌ Error fetching dashboard overview:', error.message);
        const totalProductsCount = document.getElementById('totalProductsCount');
        const totalCategoriesCount = document.getElementById('totalCategoriesCount');
        const categoryProductCountsList = document.getElementById('categoryProductCountsList');

        if (totalProductsCount) totalProductsCount.textContent = 'N/A';
        if (totalCategoriesCount) totalCategoriesCount.textContent = 'N/A';
        if (categoryProductCountsList) {
            categoryProductCountsList.innerHTML = '<li class="text-red-200">Failed to load counts.</li>';
        }
    }
}

// --- Product Image Popup Functions ---
function openProductImagePopup(imageUrl, title, description, price) {
    const productImagePopupModal = document.getElementById('productImagePopupModal');
    const popupProductImage = document.getElementById('popupProductImage');
    const popupProductTitle = document.getElementById('popupProductTitle');
    const popupProductDescriptionDetail = document.getElementById('popupProductDescriptionDetail');
    const popupProductPriceDetail = document.getElementById('popupProductPriceDetail');

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
    const productImagePopupModal = document.getElementById('productImagePopupModal');
    const popupProductImage = document.getElementById('popupProductImage');
    const popupProductTitle = document.getElementById('popupProductTitle');
    const popupProductDescriptionDetail = document.getElementById('popupProductDescriptionDetail');
    const popupProductPriceDetail = document.getElementById('popupProductPriceDetail');

    productImagePopupModal.classList.add('hidden');
    popupProductImage.src = '';
    popupProductTitle.textContent = '';
    popupProductDescriptionDetail.textContent = '';
    popupProductPriceDetail.textContent = '';
    popupProductPriceDetail.classList.add('hidden');
    document.body.style.overflow = '';
}

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
    const customMessageModal = document.getElementById('customMessageModal');
    const customMessageTitle = document.getElementById('customMessageTitle');
    const customMessageBody = document.getElementById('customMessageBody');
    const customMessageButtons = document.getElementById('customMessageButtons');

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
    const customMessageModal = document.getElementById('customMessageModal');
    const customMessageTitle = document.getElementById('customMessageTitle');
    const customMessageBody = document.getElementById('customMessageBody');
    const customMessageButtons = document.getElementById('customMessageButtons');

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

// A simple utility function for clearing messages that are NOT handled by the new modal
function clearMessage(element) {
    if (element) {
        element.textContent = '';
        element.classList.add('hidden');
    }
}

// Initialize event listeners after auth is confirmed
function initializeEventListeners() {
    console.log('🔧 Initializing event listeners...');
    
    // Check user role
    const userData = window.getStoredUserData ? window.getStoredUserData() : null;
    console.log('👤 Initializing event listeners for:', userData ? userData.role : 'unknown');
    
    // --- Mobile Menu Toggle ---
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const sidebar = document.getElementById('sidebar');

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

    // --- Section Visibility Management ---
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

    // Event listeners for sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSectionId = e.currentTarget.dataset.target;
            
            // Both superadmin and admin can access all sections
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

    // --- Store Management Event Listeners ---
    const storeForm = document.getElementById('storeForm');
    if (storeForm) {
        storeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const storeNameInput = document.getElementById('storeName');
            const storeAddressInput = document.getElementById('storeAddress');
            const storePhoneInput = document.getElementById('storePhone');
            const storeDescriptionInput = document.getElementById('storeDescription');
            const storeFacebookInput = document.getElementById('storeFacebook');
            const storeTikTokInput = document.getElementById('storeTikTok');
            const storeWebsiteInput = document.getElementById('storeWebsite');
            const storeLogoInput = document.getElementById('storeLogo');
            const removeStoreLogoCheckbox = document.getElementById('removeStoreLogo');
            const storeBannerInput = document.getElementById('storeBanner');
            const removeStoreBannerCheckbox = document.getElementById('removeStoreBanner');

            // Add phone validation check
            const phone = storePhoneInput.value.trim();
            
            // Check length
            if (phone && phone.length > 50) {
                showMessageModal('Validation Error', 'Phone number cannot exceed 50 characters.', true);
                return;
            }

            // More permissive phone format validation
            if (phone && !/^[\+]?[0-9\s\-\(\)\.\/]{6,}$/.test(phone)) {
                showMessageModal('Validation Error', 'Please enter a valid phone number (minimum 6 digits). You can use formats like: +85512345678, 012345678, 097 67 67 854, or 123-456-7890', true);
                return;
            }

            const formData = new FormData();
            formData.append('name', storeNameInput.value);
            formData.append('address', storeAddressInput.value);
            formData.append('phone', phone); // Use the validated phone
            formData.append('description', storeDescriptionInput.value);
            formData.append('facebookUrl', storeFacebookInput.value);
            formData.append('tiktokUrl', storeTikTokInput.value);
            formData.append('websiteUrl', storeWebsiteInput.value);
            
            // ADD: Telegram links
            const telegramLinks = getTelegramLinksData();
            formData.append('telegramLinks', JSON.stringify(telegramLinks));

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
    const copyMenuLinkBtn = document.getElementById('copyMenuLinkBtn');
    if (copyMenuLinkBtn) {
        copyMenuLinkBtn.addEventListener('click', async () => {
            const publicMenuLinkInput = document.getElementById('publicMenuLink');
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

    // --- Category Management Event Listeners ---
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryNameInput = document.getElementById('categoryName');
            const name = categoryNameInput.value.trim();
            if (!name) {
                showMessageModal('Input Error', 'Category name cannot be empty.', true);
                return;
            }

            try {
                await apiRequest('/categories', 'POST', { name }, true);
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

    const cancelEditCategoryBtn = document.getElementById('cancelEditCategoryBtn');
    if (cancelEditCategoryBtn) {
        cancelEditCategoryBtn.addEventListener('click', () => {
            const editCategoryModal = document.getElementById('editCategoryModal');
            editCategoryModal.classList.add('hidden');
        });
    }

    const editCategoryForm = document.getElementById('editCategoryForm');
    if (editCategoryForm) {
        editCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editCategoryIdInput = document.getElementById('editCategoryId');
            const editCategoryNameInput = document.getElementById('editCategoryName');
            const id = editCategoryIdInput.value;
            const name = editCategoryNameInput.value.trim();
            if (!name) {
                showMessageModal('Input Error', 'Category name cannot be empty.', true);
                return;
            }

            try {
                await apiRequest(`/categories/${id}`, 'PUT', { name }, true);
                showMessageModal('Success', 'Category updated successfully!', false);
                const editCategoryModal = document.getElementById('editCategoryModal');
                editCategoryModal.classList.add('hidden');
                await fetchCategories();
                await fetchProductsForDisplay();
                updateDashboardOverview();
            } catch (error) {
                showMessageModal('Error', `Error updating category: ${error.message}`, true);
            }
        });
    }

    // --- Product Management Event Listeners ---
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const productNameInput = document.getElementById('productName');
            const productCategorySelect = document.getElementById('productCategory');
            const productDescriptionInput = document.getElementById('productDescription');
            const productPriceInput = document.getElementById('productPrice');
            const productImageUrlInput = document.getElementById('productImageUrl');
            const productImageInput = document.getElementById('productImage');
            const newProductImagePreview = document.getElementById('newProductImagePreview');

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
                const productFilterCategorySelect = document.getElementById('productFilterCategory');
                const productSearchInput = document.getElementById('productSearchInput');
                await fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim());
                updateDashboardOverview();
            } catch (error) {
                showMessageModal('Error', `Error adding product: ${error.message}`, true);
            }
        });
    }

    // Handle preview for file input (for add product form)
    const productImageInput = document.getElementById('productImage');
    if (productImageInput) {
        productImageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            const newProductImagePreview = document.getElementById('newProductImagePreview');
            const productImageUrlInput = document.getElementById('productImageUrl');
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
    const productImageUrlInput = document.getElementById('productImageUrl');
    if (productImageUrlInput) {
        productImageUrlInput.addEventListener('input', () => {
            const url = productImageUrlInput.value.trim();
            const newProductImagePreview = document.getElementById('newProductImagePreview');
            const productImageInput = document.getElementById('productImage');
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

    // Edit Product Modal Event Listeners
    const cancelEditProductBtn = document.getElementById('cancelEditProductBtn');
    if (cancelEditProductBtn) {
        cancelEditProductBtn.addEventListener('click', () => {
            const editProductModal = document.getElementById('editProductModal');
            editProductModal.classList.add('hidden');
            document.body.style.overflow = '';
        });
    }

    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const editProductIdInput = document.getElementById('editProductId');
            const editProductNameInput = document.getElementById('editProductName');
            const editProductCategorySelect = document.getElementById('editProductCategory');
            const editProductDescriptionInput = document.getElementById('editProductDescription');
            const editProductPriceInput = document.getElementById('editProductPrice');
            const editProductAvailabilityCheckbox = document.getElementById('editProductAvailabilityCheckbox');
            const editProductImageUrlInput = document.getElementById('editProductImageUrl');
            const editProductImageInput = document.getElementById('editProductImage');
            const removeProductImageCheckbox = document.getElementById('removeProductImage');

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
                const editProductModal = document.getElementById('editProductModal');
                editProductModal.classList.add('hidden');
                document.body.style.overflow = '';
                const productFilterCategorySelect = document.getElementById('productFilterCategory');
                const productSearchInput = document.getElementById('productSearchInput');
                await fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim());
                updateDashboardOverview();
            } catch (error) {
                showMessageModal('Error', `Error updating product: ${error.message}`, true);
            }
        });
    }

    // Event listener for product category filter
    const productFilterCategorySelect = document.getElementById('productFilterCategory');
    if (productFilterCategorySelect) {
        productFilterCategorySelect.addEventListener('change', () => {
            const selectedCategoryId = productFilterCategorySelect.value;
            const productSearchInput = document.getElementById('productSearchInput');
            const currentSearchTerm = productSearchInput.value.trim();
            productFilterCategorySelect.dataset.currentFilter = selectedCategoryId;
            console.log('Frontend: Category filter changed to:', selectedCategoryId);
            
            // 🆕 Reset to first page when filtering
            resetToFirstPage();
            fetchProductsForDisplay(selectedCategoryId, currentSearchTerm);
        });
    }

    // Event listener for product search input
    const productSearchInput = document.getElementById('productSearchInput');
    if (productSearchInput) {
        productSearchInput.addEventListener('input', () => {
            const currentSearchTerm = productSearchInput.value.trim();
            const productFilterCategorySelect = document.getElementById('productFilterCategory');
            const selectedCategoryId = productFilterCategorySelect.value;
            console.log('Frontend: Search term changed to:', currentSearchTerm);
            
            // 🆕 Reset to first page when searching
            resetToFirstPage();
            fetchProductsForDisplay(selectedCategoryId, currentSearchTerm);
        });
    }

    // Product Image Popup Event Listeners
    const closeProductImagePopupBtn = document.getElementById('closeProductImagePopupBtn');
    if (closeProductImagePopupBtn) {
        closeProductImagePopupBtn.addEventListener('click', closeProductImagePopup);
    }
    const productImagePopupModal = document.getElementById('productImagePopupModal');
    if (productImagePopupModal) {
        productImagePopupModal.addEventListener('click', (e) => {
            if (e.target === productImagePopupModal) {
                closeProductImagePopup();
            }
        });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                console.log('🚪 Logging out from admin...');
                await apiRequest('/auth/logout', 'POST', {}, true);
            } catch (error) {
                console.warn('Logout API call failed:', error.message);
            } finally {
                window.clearStoredAuth();
                window.location.href = '/login';
            }
        });
    }

    // Set initial active state for Dashboard Overview
    const initialLink = document.querySelector('.sidebar-link[data-target="dashboard-overview-section"]');
    if (initialLink) {
        initialLink.classList.add('bg-gray-700', 'text-blue-300');
        initialLink.classList.remove('hover:bg-gray-700', 'hover:text-blue-300');
    }

    // Show only the dashboard overview section initially
    showSection('dashboard-overview-section'); 
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Admin page DOM loaded');
    
    // Wait a bit for auth.js to load, then initialize
    setTimeout(() => {
        if (window.getStoredToken && window.getStoredUserData) {
            initializeAdminDashboard();
        } else {
            console.error('❌ Auth functions not available, retrying...');
            // Retry after a delay
            setTimeout(() => {
                if (window.getStoredToken && window.getStoredUserData) {
                    initializeAdminDashboard();
                } else {
                    console.error('❌ Auth functions still not available, page may not work properly');
                    // Show error to user
                    showMessageModal('Error', 'Authentication system not loaded. Please refresh the page.', true);
                }
            }, 1000);
        }
    }, 300);
});

// Make functions globally available
window.setActiveUserForAdminPage = setActiveUserForAdminPage;
window.initializeAdminDashboard = initializeAdminDashboard;
window.changePage = changePage;
window.resetToFirstPage = resetToFirstPage;

// Temporary test - add this at the bottom of admin.js
console.log('🔧 Testing pagination functions...');
console.log('changePage function exists:', typeof changePage);
console.log('updatePaginationControls function exists:', typeof updatePaginationControls);
console.log('resetToFirstPage function exists:', typeof resetToFirstPage);