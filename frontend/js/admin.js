// qr-digital-menu-system/frontend/js/admin.js
const MAX_PRODUCTS_UPDATE_PERCENT = 0.3; // 30% max

// Optimize Cloudinary images for delivery (use the SAME 600px as uploaded)
function getOptimizedImageUrl(url) {
    if (!url) return url;
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
        return url.replace("/upload/", "/upload/f_auto,q_auto,w_600/") // Change 800 to 600
    }
    return url;
}

// ==================== MOBILE MENU SETUP ====================
function initializeMobileMenu() {
    console.log('📱 Initializing mobile menu...');
    
    const mobileMenuButton = document.getElementById('mobileMenuButton');
    const sidebar = document.getElementById('sidebar');
    
    console.log('Mobile menu elements:', {
        mobileMenuButton: !!mobileMenuButton,
        sidebar: !!sidebar
    });
    
    if (mobileMenuButton && sidebar) {
        console.log('✅ Setting up mobile menu event listeners');
        
        // Remove any existing event listeners first
        const newButton = mobileMenuButton.cloneNode(true);
        mobileMenuButton.parentNode.replaceChild(newButton, mobileMenuButton);
        
        const freshButton = document.getElementById('mobileMenuButton');
        
        freshButton.addEventListener('click', function(e) {
            console.log('🎯 Hamburger clicked!');
            e.stopPropagation(); // Prevent event bubbling
            sidebar.classList.toggle('mobile-open');
            
            if (sidebar.classList.contains('mobile-open')) {
                document.body.style.overflow = 'hidden';
                console.log('📱 Menu opened');
            } else {
                document.body.style.overflow = '';
                console.log('📱 Menu closed');
            }
        });
        
        // Close menu when clicking on links
        const sidebarLinks = sidebar.querySelectorAll('nav a, #logoutBtn');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth < 1024) {
                    sidebar.classList.remove('mobile-open');
                    document.body.style.overflow = '';
                    console.log('📱 Menu closed via link click');
                }
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (window.innerWidth < 1024 && 
                sidebar.classList.contains('mobile-open') &&
                !sidebar.contains(e.target) &&
                e.target !== freshButton && 
                !freshButton.contains(e.target)) {
                sidebar.classList.remove('mobile-open');
                document.body.style.overflow = '';
                console.log('📱 Menu closed via outside click');
            }
        });
        
        // Close menu on window resize to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 1024 && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
                document.body.style.overflow = '';
                console.log('📱 Menu closed via resize to desktop');
            }
        });
        
        console.log('✅ Mobile menu setup complete');
        return true;
    } else {
        console.error('❌ Mobile menu elements not found');
        return false;
    }
}

// Global variables
let currentStore = null;
let allProducts = []; // Store all products for filtering
let currentPage = 1; // 🆕 Pagination current page
let productsPerPage = 8; // 🆕 8 products per page
let currentStoreData = null;
let currentStoreWallpaper = '';
let wallpaperSelection = {};

// ==================== PAGINATION FUNCTIONS ====================

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

// ==================== TELEGRAM LINKS MANAGEMENT ====================

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

// ==================== BANNER PREVIEW FUNCTIONALITY ====================

function initializeBannerPreview() {
    const bannerInput = document.getElementById('storeBanner');
    const currentBannersPreview = document.getElementById('currentBannersPreview');
    const removeStoreBannerCheckbox = document.getElementById('removeStoreBanner');
    const removeBannerContainer = document.getElementById('removeBannerContainer');
    
    if (!bannerInput || !removeStoreBannerCheckbox) return;
    
    console.log('🖼️ Initializing banner preview...');
    
    // Create new preview container for selected files
    const newBannersPreview = document.createElement('div');
    newBannersPreview.id = 'newBannersPreview';
    newBannersPreview.className = 'mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 hidden';
    bannerInput.parentNode.insertBefore(newBannersPreview, currentBannersPreview);
    
    // Remove any existing event listeners first by cloning elements
    const newBannerInput = bannerInput.cloneNode(true);
    bannerInput.parentNode.replaceChild(newBannerInput, bannerInput);
    
    const newRemoveCheckbox = removeStoreBannerCheckbox.cloneNode(true);
    removeStoreBannerCheckbox.parentNode.replaceChild(newRemoveCheckbox, removeStoreBannerCheckbox);
    
    const freshBannerInput = document.getElementById('storeBanner');
    const freshRemoveCheckbox = document.getElementById('removeStoreBanner');
    
    // Store currently selected files
    let currentSelectedFiles = [];
    
    // Event listener for remove banner checkbox - IMMEDIATE VISUAL FEEDBACK
    freshRemoveCheckbox.addEventListener('change', function() {
        console.log('🗑️ Remove banners checkbox changed:', this.checked);
        
        if (this.checked) {
            // When checked, hide current banners and show removal message
            if (currentBannersPreview) {
                currentBannersPreview.innerHTML = `
                    <div class="text-center py-8 text-gray-500 border-2 border-dashed border-red-300 rounded-lg bg-red-50 col-span-3">
                        <i class="fas fa-trash text-3xl mb-2 text-red-300"></i>
                        <p class="text-sm font-medium text-red-600">All banners will be removed</p>
                        <p class="text-xs text-red-500 mt-1">Save changes to confirm banner removal</p>
                    </div>
                `;
            }
            
            // Also hide any new banner previews since we're removing everything
            const newBannersPreview = document.getElementById('newBannersPreview');
            if (newBannersPreview) {
                newBannersPreview.classList.add('hidden');
            }
            
            // Clear any selected files since we're removing all banners
            currentSelectedFiles = [];
            updateFileInput([], freshBannerInput);
            
            console.log('✅ Preview updated: banners marked for removal');
        } else {
            // When unchecked, restore the original banners preview
            if (currentStore && currentStore.banner && currentStore.banner.length > 0) {
                updateCurrentBannersDisplay(currentStore.banner);
            } else {
                updateCurrentBannersDisplay([]);
            }
            console.log('✅ Preview restored: banners no longer marked for removal');
        }
    });
    
    // Event listener for banner file selection
    freshBannerInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        const newBannersPreview = document.getElementById('newBannersPreview');
        
        console.log('📸 Banner files selected:', files.length);
        
        // If remove checkbox is checked, uncheck it when new files are selected
        if (freshRemoveCheckbox.checked) {
            freshRemoveCheckbox.checked = false;
            console.log('🔄 Auto-unchecked remove banner option because new files were selected');
            
            // Restore original banners preview
            if (currentStore && currentStore.banner && currentStore.banner.length > 0) {
                updateCurrentBannersDisplay(currentStore.banner);
            }
        }
        
        // Clear current selection and start fresh with new files
        currentSelectedFiles = [];
        
        // Add new files to current selection (up to 3 total)
        files.forEach(file => {
            if (currentSelectedFiles.length < 3) {
                currentSelectedFiles.push(file);
            }
        });
        
        // Update the file input with the combined files
        updateFileInput(currentSelectedFiles, freshBannerInput);
        
        if (currentSelectedFiles.length > 0) {
            newBannersPreview.classList.remove('hidden');
            
            // Hide current banners preview when selecting new ones
            if (currentBannersPreview) {
                currentBannersPreview.classList.add('hidden');
            }
            
            // Clear and rebuild preview with all current files
            renderNewBannersPreview(currentSelectedFiles, newBannersPreview, currentBannersPreview);
            
            console.log(`✅ Showing preview for ${currentSelectedFiles.length} banners (${3 - currentSelectedFiles.length} slots remaining)`);
        } else {
            newBannersPreview.classList.add('hidden');
            // Show current banners again if no new files
            if (currentBannersPreview && !freshRemoveCheckbox.checked) {
                if (currentStore && currentStore.banner && currentStore.banner.length > 0) {
                    currentBannersPreview.classList.remove('hidden');
                }
            }
        }
    });
    
    console.log('✅ Banner preview initialized');
}

function updateFileInput(files, fileInput) {
    // Create a new DataTransfer to hold the files
    const dataTransfer = new DataTransfer();
    
    // Add each file to the DataTransfer
    files.forEach(file => {
        dataTransfer.items.add(file);
    });
    
    // Update the file input with the new FileList
    fileInput.files = dataTransfer.files;
    
    console.log('📁 Updated file input with', files.length, 'files');
}

function renderNewBannersPreview(files, newBannersPreview, currentBannersPreview) {
    // Clear previous new previews
    newBannersPreview.innerHTML = '';
    
    // Show preview for each selected file
    files.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewDiv = document.createElement('div');
                previewDiv.className = 'banner-preview relative group';
                previewDiv.innerHTML = `
                    <div class="relative overflow-hidden rounded-lg border-2 border-dashed border-blue-300 bg-gray-50 h-32">
                        <img src="${e.target.result}" alt="New Banner ${index + 1}" 
                             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                        <div class="absolute top-2 right-2">
                            <button type="button" class="remove-banner-preview bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center transition duration-200 opacity-0 group-hover:opacity-100"
                                    data-file-index="${index}">
                                ×
                            </button>
                        </div>
                        <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            New ${index + 1}
                        </div>
                        <div class="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded max-w-[80%] truncate">
                            ${file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                        </div>
                    </div>
                `;
                newBannersPreview.appendChild(previewDiv);
                
                // Add remove functionality
                const removeBtn = previewDiv.querySelector('.remove-banner-preview');
                removeBtn.addEventListener('click', function() {
                    const fileIndex = parseInt(this.dataset.fileIndex);
                    removeBannerFromSelection(fileIndex);
                });
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Add banner counter
    const counterDiv = document.createElement('div');
    counterDiv.className = 'col-span-3 text-center text-sm text-gray-600 mt-2';
    counterDiv.innerHTML = `
        <p><strong>${files.length} of 3 banners selected</strong></p>
        ${files.length < 3 ? 
            '<p class="text-xs text-green-600 mt-1">You can add more banners</p>' : 
            '<p class="text-xs text-red-600 mt-1">Maximum 3 banners reached</p>'
        }
    `;
    newBannersPreview.appendChild(counterDiv);
}

function removeBannerFromSelection(fileIndex) {
    const bannerInput = document.getElementById('storeBanner');
    const newBannersPreview = document.getElementById('newBannersPreview');
    const currentBannersPreview = document.getElementById('currentBannersPreview');
    const removeStoreBannerCheckbox = document.getElementById('removeStoreBanner');
    
    // Get current files from input
    const currentFiles = Array.from(bannerInput.files);
    
    // Remove the file at the specified index
    if (fileIndex >= 0 && fileIndex < currentFiles.length) {
        currentFiles.splice(fileIndex, 1);
        
        // Update the file input
        updateFileInput(currentFiles, bannerInput);
        
        // Update the global files array
        currentSelectedFiles = currentFiles;
        
        // Re-render the preview
        if (currentFiles.length > 0) {
            renderNewBannersPreview(currentFiles, newBannersPreview, currentBannersPreview);
        } else {
            newBannersPreview.classList.add('hidden');
            // Show current banners again if no new files and remove is not checked
            if (currentBannersPreview && !removeStoreBannerCheckbox.checked) {
                if (currentStore && currentStore.banner && currentStore.banner.length > 0) {
                    currentBannersPreview.classList.remove('hidden');
                }
            }
        }
        
        console.log(`🗑️ Removed banner at index ${fileIndex}, ${currentFiles.length} banners remaining`);
    }
}

function updateCurrentBannersDisplay(banners) {
    const currentBannersPreview = document.getElementById('currentBannersPreview');
    const removeBannerContainer = document.getElementById('removeBannerContainer');
    const removeStoreBannerCheckbox = document.getElementById('removeStoreBanner');
    
    if (!currentBannersPreview || !removeBannerContainer) return;
    
    currentBannersPreview.innerHTML = '';
    
    console.log('🖼️ Updating banner display with:', banners);
    
    // Make sure remove checkbox is unchecked when displaying banners
    if (removeStoreBannerCheckbox) {
        removeStoreBannerCheckbox.checked = false;
    }
    
    if (Array.isArray(banners) && banners.length > 0) {
        // Show banners in a grid layout
        banners.forEach((url, index) => {
            const bannerDiv = document.createElement('div');
            bannerDiv.className = 'relative group banner-preview';
            bannerDiv.innerHTML = `
                <div class="relative overflow-hidden rounded-lg border-2 border-gray-200 bg-white h-32">
                    <img src="${url}" alt="Current Banner ${index + 1}" 
                         class="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-105">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                    <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                        Banner ${index + 1}
                    </div>
                </div>
            `;
            currentBannersPreview.appendChild(bannerDiv);
        });
        
        // Show remove option ONLY when there are banners
        removeBannerContainer.style.display = 'block';
        
        console.log(`✅ Displaying ${banners.length} current banners`);
        
    } else {
        // No banners - show placeholder and HIDE remove option
        currentBannersPreview.innerHTML = `
            <div class="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 col-span-3">
                <i class="fas fa-image text-3xl mb-2 text-gray-300"></i>
                <p class="text-sm font-medium">No banners uploaded</p>
                <p class="text-xs text-gray-400 mt-1">Upload up to 3 banners to display here</p>
            </div>
        `;
        // Hide the remove container when no banners
        removeBannerContainer.style.display = 'none';
        
        console.log('ℹ️ No banners to display');
    }
}

// ==================== AUTHENTICATION & INITIALIZATION ====================

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

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏪 Admin dashboard loading...');
    
    try {
        // Initialize mobile menu FIRST
        console.log('📱 Initializing mobile menu...');
        initializeMobileMenu();
        
        // Wait for authentication
        await waitForAuth();
        
        // Initialize dashboard
        await initializeAdminDashboard();
        
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        showNotification('Error loading dashboard: ' + error.message, 'error');
    }
});

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
        await initializeWallpaperSelection();
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

// ==================== WALLPAPER MANAGEMENT ====================

async function initializeWallpaperSelection() {
    try {
        console.log('🎨 Initializing wallpaper selection...');
        
        wallpaperSelection = {
            currentContainer: document.getElementById('currentWallpaperContainer'),
            currentPreview: document.getElementById('currentWallpaperPreview'),
            noWallpaperText: document.getElementById('noWallpaperText'),
            loading: document.getElementById('wallpapersLoading'),
            grid: document.getElementById('wallpapersGrid'),
            noWallpapersMessage: document.getElementById('noWallpapersMessage'),
            removeWallpaperBtn: document.getElementById('removeWallpaperBtn')
        };

        // Check if all required elements exist
        if (!wallpaperSelection.currentContainer) {
            console.error('❌ Wallpaper container elements not found');
            return;
        }

        await loadAvailableWallpapers();
        updateCurrentWallpaperDisplay();
        
        console.log('✅ Wallpaper selection initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing wallpaper selection:', error);
    }
}

function updateCurrentWallpaperDisplay() {
    if (!currentStore || !wallpaperSelection.currentContainer) return;
    
    const currentWallpaper = currentStore.wallpaperUrl;
    const removeBtn = wallpaperSelection.removeWallpaperBtn;
    
    console.log('🖼️ Current wallpaper URL:', currentWallpaper);
    
    if (currentWallpaper && currentWallpaper.trim() !== '') {
        if (wallpaperSelection.currentPreview) {
            wallpaperSelection.currentPreview.src = currentWallpaper;
            wallpaperSelection.currentPreview.classList.remove('hidden');
        }
        if (wallpaperSelection.noWallpaperText) {
            wallpaperSelection.noWallpaperText.classList.add('hidden');
        }
        if (removeBtn) {
            removeBtn.classList.remove('hidden');
        }
    } else {
        if (wallpaperSelection.currentPreview) {
            wallpaperSelection.currentPreview.classList.add('hidden');
        }
        if (wallpaperSelection.noWallpaperText) {
            wallpaperSelection.noWallpaperText.classList.remove('hidden');
        }
        if (removeBtn) {
            removeBtn.classList.add('hidden');
        }
    }
}

async function loadAvailableWallpapers() {
    if (!wallpaperSelection.loading || !wallpaperSelection.grid) return;
    
    wallpaperSelection.loading.classList.remove('hidden');
    if (wallpaperSelection.grid) wallpaperSelection.grid.classList.add('hidden');
    if (wallpaperSelection.noWallpapersMessage) wallpaperSelection.noWallpapersMessage.classList.add('hidden');
    
    try {
        console.log('📥 Loading available wallpapers...');
        
        // Debug: Check all possible token sources
        const token = window.getStoredToken ? window.getStoredToken('admin') : null;
        const directToken = localStorage.getItem('adminToken');
        const anyToken = localStorage.getItem('token');
        
        console.log('🔐 Token debug:', {
            getStoredToken: token ? 'EXISTS' : 'NULL',
            localStorageAdmin: directToken ? 'EXISTS' : 'NULL', 
            localStorageAny: anyToken ? 'EXISTS' : 'NULL'
        });
        
        // Use the first available token
        const finalToken = token || directToken || anyToken;
        
        if (!finalToken) {
            throw new Error('No authentication token found. Please log in again.');
        }

        console.log('🔐 Using token for wallpapers:', finalToken.substring(0, 20) + '...');
        
        // Use direct fetch to bypass the api.js token selection issue
        const response = await fetch('/api/wallpapers', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${finalToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const wallpapers = data.wallpapers || data || [];
        
        console.log(`✅ Loaded ${wallpapers.length} wallpapers:`, wallpapers);
        renderWallpapersSelection(wallpapers);
        
    } catch (error) {
        console.error('❌ Error loading available wallpapers:', error);
        
        if (wallpaperSelection.loading) wallpaperSelection.loading.classList.add('hidden');
        if (wallpaperSelection.noWallpapersMessage) {
            wallpaperSelection.noWallpapersMessage.classList.remove('hidden');
            wallpaperSelection.noWallpapersMessage.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p class="text-lg font-semibold">Failed to load wallpapers</p>
                    <p class="text-sm">${error.message}</p>
                    <button onclick="loadAvailableWallpapers()" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-200">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            `;
        }
    }
}

function renderWallpapersSelection(wallpapers) {
    const grid = wallpaperSelection.grid;
    const loading = wallpaperSelection.loading;
    const noWallpapers = wallpaperSelection.noWallpapersMessage;
    
    if (!grid || !loading || !noWallpapers) return;
    
    loading.classList.add('hidden');
    
    if (wallpapers.length === 0) {
        noWallpapers.classList.remove('hidden');
        noWallpapers.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-image text-5xl mb-4 text-gray-300"></i>
                <p class="text-xl font-semibold mb-2">No wallpapers available</p>
                <p class="text-gray-600">Contact superadmin to upload wallpapers</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    grid.classList.remove('hidden');
    
    const currentWallpaperUrl = currentStore ? currentStore.wallpaperUrl : '';
    
    wallpapers.forEach(wallpaper => {
        const isSelected = currentWallpaperUrl === wallpaper.imageUrl;
        
        const card = document.createElement('div');
        card.className = `wallpaper-card bg-white rounded-xl shadow-lg border-2 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${
            isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-300'
        }`;
        card.dataset.wallpaperId = wallpaper._id;
        card.dataset.wallpaperUrl = wallpaper.imageUrl;
        card.dataset.wallpaperName = wallpaper.name;
        
        card.innerHTML = `
            <div class="relative group">
                <img src="${wallpaper.imageUrl}" alt="${wallpaper.name}" 
                     class="wallpaper-image w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300"></div>
                ${isSelected ? `
                    <div class="absolute top-3 right-3 bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                        <i class="fas fa-check mr-1"></i>Selected
                    </div>
                ` : ''}
                <div class="absolute bottom-3 left-3 right-3">
                    <span class="bg-gradient-to-r from-black to-transparent text-white text-sm font-medium px-3 py-1 rounded-full backdrop-blur-sm">
                        ${wallpaper.name}
                    </span>
                </div>
            </div>
            <div class="p-4">
                <div class="flex items-center justify-between mb-3">
                    <p class="text-xs text-gray-500">
                        <i class="fas fa-user mr-1"></i>
                        ${wallpaper.uploadedBy?.name || 'Superadmin'}
                    </p>
                    <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        HD Wallpaper
                    </span>
                </div>
                <div class="flex space-x-2">
                    <button class="preview-wallpaper-btn flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition duration-200 flex items-center justify-center">
                        <i class="fas fa-eye mr-2"></i>Preview
                    </button>
                    <button class="select-wallpaper-btn flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition duration-200 flex items-center justify-center ${isSelected ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${isSelected ? 'disabled' : ''}>
                        <i class="fas fa-check mr-2"></i>${isSelected ? 'Selected' : 'Select'}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    // Add event listeners using event delegation
    setupWallpaperEventListeners();
}

function setupWallpaperEventListeners() {
    const grid = wallpaperSelection.grid;
    if (!grid) return;
    
    // Remove any existing event listeners
    grid.removeEventListener('click', handleWallpaperGridClick);
    
    // Add new event listener
    grid.addEventListener('click', handleWallpaperGridClick);
}

function handleWallpaperGridClick(event) {
    const target = event.target;
    
    // Handle preview button clicks
    if (target.classList.contains('preview-wallpaper-btn') || target.closest('.preview-wallpaper-btn')) {
        const card = target.closest('.wallpaper-card');
        if (card) {
            const imageUrl = card.dataset.wallpaperUrl;
            const name = card.dataset.wallpaperName;
            previewWallpaperInModal(imageUrl, name);
        }
        return;
    }
    
    // Handle select button clicks
    if (target.classList.contains('select-wallpaper-btn') || target.closest('.select-wallpaper-btn')) {
        const card = target.closest('.wallpaper-card');
        if (card) {
            const wallpaperId = card.dataset.wallpaperId;
            const wallpaperUrl = card.dataset.wallpaperUrl;
            const wallpaperName = card.dataset.wallpaperName;
            
            // Check if already selected
            const isSelected = card.querySelector('.select-wallpaper-btn').disabled;
            if (!isSelected) {
                selectWallpaper(wallpaperId, wallpaperUrl, wallpaperName);
            }
        }
        return;
    }
    
    // Handle image clicks for preview
    if (target.classList.contains('wallpaper-image')) {
        const card = target.closest('.wallpaper-card');
        if (card) {
            const imageUrl = card.dataset.wallpaperUrl;
            const name = card.dataset.wallpaperName;
            previewWallpaperInModal(imageUrl, name);
        }
        return;
    }
}

function previewWallpaperInModal(imageUrl, name) {
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
                <button onclick="closeWallpaperPreviewModal()" 
                        class="text-white hover:text-gray-200 text-2xl transition duration-200">
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
                <button onclick="closeWallpaperPreviewModal()" 
                        class="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-xl transition duration-200 flex items-center">
                    <i class="fas fa-times mr-2"></i>Close Preview
                </button>
            </div>
        </div>
    `;
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeWallpaperPreviewModal();
        }
    });
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
}

function closeWallpaperPreviewModal() {
    const modal = document.querySelector('.wallpaper-preview-modal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

async function selectWallpaper(wallpaperId, wallpaperUrl, wallpaperName) {
    try {
        if (!currentStore || !currentStore._id) {
            showMessageModal('Error', 'Store information not loaded. Please refresh the page.', true);
            return;
        }
        
        console.log(`🎨 Selecting wallpaper: ${wallpaperName}`);
        
        const response = await apiRequest(`/stores/${currentStore._id}/wallpaper`, 'PATCH', {
            wallpaperUrl: wallpaperUrl
        }, true);
        
        showMessageModal('Success', `Wallpaper "${wallpaperName}" selected successfully! It will appear on your menu page.`, false);
        
        // Update current store data
        if (currentStore) {
            currentStore.wallpaperUrl = wallpaperUrl;
        }
        
        // Update display
        updateCurrentWallpaperDisplay();
        await loadAvailableWallpapers(); // Refresh to update selection states
        
    } catch (error) {
        console.error('❌ Error selecting wallpaper:', error);
        showMessageModal('Error', `Failed to select wallpaper: ${error.message}`, true);
    }
}

async function removeCurrentWallpaper() {
    try {
        if (!currentStore || !currentStore._id) {
            showMessageModal('Error', 'Store information not loaded. Please refresh the page.', true);
            return;
        }
        
        if (!confirm('Are you sure you want to remove the current wallpaper? The menu page will use the default background.')) {
            return;
        }
        
        console.log('🗑️ Removing current wallpaper');
        
        const response = await apiRequest(`/stores/${currentStore._id}/wallpaper`, 'PATCH', {
            wallpaperUrl: ''
        }, true);
        
        showMessageModal('Success', 'Wallpaper removed successfully! The menu page will now use the default background.', false);
        
        // Update current store data
        if (currentStore) {
            currentStore.wallpaperUrl = '';
        }
        
        // Update display
        updateCurrentWallpaperDisplay();
        await loadAvailableWallpapers(); // Refresh to update selection states
        
    } catch (error) {
        console.error('❌ Error removing wallpaper:', error);
        showMessageModal('Error', `Failed to remove wallpaper: ${error.message}`, true);
    }
}

// ==================== STORE MANAGEMENT ====================

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

            // Handle banners - FIXED VERSION
            if (currentBannersPreview && removeBannerContainer) {
                // Use the enhanced banner display function
                updateCurrentBannersDisplay(currentStore.banner || []);
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

// ==================== CATEGORY MANAGEMENT ====================

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

// ==================== PRODUCT MANAGEMENT ====================

async function fetchProductsForDisplay(categoryId = 'all', searchTerm = '') {
    const productListTableBody = document.getElementById('productListTableBody');
    
    // Check if the table body exists before trying to manipulate it
    if (!productListTableBody) {
        console.error('❌ productListTableBody element not found');
        return;
    }
    
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
        
        // Only update the table body if it exists
        if (productListTableBody) {
            productListTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Failed to load products.</td></tr>';
        }
        
        // 🆕 Clear pagination on error
        clearPaginationControls();
    }
}

function showSection(sectionId) {
    const allSections = document.querySelectorAll('main section[id$="-section"]');
    
    // Hide all sections
    allSections.forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
}

// Render products table
function renderProductsTable(products) {
    const productListTableBody = document.getElementById('productListTableBody');
    
    // Check if the table body exists
    if (!productListTableBody) {
        console.error('❌ productListTableBody element not found in renderProductsTable');
        return;
    }
    
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
                <div class="product-list-image-container cursor-pointer" 
                     data-image="${displayImage}" 
                     data-title="${product.title}" 
                     data-description="${product.description || ''}" 
                     data-price="${product.price || ''}"
                     data-category-id="${product.category ? product.category._id : ''}"
                     data-is-available="${product.isAvailable !== false}">
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

    // Replace the edit button event listener with this:
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const productId = e.target.dataset.id;
            console.log('🔄 Edit button clicked for product:', productId);
            
            // Find the product in the current displayed products
            const row = e.target.closest('tr');
            if (row) {
                const imageContainer = row.querySelector('.product-list-image-container');
                
                // Extract ALL product data from DOM attributes (super fast!)
                const product = {
                    _id: productId,
                    title: imageContainer.dataset.title,
                    category: { 
                        _id: imageContainer.dataset.categoryId,
                        name: row.cells[2].textContent 
                    },
                    description: imageContainer.dataset.description,
                    price: imageContainer.dataset.price,
                    imageUrl: imageContainer.dataset.image,
                    image: imageContainer.dataset.image,
                    isAvailable: imageContainer.dataset.isAvailable === 'true'
                };
                
                console.log('📦 Product data extracted from DOM:', product);
                openEditProductModal(product);
            } else {
                console.error('❌ Could not find product row');
                showMessageModal('Error', 'Could not find product data.', true);
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
    
    // Now we have the exact category ID from data attributes!
    editProductCategorySelect.value = product.category._id || '';
    
    editProductDescriptionInput.value = product.description || '';
    editProductPriceInput.value = product.price !== undefined && product.price !== null ? product.price : '';
    editProductImageUrlInput.value = ''; // Leave it empty
    editProductAvailabilityCheckbox.checked = product.isAvailable;

    const displayImage = product.image || product.imageUrl || `https://placehold.co/300x300?text=No+Img`;
    
    if (displayImage && !displayImage.includes('placehold.co')) {
        currentProductImageImg.src = displayImage;
        currentProductImageImg.style.display = 'block';
        removeProductImageContainer.style.display = 'block';
        
        // Store original image for potential restoration
        currentProductImageImg.dataset.originalImage = displayImage;
    } else {
        currentProductImageImg.src = 'https://placehold.co/300x300?text=No+Image';
        currentProductImageImg.style.display = 'block';
        removeProductImageContainer.style.display = 'none';
    }
    
    const editProductImageInput = document.getElementById('editProductImage');
    editProductImageInput.value = '';
    removeProductImageCheckbox.checked = false;

    editProductModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Initialize image preview handlers
    initializeImagePreviewHandlers();
   
    
    console.log('✅ Edit modal opened instantly with accurate data');
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

// ==================== DASHBOARD OVERVIEW ====================

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

// ==================== UTILITY FUNCTIONS ====================

// 🛡️ SAFETY: Prevent bulk category updates
function safeBulkUpdate(productsToUpdate, allProducts) {
    if (!productsToUpdate.length || !allProducts.length) return true;
    
    const updatePercent = productsToUpdate.length / allProducts.length;
    
    if (updatePercent > MAX_PRODUCTS_UPDATE_PERCENT) {
        alert(`❌ SAFETY: You're updating ${Math.round(updatePercent * 100)}% of products. Maximum allowed is 30%. Please edit products individually.`);
        return false; // STOP
    }
    
    return true; // CONTINUE
}

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

// Product Image Popup Functions
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

// Show notification
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

// Initialize event listeners after auth is confirmed
function initializeEventListeners() {
    console.log('🔧 Initializing event listeners...');
    
    // Check user role
    const userData = window.getStoredUserData ? window.getStoredUserData() : null;
    console.log('👤 Initializing event listeners for:', userData ? userData.role : 'unknown');
    const removeWallpaperBtn = document.getElementById('removeWallpaperBtn');
    if (removeWallpaperBtn) {
        removeWallpaperBtn.addEventListener('click', removeCurrentWallpaper);
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
                
                // Refresh store data
                await fetchStoreDetails();
                
                // Specifically update the current store object and banner display
                currentStore = updatedStore;
                updateCurrentBannersDisplay(updatedStore.banner || []);
                
                console.log('✅ Store updated, banners refreshed:', updatedStore.banner);
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
        // Remove any existing event listeners first to prevent duplicates
        const newProductForm = productForm.cloneNode(true);
        productForm.parentNode.replaceChild(newProductForm, productForm);
        
        // Get fresh reference to the form
        const freshProductForm = document.getElementById('productForm');
        
        freshProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            console.log('🔄 Product form submitted');
            
            // Add a flag to prevent multiple submissions
            if (freshProductForm.dataset.submitting === 'true') {
                console.log('⏳ Form already submitting, ignoring duplicate call');
                return;
            }
            
            // Set submitting flag
            freshProductForm.dataset.submitting = 'true';
            
            // Disable submit button to provide visual feedback
            const submitButton = freshProductForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding Product...';
            submitButton.disabled = true;

            const productNameInput = document.getElementById('productName');
            const productCategorySelect = document.getElementById('productCategory');
            const productDescriptionInput = document.getElementById('productDescription');
            const productPriceInput = document.getElementById('productPrice');
            const productImageUrlInput = document.getElementById('productImageUrl');
            const productImageInput = document.getElementById('productImage');
            const newProductImagePreview = document.getElementById('newProductImagePreview');

            // Validation
            if (!productNameInput.value.trim()) {
                showMessageModal('Input Error', 'Product name is required.', true);
                resetFormState();
                return;
            }

            if (!productCategorySelect.value) {
                showMessageModal('Input Error', 'Please select a category.', true);
                resetFormState();
                return;
            }

            try {
                console.log('📦 Starting product creation process...');
                
                const formData = new FormData();
                formData.append('title', productNameInput.value);
                formData.append('category', productCategorySelect.value);
                formData.append('description', productDescriptionInput.value);
                formData.append('price', productPriceInput.value);
                formData.append('imageUrl', productImageUrlInput.value);

                if (productImageInput.files[0]) {
                    console.log('📸 Image file attached');
                    formData.append('image', productImageInput.files[0]);
                }

                // Make SINGLE API call
                console.log('🚀 Making API request to create product...');
                await apiRequest('/products', 'POST', formData, true, true);
                console.log('✅ Product created successfully');

                showMessageModal('Success', 'Product added successfully!', false);
                freshProductForm.reset();
                productImageInput.value = '';
                productImageUrlInput.value = '';
                newProductImagePreview.src = '';
                newProductImagePreview.classList.add('hidden');
                const productFilterCategorySelect = document.getElementById('productFilterCategory');
                const productSearchInput = document.getElementById('productSearchInput');
                await fetchProductsForDisplay(productFilterCategorySelect.value, productSearchInput.value.trim());
                updateDashboardOverview();
                
                console.log('🎉 Product creation process completed');

            } catch (error) {
                console.error('❌ Error adding product:', error);
                showMessageModal('Error', `Error adding product: ${error.message}`, true);
            } finally {
                // Always reset form state
                resetFormState();
            }

            function resetFormState() {
                // Reset submitting flag
                freshProductForm.dataset.submitting = 'false';
                
                // Re-enable submit button
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }
        });

        console.log('✅ Product form event listener attached (single instance)');
    }

    // Handle preview for file input (for add product form)
    const productImageInput = document.getElementById('productImage');
    if (productImageInput) {
        // Clone and replace to prevent duplicate listeners
        const newProductImageInput = productImageInput.cloneNode(true);
        productImageInput.parentNode.replaceChild(newProductImageInput, productImageInput);
        
        const freshProductImageInput = document.getElementById('productImage');
        
        freshProductImageInput.addEventListener('change', (event) => {
            console.log('📸 Product image file selected');
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
        // Clone and replace to prevent duplicate listeners
        const newProductImageUrlInput = productImageUrlInput.cloneNode(true);
        productImageUrlInput.parentNode.replaceChild(newProductImageUrlInput, productImageUrlInput);
        
        const freshProductImageUrlInput = document.getElementById('productImageUrl');
        
        freshProductImageUrlInput.addEventListener('input', () => {
            console.log('🔗 Product image URL input changed');
            const url = freshProductImageUrlInput.value.trim();
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

            // 🛠️ FIXED: Only send image data if we're actually changing the image
            let imageChanged = false;

            if (editProductImageUrlInput.value.trim() !== '') {
                formData.append('imageUrl', editProductImageUrlInput.value.trim());
                imageChanged = true;
            } else if (editProductImageInput.files[0]) {
                formData.append('image', editProductImageInput.files[0]);
                imageChanged = true;
            } else if (removeProductImageCheckbox.checked) {
                formData.append('removeImage', 'true');
                imageChanged = true;
            }

            // 🆕 DEBUG: Log what's happening with the image
            console.log('🖼️ Image update debug:', {
                hasImageUrl: editProductImageUrlInput.value.trim() !== '',
                hasImageFile: !!editProductImageInput.files[0],
                removeImageChecked: removeProductImageCheckbox.checked,
                imageChanged: imageChanged
            });

            // 🆕 If no image changes, explicitly preserve the current image
            if (!imageChanged) {
                console.log('🛡️ No image changes detected - preserving current image');
                // Don't send any image-related data - backend will keep the current image
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
    initializeBannerPreview();
    initializeImagePreviewHandlers();
}

// Add this function to admin.js
function initializeImagePreviewHandlers() {
    console.log('🖼️ Initializing image preview handlers...');
    
    // Handle "Remove current image" checkbox for edit product form
    const removeProductImageCheckbox = document.getElementById('removeProductImage');
    const currentProductImageImg = document.getElementById('currentProductImage');
    
    if (removeProductImageCheckbox && currentProductImageImg) {
        // Remove any existing event listeners first
        const newCheckbox = removeProductImageCheckbox.cloneNode(true);
        removeProductImageCheckbox.parentNode.replaceChild(newCheckbox, removeProductImageCheckbox);
        
        const freshCheckbox = document.getElementById('removeProductImage');
        
        freshCheckbox.addEventListener('change', function() {
            console.log('🔄 Remove image checkbox changed:', this.checked);
            
            if (this.checked) {
                // Hide the current image preview
                currentProductImageImg.style.display = 'none';
                currentProductImageImg.src = '';
                
                // Also clear any file input or URL input to prevent conflicts
                const editProductImageInput = document.getElementById('editProductImage');
                const editProductImageUrlInput = document.getElementById('editProductImageUrl');
                
                if (editProductImageInput) editProductImageInput.value = '';
                if (editProductImageUrlInput) editProductImageUrlInput.value = '';
                
                console.log('✅ Current image removed from preview');
            } else {
                // If unchecked, try to restore the original image
                // This would need the original image URL stored somewhere
                // For now, just show the placeholder
                currentProductImageImg.style.display = 'block';
                currentProductImageImg.src = 'https://placehold.co/300x300?text=No+Image';
                console.log('🔄 Remove image unchecked');
            }
        });
        
        console.log('✅ Remove image checkbox handler attached');
    }
    
    // Handle new image file selection for preview
    const editProductImageInput = document.getElementById('editProductImage');
    if (editProductImageInput) {
        const newInput = editProductImageInput.cloneNode(true);
        editProductImageInput.parentNode.replaceChild(newInput, editProductImageInput);
        
        const freshInput = document.getElementById('editProductImage');
        
        freshInput.addEventListener('change', function(event) {
            console.log('📸 Edit product image file selected');
            const file = event.target.files[0];
            const currentProductImageImg = document.getElementById('currentProductImage');
            const removeProductImageCheckbox = document.getElementById('removeProductImage');
            
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Show new image preview
                    currentProductImageImg.src = e.target.result;
                    currentProductImageImg.style.display = 'block';
                    
                    // Uncheck "Remove current image" if a new image is selected
                    if (removeProductImageCheckbox) {
                        removeProductImageCheckbox.checked = false;
                    }
                    
                    console.log('✅ New image preview loaded');
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Handle image URL input for preview in edit form
    const editProductImageUrlInput = document.getElementById('editProductImageUrl');
    if (editProductImageUrlInput) {
        const newUrlInput = editProductImageUrlInput.cloneNode(true);
        editProductImageUrlInput.parentNode.replaceChild(newUrlInput, editProductImageUrlInput);
        
        const freshUrlInput = document.getElementById('editProductImageUrl');
        
        freshUrlInput.addEventListener('input', function() {
            console.log('🔗 Edit product image URL input changed');
            const url = this.value.trim();
            const currentProductImageImg = document.getElementById('currentProductImage');
            const removeProductImageCheckbox = document.getElementById('removeProductImage');
            
            if (url) {
                const proxiedUrl = getProxiedImageUrl(url);
                currentProductImageImg.src = proxiedUrl;
                currentProductImageImg.style.display = 'block';
                
                // Uncheck "Remove current image" if a new URL is entered
                if (removeProductImageCheckbox) {
                    removeProductImageCheckbox.checked = false;
                }
                
                currentProductImageImg.onerror = () => {
                    currentProductImageImg.src = 'https://placehold.co/300x300/e2e8f0/64748b?text=Image+Load+Error';
                    console.error('Failed to load image from URL:', url);
                };
                
                console.log('✅ URL image preview loaded');
            }
        });
    }
}

// ==================== GLOBAL EXPORTS ====================

// Make functions globally available
window.setActiveUserForAdminPage = setActiveUserForAdminPage;
window.initializeAdminDashboard = initializeAdminDashboard;
window.changePage = changePage;
window.resetToFirstPage = resetToFirstPage;
window.previewWallpaperInModal = previewWallpaperInModal;
window.closeWallpaperPreviewModal = closeWallpaperPreviewModal;
window.selectWallpaper = selectWallpaper;
window.removeCurrentWallpaper = removeCurrentWallpaper;
window.loadAvailableWallpapers = loadAvailableWallpapers;
window.initializeMobileMenu = initializeMobileMenu;
window.updateCurrentBannersDisplay = updateCurrentBannersDisplay;