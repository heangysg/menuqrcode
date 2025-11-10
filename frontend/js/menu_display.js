// qr-digital-menu-system/frontend/js/menu_display.js

// Extract slug from path (/menu/ysg)
const pathParts = window.location.pathname.split("/");
const slug = pathParts[pathParts.length - 1];

// Optimize Cloudinary images for delivery
// function getOptimizedImageUrl(url) {
//     if (!url) return url;
//     if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
//         return url.replace("/upload/", "/upload/f_auto,q_auto,w_600/");
//     }
//     return url;
// }

function getOptimizedImageUrl(url) {
    if (!url) return url;
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
        // 800px width with 80% quality for maximum clarity
        return url.replace("/upload/", "/upload/f_auto,q_80,w_800/");
    }
    return url;
}

// Function to prepend CORS proxy if the URL is external
function getProxiedImageUrl(url) {
    if (!url) return '';
    
    // Check if the URL is already using the proxy
    if (url.startsWith('https://corsproxy.io/?')) {
        return url;
    }
    
    // Check if the URL is from allowed domains
    const isCloudinary = url.includes('res.cloudinary.com');
    const isPlaceholder = url.includes('placehold.co');
    const isSameOrigin = url.startsWith(window.location.origin);

    if (!isCloudinary && !isPlaceholder && !isSameOrigin) {
        return `https://corsproxy.io/?${encodeURIComponent(url)}`;
    }
    return url;
}

// Debounce function for search optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    // Extract slug from path (/menu/ysg)
    const pathParts = window.location.pathname.split("/");
    const slug = pathParts[pathParts.length - 1];

    console.log('🔍 Extracted slug:', slug);

    // Check if slug exists
    if (!slug || slug === 'menu') {
        console.error("No valid slug found in URL for menu display.");
        showErrorMessage('Menu Not Found', 'Error: No Store ID provided.', 'Please scan a valid QR code.');
        return;
    }

    // DOM Elements
    const elements = {
        menuTitle: document.getElementById('menuTitle'),
        storeHeaderInfo: document.getElementById('storeHeaderInfo'),
        storeLogoImg: document.getElementById('storeLogo'),
        storeNameElem: document.getElementById('storeName'),
        categoryTabs: document.getElementById('categoryTabs'),
        menuContent: document.getElementById('menuContent'),
        loadingMessage: document.getElementById('loadingMessage'),
        noMenuMessage: document.getElementById('noMenuMessage'),
        searchMenuInput: document.getElementById('searchMenuInput'),
        noSearchResultsMessage: document.getElementById('noSearchResultsMessage'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        imagePopupModal: document.getElementById('imagePopupModal'),
        popupImage: document.getElementById('popupImage'),
        closeImagePopupBtn: document.getElementById('closeImagePopupBtn'),
        popupProductName: document.getElementById('popupProductName'),
        popupProductDescription: document.getElementById('popupProductDescription'),
        popupProductPrice: document.getElementById('popupProductPrice'),
        storeInfoModal: document.getElementById('storeInfoModal'),
        closeStoreInfoBtn: document.getElementById('closeStoreInfoBtn'),
        modalStoreLogo: document.getElementById('modalStoreLogo'),
        modalStoreName: document.getElementById('modalStoreName'),
        modalStoreDescription: document.getElementById('modalStoreDescription'),
        modalStorePhone: document.getElementById('modalStorePhone')?.querySelector('span'),
        modalStoreAddress: document.getElementById('modalStoreAddress')?.querySelector('span'),
        socialFacebook: document.getElementById('socialFacebook'),
        socialTelegram: document.getElementById('socialTelegram'),
        socialTikTok: document.getElementById('socialTikTok'),
        socialWebsite: document.getElementById('socialWebsite'),
        gridViewBtn: document.getElementById('gridViewBtn'),
        listViewBtn: document.getElementById('listViewBtn'),
        storeBannerContainer: document.getElementById('storeBannerContainer'),
        sliderDotsContainer: document.getElementById('sliderDots'),
        categorySelectionModal: document.getElementById('categorySelectionModal'),
        closeCategorySelectionBtn: document.getElementById('closeCategorySelectionBtn'),
        categoryListContainer: document.getElementById('categoryListContainer'),
        bottomNavHome: document.getElementById('navHome'),
        bottomNavCategories: document.getElementById('navCategories'),
        bottomNavProfile: document.getElementById('navProfile'),
        fabScrollTop: document.getElementById('fabScrollTop'),
        navToggleBtn: document.getElementById('navToggleBtn')
    };

    // Application State
    const state = {
        allProducts: [],
        currentFilteredProducts: [],
        allCategories: [],
        currentStoreData: null,
        currentView: 'grid',
        activeCategoryId: 'all-items',
        currentBannerIndex: 0,
        bannerInterval: null,
        isLoading: false
    };

     function showErrorMessage(title, storeName, message) {
        const menuTitle = document.getElementById('menuTitle');
        const storeNameElem = document.getElementById('storeName');
        const loadingMessage = document.getElementById('loadingMessage');
        const noMenuMessage = document.getElementById('noMenuMessage');
        const storeLogoImg = document.getElementById('storeLogo');
        const storeBannerContainer = document.getElementById('storeBannerContainer');
        
        if (menuTitle) menuTitle.textContent = title;
        if (storeNameElem) storeNameElem.textContent = storeName;
        if (loadingMessage) loadingMessage.classList.add('hidden');
        if (noMenuMessage) {
            noMenuMessage.textContent = message;
            noMenuMessage.classList.remove('hidden');
        }
        if (storeLogoImg) storeLogoImg.style.display = 'none';
        if (storeBannerContainer) storeBannerContainer.classList.add('hidden');
        
        // Stop banner slider if it exists
        if (window.bannerInterval) {
            clearInterval(window.bannerInterval);
        }
    }


// IMPROVED: Social Media Functions with click-based Telegram dropdown
function setupSocialMediaLinks() {
    if (!state.currentStoreData) return;
    
    console.log('🔗 Setting up social media links with store data:', {
        facebook: state.currentStoreData.facebookUrl,
        tiktok: state.currentStoreData.tiktokUrl,
        telegramLinks: state.currentStoreData.telegramLinks,
        website: state.currentStoreData.websiteUrl
    });
    
    // IMPORTANT: Get elements from the MODAL (not the main page)
    const modal = document.getElementById('imagePopupModal');
    if (!modal) {
        console.error('❌ Image popup modal not found!');
        return;
    }
    
    // Get social media icons from the MODAL
    const socialIcons = {
        facebook: modal.querySelector('.social-icon-modal.facebook'),
        tiktok: modal.querySelector('.social-icon-modal.tiktok'),
        telegram: modal.querySelector('.social-icon-modal.telegram')
    };
    
    console.log('🔍 Found social media elements:', socialIcons);
    
    // Set Facebook link - WITH NULL CHECK
    if (socialIcons.facebook && state.currentStoreData.facebookUrl && state.currentStoreData.facebookUrl.trim() !== '') {
        socialIcons.facebook.href = state.currentStoreData.facebookUrl;
        socialIcons.facebook.style.display = 'flex';
        socialIcons.facebook.target = '_blank';
        console.log('✅ Facebook link set:', state.currentStoreData.facebookUrl);
    } else if (socialIcons.facebook) {
        socialIcons.facebook.style.display = 'none';
        console.log('❌ Facebook link not available or element not found');
    }
    
    // Set TikTok link - WITH NULL CHECK
    if (socialIcons.tiktok && state.currentStoreData.tiktokUrl && state.currentStoreData.tiktokUrl.trim() !== '') {
        socialIcons.tiktok.href = state.currentStoreData.tiktokUrl;
        socialIcons.tiktok.style.display = 'flex';
        socialIcons.tiktok.target = '_blank';
        console.log('✅ TikTok link set:', state.currentStoreData.tiktokUrl);
    } else if (socialIcons.tiktok) {
        socialIcons.tiktok.style.display = 'none';
        console.log('❌ TikTok link not available or element not found');
    }
    
    // SETUP TELEGRAM DROPDOWN - WITH NULL CHECKS
    const telegramDropdown = modal.querySelector('.telegram-dropdown');
    const telegramDropdownMenu = modal.querySelector('.telegram-dropdown-menu');
    const telegramDropdownItems = modal.querySelector('.telegram-dropdown-items');
    
    console.log('🔍 Telegram dropdown elements:', {
        dropdown: telegramDropdown,
        menu: telegramDropdownMenu,
        items: telegramDropdownItems,
        icon: socialIcons.telegram
    });
    
    if (telegramDropdown && socialIcons.telegram && 
        state.currentStoreData.telegramLinks && state.currentStoreData.telegramLinks.length > 0) {
        
        // Clear existing dropdown items
        telegramDropdownItems.innerHTML = '';
        
// REPLACE the above code with this:
state.currentStoreData.telegramLinks.forEach((link, index) => {
    const dropdownItem = document.createElement('a');
    dropdownItem.href = "#";
    dropdownItem.className = 'telegram-dropdown-item';
    dropdownItem.innerHTML = `
        <i class="fab fa-telegram-plane"></i>
        ${link.name || `Sales Agent ${index + 1}`}
    `;
    dropdownItem.title = `Share product with ${link.name || `Sales Agent ${index + 1}`}`;
    
// ALTERNATIVE: Better formatted version
dropdownItem.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Show loading state
    dropdownItem.classList.add('loading');
    
    try {
        // Get current product info from the popup
        const productName = document.getElementById('popupProductName').textContent;
        const productDescription = document.getElementById('popupProductDescription').textContent;
        const productPrice = document.getElementById('popupProductPrice').textContent;
        const productImage = document.getElementById('popupImage').src;
        
        // Create nicely formatted message
        let message = `🔧 *ព័ត៌មានផលិតផល*\n\n`;
        message += `🛠️ *ឈ្មោះផលិតផល:* ${productName}\n`;
        
        if (productDescription && productDescription.trim() !== '' && productDescription !== 'No description available') {
            message += `📋 *បារកូដ:* ${productDescription}\n`;
        }
        
        if (productPrice && productPrice.trim() !== '' && productPrice !== 'N/A' && !productPrice.includes('undefined')) {
            message += `💰 *តម្លៃ:* ${productPrice}\n`;
        }
        
        // Add image URL if available
        const shareableImage = getShareableImageUrl(productImage);
        if (shareableImage) {
            message += `\n🖼️ *រូបភាព:* \n${shareableImage}\n`;
        }
        
        message += `\n💬 *Message:* ខ្ញុំចាប់អារម្មណ៍នឹងផលិតផលនេះ! សូមផ្តល់ព័ត៌មានបន្ថែម។`;
        
        // Open Telegram with message
        openTelegramWithMessage(link.url, message);
        
        console.log('📤 Sharing product with:', link.name);
        
    } catch (error) {
        console.error('Error sharing product:', error);
        // Simple fallback message
        const fallbackMessage = `🔧 Hello! I'm interested in one of your products.`;
        openTelegramWithMessage(link.url, fallbackMessage);
    } finally {
        // Reset states
        setTimeout(() => {
            dropdownItem.classList.remove('loading');
            telegramDropdown.classList.remove('active');
        }, 500);
    }
});
    
    telegramDropdownItems.appendChild(dropdownItem);
});

        // Show the Telegram icon and dropdown container
        socialIcons.telegram.style.display = 'flex';
        telegramDropdown.style.display = 'block';
        
        // Remove any existing click event listeners to prevent duplicates
        const newTelegramIcon = socialIcons.telegram.cloneNode(true);
        socialIcons.telegram.parentNode.replaceChild(newTelegramIcon, socialIcons.telegram);
        
        // CLICK EVENT: Toggle dropdown when Telegram icon is clicked
        newTelegramIcon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🟡 Telegram icon clicked!');
            const isActive = telegramDropdown.classList.contains('active');
            
            // Close all other dropdowns first
            document.querySelectorAll('.telegram-dropdown.active').forEach(dropdown => {
                if (dropdown !== telegramDropdown) {
                    dropdown.classList.remove('active');
                }
            });
            
            // Toggle this dropdown
            if (isActive) {
                telegramDropdown.classList.remove('active');
                console.log('🔴 Telegram dropdown closed');
            } else {
                telegramDropdown.classList.add('active');
                console.log('🟢 Telegram dropdown opened');
            }
        });
        
        // Close dropdown when clicking outside (only add this once)
        if (!window.telegramDropdownClickHandler) {
            window.telegramDropdownClickHandler = function(e) {
                if (telegramDropdown.classList.contains('active') && !telegramDropdown.contains(e.target)) {
                    telegramDropdown.classList.remove('active');
                    console.log('🔴 Telegram dropdown closed (click outside)');
                }
            };
            document.addEventListener('click', window.telegramDropdownClickHandler);
        }
        
        // Close dropdown when pressing Escape key (only add this once)
        if (!window.telegramDropdownKeyHandler) {
            window.telegramDropdownKeyHandler = function(e) {
                if (e.key === 'Escape' && telegramDropdown.classList.contains('active')) {
                    telegramDropdown.classList.remove('active');
                    console.log('🔴 Telegram dropdown closed (Escape key)');
                }
            };
            document.addEventListener('keydown', window.telegramDropdownKeyHandler);
        }
        
        console.log('✅ Telegram dropdown set with', state.currentStoreData.telegramLinks.length, 'links');
    } else {
        // Hide Telegram if no links or elements not found
        if (socialIcons.telegram) {
            socialIcons.telegram.style.display = 'none';
        }
        if (telegramDropdown) {
            telegramDropdown.style.display = 'none';
        }
        console.log('❌ Telegram links not available or elements not found');
    }
}

// NEW: Function to create Telegram share message
function createTelegramShareMessage(productName, productDescription, productPrice, productImage) {
    const storeName = state.currentStoreData?.name || 'Our Store';
    const storeUrl = window.location.href;
    
    let message = `🛍️ *Product Inquiry from ${storeName}*\n\n`;
    message += `*Product:* ${productName}\n`;
    
    if (productDescription && productDescription.trim() !== '' && productDescription !== 'No description available') {
        // Limit description length for Telegram
        const shortDescription = productDescription.length > 100 
            ? productDescription.substring(0, 100) + '...' 
            : productDescription;
        message += `*Description:* ${shortDescription}\n`;
    }
    
    if (productPrice && productPrice.trim() !== '' && productPrice !== 'N/A' && !productPrice.includes('undefined')) {
        message += `*Price:* ${productPrice}\n`;
    }
    
    // Add product image if available and not a placeholder
    const shareableImage = getShareableImageUrl(productImage);
    if (shareableImage) {
        message += `\n📸 *Product Image Available*\n`;
    }
    
    message += `\n💬 *My Message:* I'm interested in this product! Please provide more details about availability, sizes, colors, etc.`;
    message += `\n\n🏪 *Store:* ${storeName}`;
    message += `\n🔗 *Menu:* ${storeUrl}`;
    message += `\n\n---\n*This message was sent via the digital menu*`;
    
    return encodeURIComponent(message);
}

// NEW: Function to create Telegram share URL
function createTelegramShareUrl(telegramUrl, message) {
    // Extract username from Telegram URL
    let username = '';
    
    if (telegramUrl.includes('t.me/')) {
        username = telegramUrl.split('t.me/')[1].replace('/', '');
    } else if (telegramUrl.includes('telegram.me/')) {
        username = telegramUrl.split('telegram.me/')[1].replace('/', '');
    }
    
    // Remove any query parameters
    username = username.split('?')[0];
    
    if (username) {
        return `https://t.me/${username}?text=${message}`;
    }
    
    // Fallback to original URL if username extraction fails
    return telegramUrl;
}

// NEW: Function to get optimized image URL for sharing
function getShareableImageUrl(imageUrl) {
    if (!imageUrl) return '';
    
    // If it's a placeholder image, don't include it
    if (imageUrl.includes('placehold.co')) {
        return '';
    }
    
    // Return the original image URL for sharing context
    return imageUrl;
}

// NEW: Helper function to open Telegram with message
function openTelegramWithMessage(telegramUrl, message) {
    const encodedMessage = encodeURIComponent(message);
    
    // Extract username from Telegram URL
    let username = '';
    if (telegramUrl.includes('t.me/')) {
        username = telegramUrl.split('t.me/')[1].replace('/', '');
    } else if (telegramUrl.includes('telegram.me/')) {
        username = telegramUrl.split('telegram.me/')[1].replace('/', '');
    }
    
    // Remove any query parameters
    username = username.split('?')[0];
    
    if (username) {
        // Open Telegram with pre-filled message
        window.open(`https://t.me/${username}?text=${encodedMessage}`, '_blank');
    } else {
        // Fallback - just open the Telegram URL
        window.open(telegramUrl, '_blank');
    }
}

    function toggleSocialLink(element, url) {
        if (!element) return;
        
        if (url && url.trim() !== '') {
            element.href = url;
            element.classList.remove('hidden');
            console.log(`✅ Social link set: ${element.id} -> ${url}`);
        } else {
            element.classList.add('hidden');
            console.log(`❌ Social link hidden: ${element.id}`);
        }
    }

    // Banner Slider Functions
    function renderBanners(bannerUrls) {
        if (!elements.storeBannerContainer || !elements.sliderDotsContainer) return;
        
        elements.storeBannerContainer.innerHTML = '';
        elements.sliderDotsContainer.innerHTML = '';

        if (!bannerUrls || !Array.isArray(bannerUrls) || bannerUrls.length === 0) {
            elements.storeBannerContainer.classList.add('hidden');
            return;
        }

        elements.storeBannerContainer.classList.remove('hidden');

        bannerUrls.forEach((url, index) => {
            const img = document.createElement('img');
            img.src = getOptimizedImageUrl(getProxiedImageUrl(url));
            img.alt = `Store Banner ${index + 1}`;
            img.classList.add('store-banner-slide');
            img.loading = 'lazy';
            
            if (index === 0) {
                img.classList.add('active');
            }
            elements.storeBannerContainer.appendChild(img);

            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (index === 0) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => {
                showBanner(index);
                resetBannerSlider();
            });
            elements.sliderDotsContainer.appendChild(dot);
        });

        elements.storeBannerContainer.appendChild(elements.sliderDotsContainer);
    }

    function showBanner(index) {
        const slides = elements.storeBannerContainer?.querySelectorAll('.store-banner-slide');
        const dots = elements.sliderDotsContainer?.querySelectorAll('.dot');

        if (!slides || slides.length === 0) return;

        if (index >= slides.length) {
            state.currentBannerIndex = 0;
        } else if (index < 0) {
            state.currentBannerIndex = slides.length - 1;
        } else {
            state.currentBannerIndex = index;
        }

        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === state.currentBannerIndex) {
                slide.classList.add('active');
            }
        });

        dots?.forEach((dot, i) => {
            dot.classList.remove('active');
            if (i === state.currentBannerIndex) {
                dot.classList.add('active');
            }
        });
    }

    function nextBanner() {
        showBanner(state.currentBannerIndex + 1);
    }

    function startBannerSlider() {
        stopBannerSlider();
        if (state.currentStoreData && Array.isArray(state.currentStoreData.banner) && state.currentStoreData.banner.length > 1) {
            state.bannerInterval = setInterval(nextBanner, 5000);
        }
    }

    function stopBannerSlider() {
        if (state.bannerInterval) {
            clearInterval(state.bannerInterval);
            state.bannerInterval = null;
        }
    }

    function resetBannerSlider() {
        stopBannerSlider();
        startBannerSlider();
    }

    // Search Functionality
    function setupSearchFunctionality() {
        if (!elements.searchMenuInput || !elements.clearSearchBtn) return;

        const debouncedSearch = debounce(async (searchTerm) => {
            state.activeCategoryId = 'all-items';
            setActiveCategoryTab('all-items');
            await fetchAndRenderProducts(null, searchTerm);
        }, 300);

        elements.searchMenuInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

            // Show/hide clear button
            if (searchTerm.length > 0) {
                elements.clearSearchBtn.classList.remove('hidden');
            } else {
                elements.clearSearchBtn.classList.add('hidden');
            }

            debouncedSearch(searchTerm);
        });

        elements.clearSearchBtn.addEventListener('click', async () => {
            elements.searchMenuInput.value = '';
            elements.clearSearchBtn.classList.add('hidden');
            state.activeCategoryId = 'all-items';
            setActiveCategoryTab('all-items');
            await fetchAndRenderProducts('all-items');
        });
    }

    // Product Fetching and Rendering
    async function fetchAndRenderProducts(categoryId = null, searchTerm = null) {
        if (state.isLoading) return;
        
        state.isLoading = true;
        showLoadingState();

        try {
            let products;
            if (searchTerm) {
                products = await apiRequest(`/products/public-store/slug/${slug}`, 'GET', null, false);
                products = products.filter(product =>
                    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (product.category && product.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            } else {
                const queryParams = categoryId && categoryId !== 'all-items' ? { category: categoryId } : null;
                products = await apiRequest(`/products/public-store/slug/${slug}`, 'GET', null, false, false, queryParams);
            }
            
            state.currentFilteredProducts = products;
            hideLoadingState();

            if (products.length === 0) {
                showNoResultsMessage(searchTerm);
                return;
            }

            renderMenuContent(products);

        } catch (error) {
            console.error('Error fetching filtered products:', error.message);
            hideLoadingState();
            showErrorMessage('Menu Error', 'Error loading menu', `Failed to load menu items: ${error.message}`);
        } finally {
            state.isLoading = false;
        }
    }

    function showLoadingState() {
        if (elements.loadingMessage) elements.loadingMessage.classList.remove('hidden');
        if (elements.noMenuMessage) elements.noMenuMessage.classList.add('hidden');
        if (elements.noSearchResultsMessage) elements.noSearchResultsMessage.classList.add('hidden');
        if (elements.menuContent) elements.menuContent.innerHTML = '';
    }

    function hideLoadingState() {
        if (elements.loadingMessage) elements.loadingMessage.classList.add('hidden');
    }

    function showNoResultsMessage(searchTerm) {
        if (searchTerm) {
            if (elements.noSearchResultsMessage) {
                elements.noSearchResultsMessage.classList.remove('hidden');
            }
        } else {
            if (elements.noMenuMessage) {
                elements.noMenuMessage.textContent = 'No items found in this category.';
                elements.noMenuMessage.classList.remove('hidden');
            }
        }
    }

    // Category Management
    function renderCategoryTabs(categories, activeTabId = 'all-items') {
        if (!elements.categoryTabs) return;
        
        elements.categoryTabs.innerHTML = '';

        // Add "All" tab
        const allLi = createCategoryTab('all-items', 'All', activeTabId === 'all-items');
        elements.categoryTabs.appendChild(allLi);

        // Add category tabs
        categories.forEach((category) => {
            const li = createCategoryTab(`cat-${category._id}`, category.name, activeTabId === `cat-${category._id}`);
            elements.categoryTabs.appendChild(li);
        });

        setActiveCategoryTab(activeTabId);
    }

    function createCategoryTab(tabId, name, isActive) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${tabId}`;
        a.textContent = name;
        a.classList.add('block', 'cursor-pointer');
        if (isActive) {
            a.classList.add('active-chip');
        }
        
        a.addEventListener('click', async (e) => {
            e.preventDefault();
            const categoryId = tabId === 'all-items' ? 'all-items' : tabId.replace('cat-', '');
            state.activeCategoryId = categoryId;
            setActiveCategoryTab(tabId);
            if (elements.searchMenuInput) elements.searchMenuInput.value = '';
            if (elements.clearSearchBtn) elements.clearSearchBtn.classList.add('hidden');
            await fetchAndRenderProducts(categoryId);
            
            try {
                document.querySelector(a.hash)?.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                console.warn(`Element ${a.hash} not found for scrolling.`, error);
            }
        });
        
        li.appendChild(a);
        return li;
    }

    function setActiveCategoryTab(tabId) {
        if (!elements.categoryTabs) return;
        
        elements.categoryTabs.querySelectorAll('a').forEach(tab => {
            tab.classList.remove('active-chip');
        });
        
        const activeTab = elements.categoryTabs.querySelector(`a[href="#${tabId}"]`);
        if (activeTab) {
            activeTab.classList.add('active-chip');
        }
    }

    function shouldGroupByCategory() {
        return state.activeCategoryId !== 'all-items' && 
               elements.searchMenuInput && 
               !elements.searchMenuInput.value.trim();
    }

    // Content Rendering
    function renderMenuContent(productsToRender) {
        if (!elements.menuContent) return;
        
        elements.menuContent.innerHTML = '';
        hideAllMessages();

        if (productsToRender.length === 0) {
            showNoResultsMessage(elements.searchMenuInput?.value.trim());
            return;
        }

        if (!shouldGroupByCategory()) {
            renderAsSingleList(productsToRender);
        } else {
            renderByCategory(productsToRender);
        }
    }

    function renderAsSingleList(products) {
        const section = document.createElement('section');
        section.id = 'all-items-section';
        section.classList.add('mb-8');

        const title = document.createElement('h2');
        title.classList.add('text-2xl', 'font-bold', 'text-gray-800', 'mb-4', 'pb-2', 'border-b', 'border-orange-500', 'sticky', 'top-0', 'bg-gray-100', 'z-10', 'py-2');
        title.textContent = elements.searchMenuInput?.value.trim() ? 'Search Results' : 'All Items';
        section.appendChild(title);

        const container = state.currentView === 'grid' ? 
            createProductGrid(products) : 
            createProductList(products);
        
        section.appendChild(container);
        elements.menuContent.appendChild(section);
    }

    function renderByCategory(products) {
        const categoriesToDisplay = state.allCategories.filter(cat => cat._id === state.activeCategoryId);
        
        categoriesToDisplay.forEach(category => {
            const section = document.createElement('section');
            section.id = `cat-${category._id}`;
            section.classList.add('mb-8');

            const title = document.createElement('h2');
            title.classList.add('text-xl', 'font-bold', 'text-gray-800', 'mb-4', 'pb-2', 'border-b', 'border-orange-500', 'sticky', 'top-0', 'bg-gray-100', 'z-10', 'py-2');
            title.textContent = category.name;
            section.appendChild(title);

            const productsInCategory = products.filter(product => 
                product.category && product.category._id === category._id
            );

            if (productsInCategory.length === 0) {
                const message = document.createElement('p');
                message.classList.add('text-gray-500', 'text-center', 'col-span-full');
                message.textContent = 'No items in this category yet.';
                section.appendChild(message);
            } else {
                const container = state.currentView === 'grid' ?
                    createProductGrid(productsInCategory) :
                    createProductList(productsInCategory);
                section.appendChild(container);
            }

            elements.menuContent.appendChild(section);
        });
    }

    function createProductGrid(products) {
        const grid = document.createElement('div');
        grid.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-4');
        
        products.forEach(product => {
            grid.appendChild(createProductGridCard(product));
        });
        
        return grid;
    }

    function createProductList(products) {
        const list = document.createElement('div');
        list.classList.add('divide-y', 'divide-gray-200');
        
        products.forEach(product => {
            list.appendChild(createProductListItem(product));
        });
        
        return list;
    }

    function createProductGridCard(product) {
        const card = document.createElement('div');
        card.classList.add('bg-white', 'rounded-lg', 'shadow-md', 'overflow-hidden', 'flex', 'flex-col', 'cursor-pointer', 'hover:shadow-lg', 'transition-shadow');

        const defaultImage = `https://placehold.co/400x400/e2e8f0/64748b?text=No+Image`;
        const displayImage = getOptimizedImageUrl(getProxiedImageUrl(product.imageUrl || product.image)) || defaultImage;

        const imgContainer = document.createElement('div');
        imgContainer.classList.add('product-image-container');
        const img = document.createElement('img');
        img.src = displayImage;
        img.alt = product.title;
        img.classList.add('product-image');
        img.loading = 'lazy';
        imgContainer.appendChild(img);
        card.appendChild(imgContainer);

        const cardContent = document.createElement('div');
        cardContent.classList.add('p-3', 'flex-grow', 'flex', 'flex-col', 'justify-between');

        const title = document.createElement('h3');
        title.classList.add('text-base', 'font-semibold', 'text-gray-800', 'mb-1', 'line-clamp-2');
        title.textContent = product.title;
        cardContent.appendChild(title);

        if (product.description) {
            const description = document.createElement('p');
            description.classList.add('text-gray-600', 'text-xs', 'mb-2', 'line-clamp-2', 'product-card-description');
            description.textContent = product.description;
            cardContent.appendChild(description);
        }

        if (product.price !== undefined && product.price !== null && product.price !== '') {
            const price = document.createElement('p');
            price.classList.add('text-orange-600', 'font-bold', 'text-md');
            price.textContent = product.price;
            cardContent.appendChild(price);
        }

        card.appendChild(cardContent);

        card.addEventListener('click', () => {
            openImagePopup(displayImage, product.title, product.description, product.price);
        });

        return card;
    }

    function createProductListItem(product) {
        const listItem = document.createElement('div');
        listItem.classList.add('product-list-item', 'hover:bg-gray-50', 'transition-colors');

        const defaultImage = `https://placehold.co/60x60/e2e8f0/64748b?text=No+Img`;
        const displayImage = getOptimizedImageUrl(getProxiedImageUrl(product.imageUrl || product.image)) || defaultImage;

        const imgContainer = document.createElement('div');
        imgContainer.classList.add('list-image-container');
        const img = document.createElement('img');
        img.src = displayImage;
        img.alt = product.title;
        img.classList.add('list-image');
        img.loading = 'lazy';
        imgContainer.appendChild(img);
        listItem.appendChild(imgContainer);

        const listContent = document.createElement('div');
        listContent.classList.add('list-content');

        const title = document.createElement('h3');
        title.classList.add('font-semibold', 'line-clamp-1');
        title.textContent = product.title;
        listContent.appendChild(title);

        if (product.description) {
            const description = document.createElement('p');
            description.classList.add('text-sm', 'line-clamp-2');
            description.textContent = product.description;
            listContent.appendChild(description);
        }
        listItem.appendChild(listContent);

        if (product.price !== undefined && product.price !== null && product.price !== '') {
            const price = document.createElement('p');
            price.classList.add('list-price');
            price.textContent = product.price;
            listItem.appendChild(price);
        }

        listItem.addEventListener('click', () => {
            openImagePopup(displayImage, product.title, product.description, product.price);
        });

        return listItem;
    }

    function hideAllMessages() {
        if (elements.noMenuMessage) elements.noMenuMessage.classList.add('hidden');
        if (elements.noSearchResultsMessage) elements.noSearchResultsMessage.classList.add('hidden');
    }

    // Modal Functions
    function openImagePopup(imageUrl, productName, productDescription, productPrice) {
    if (!elements.imagePopupModal || !elements.popupImage) return;
    
    elements.popupImage.src = imageUrl;
    elements.popupProductName.textContent = productName;
    elements.popupProductDescription.textContent = productDescription || '';

    if (productPrice !== undefined && productPrice !== null && productPrice !== '') {
        elements.popupProductPrice.textContent = productPrice;
        elements.popupProductPrice.classList.remove('hidden');
    } else {
        elements.popupProductPrice.textContent = '';
        elements.popupProductPrice.classList.add('hidden');
    }

    // Setup social media links when opening popup
    setupSocialMediaLinks();
    
    elements.imagePopupModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

    function closeImagePopup() {
        if (!elements.imagePopupModal) return;
        
        elements.imagePopupModal.classList.add('hidden');
        elements.popupImage.src = '';
        elements.popupProductName.textContent = '';
        elements.popupProductDescription.textContent = '';
        elements.popupProductPrice.textContent = '';
        document.body.style.overflow = '';
    }

        function openStoreInfoPopup() {
    if (!state.currentStoreData || !elements.storeInfoModal) return;

    if (state.currentStoreData.logo) {
        elements.modalStoreLogo.src = getOptimizedImageUrl(getProxiedImageUrl(state.currentStoreData.logo));
        elements.modalStoreLogo.style.display = 'block';
    } else {
        elements.modalStoreLogo.src = '';
        elements.modalStoreLogo.style.display = 'none';
    }

    elements.modalStoreName.textContent = state.currentStoreData.name || 'N/A';
    elements.modalStoreDescription.textContent = state.currentStoreData.description || 'មិនមានការពិពណ៌នាទេ។';
    if (elements.modalStorePhone) elements.modalStorePhone.textContent = state.currentStoreData.phone || 'N/A';
    if (elements.modalStoreAddress) elements.modalStoreAddress.textContent = state.currentStoreData.address || 'N/A';

    // Social media links - Updated to handle empty URLs properly
    console.log('🔗 Setting store info modal social links:', {
        facebook: state.currentStoreData.facebookUrl,
        telegramLinks: state.currentStoreData.telegramLinks,
        tiktok: state.currentStoreData.tiktokUrl,
        website: state.currentStoreData.websiteUrl
    });
    
    toggleSocialLink(elements.socialFacebook, state.currentStoreData.facebookUrl);
    toggleSocialLink(elements.socialTikTok, state.currentStoreData.tiktokUrl);
    toggleSocialLink(elements.socialWebsite, state.currentStoreData.websiteUrl);

    // NEW: Replace the old Telegram handling with dropdown setup
    setupStoreInfoTelegram();

    elements.storeInfoModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

    function closeStoreInfoPopup() {
    if (!elements.storeInfoModal) return;
    
    // Close any open Telegram dropdowns in store info
    const storeModal = document.getElementById('storeInfoModal');
    if (storeModal) {
        const openDropdowns = storeModal.querySelectorAll('.telegram-dropdown-store.active');
        openDropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }
    
    elements.storeInfoModal.classList.add('hidden');
    document.body.style.overflow = '';
}

    function openCategorySelectionModal() {
        if (!elements.categoryListContainer || !elements.categorySelectionModal) return;
        
        elements.categoryListContainer.innerHTML = '';

        // Add "All" option
        const allCategoryItem = createCategoryModalItem('All Items', 'all-items');
        elements.categoryListContainer.appendChild(allCategoryItem);

        // Add categories
        state.allCategories.forEach(category => {
            const categoryItem = createCategoryModalItem(category.name, category._id);
            elements.categoryListContainer.appendChild(categoryItem);
        });

        elements.categorySelectionModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function createCategoryModalItem(name, categoryId) {
        const item = document.createElement('div');
        item.classList.add('category-list-item');
        item.innerHTML = `<span>${name}</span><i class="fas fa-chevron-right"></i>`;
        
        item.addEventListener('click', async () => {
            state.activeCategoryId = categoryId;
            const tabId = categoryId === 'all-items' ? 'all-items' : `cat-${categoryId}`;
            setActiveCategoryTab(tabId);
            if (elements.searchMenuInput) elements.searchMenuInput.value = '';
            if (elements.clearSearchBtn) elements.clearSearchBtn.classList.add('hidden');
            await fetchAndRenderProducts(categoryId);
            closeCategorySelectionModal();
        });
        
        return item;
    }

    function closeCategorySelectionModal() {
        if (!elements.categorySelectionModal) return;
        
        elements.categorySelectionModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // View Toggle
    function setupViewToggle() {
        if (!elements.gridViewBtn || !elements.listViewBtn) return;

        elements.gridViewBtn.addEventListener('click', async () => {
            state.currentView = 'grid';
            updateViewToggleButtons();
            await fetchAndRenderProducts(state.activeCategoryId, elements.searchMenuInput?.value.trim());
        });

        elements.listViewBtn.addEventListener('click', async () => {
            state.currentView = 'list';
            updateViewToggleButtons();
            await fetchAndRenderProducts(state.activeCategoryId, elements.searchMenuInput?.value.trim());
        });
    }

    function updateViewToggleButtons() {
        if (state.currentView === 'grid') {
            elements.gridViewBtn.classList.add('text-orange-600');
            elements.listViewBtn.classList.remove('text-orange-600');
            elements.listViewBtn.classList.add('text-gray-400');
        } else {
            elements.listViewBtn.classList.add('text-orange-600');
            elements.gridViewBtn.classList.remove('text-orange-600');
            elements.gridViewBtn.classList.add('text-gray-400');
        }
    }

    // Navigation Setup
    function setupNavigation() {
        // Bottom navigation
        if (elements.bottomNavHome) {
            elements.bottomNavHome.addEventListener('click', () => {
                setActiveBottomNav(elements.bottomNavHome);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        if (elements.bottomNavCategories) {
            elements.bottomNavCategories.addEventListener('click', () => {
                setActiveBottomNav(elements.bottomNavCategories);
                openCategorySelectionModal();
            });
        }

        if (elements.bottomNavProfile) {
            elements.bottomNavProfile.addEventListener('click', () => {
                setActiveBottomNav(elements.bottomNavProfile);
                openStoreInfoPopup();
            });
        }

        // Scroll to top FAB
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY || document.documentElement.scrollTop;
            if (elements.fabScrollTop) {
                if (scrolled > 300) {
                    elements.fabScrollTop.classList.remove('hidden');
                } else {
                    elements.fabScrollTop.classList.add('hidden');
                }
            }
        });

        if (elements.fabScrollTop) {
            elements.fabScrollTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Nav toggle for desktop
        if (elements.navToggleBtn) {
            elements.navToggleBtn.addEventListener('click', function() {
                const bottomNav = document.querySelector('.bottom-nav');
                if (bottomNav) {
                    bottomNav.classList.toggle('hidden');
                    this.classList.toggle('rotated');
                    this.setAttribute('title', bottomNav.classList.contains('hidden') ? 'Show Navigation' : 'Hide Navigation');
                }
            });
        }
    }

    function setActiveBottomNav(activeButton) {
        [elements.bottomNavHome, elements.bottomNavCategories, elements.bottomNavProfile].forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (activeButton) activeButton.classList.add('active');
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // Popup close events
        if (elements.closeImagePopupBtn) {
            elements.closeImagePopupBtn.addEventListener('click', closeImagePopup);
        }
        if (elements.closeStoreInfoBtn) {
            elements.closeStoreInfoBtn.addEventListener('click', closeStoreInfoPopup);
        }
        if (elements.closeCategorySelectionBtn) {
            elements.closeCategorySelectionBtn.addEventListener('click', closeCategorySelectionModal);
        }

        // Overlay click events
        if (elements.imagePopupModal) {
            elements.imagePopupModal.addEventListener('click', (e) => {
                if (e.target === elements.imagePopupModal) closeImagePopup();
            });
        }
        if (elements.storeInfoModal) {
            elements.storeInfoModal.addEventListener('click', (e) => {
                if (e.target === elements.storeInfoModal) closeStoreInfoPopup();
            });
        }
        if (elements.categorySelectionModal) {
            elements.categorySelectionModal.addEventListener('click', (e) => {
                if (e.target === elements.categorySelectionModal) closeCategorySelectionModal();
            });
        }

        // Store header click
        if (elements.storeHeaderInfo) {
            elements.storeHeaderInfo.addEventListener('click', openStoreInfoPopup);
        }
    }

        // NEW: Setup Telegram dropdown for Store Info Modal
function setupStoreInfoTelegram() {
    if (!state.currentStoreData) return;
    
    const storeModal = document.getElementById('storeInfoModal');
    if (!storeModal) return;
    
    const telegramDropdownStore = storeModal.querySelector('.telegram-dropdown-store');
    const telegramIconStore = storeModal.querySelector('#storeTelegramIcon');
    const telegramDropdownMenuStore = storeModal.querySelector('.telegram-dropdown-menu-store');
    const telegramDropdownItemsStore = storeModal.querySelector('.telegram-dropdown-items-store');
    
    console.log('🔗 Setting up store info Telegram dropdown:', {
        dropdown: telegramDropdownStore,
        icon: telegramIconStore,
        menu: telegramDropdownMenuStore,
        items: telegramDropdownItemsStore
    });
    
    if (telegramDropdownStore && telegramIconStore && 
        state.currentStoreData.telegramLinks && state.currentStoreData.telegramLinks.length > 0) {
        
        // Clear existing dropdown items
        telegramDropdownItemsStore.innerHTML = '';
        
        // Add each Telegram link to dropdown
        state.currentStoreData.telegramLinks.forEach((link, index) => {
            const dropdownItem = document.createElement('a');
            dropdownItem.href = link.url;
            dropdownItem.target = '_blank';
            dropdownItem.rel = 'noopener noreferrer';
            dropdownItem.className = 'telegram-dropdown-item-store';
            dropdownItem.innerHTML = `
                <i class="fab fa-telegram-plane"></i>
                ${link.name || `Sales Agent ${index + 1}`}
            `;
            dropdownItem.title = `Contact ${link.name || `Sales Agent ${index + 1}`}`;
            
            telegramDropdownItemsStore.appendChild(dropdownItem);
        });
        
        // Show the Telegram icon
        telegramIconStore.classList.remove('hidden');
        
        // CLICK EVENT: Toggle dropdown when Telegram icon is clicked
        telegramIconStore.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🟡 Store Telegram icon clicked!');
            const isActive = telegramDropdownStore.classList.contains('active');
            
            // Close all other dropdowns first
            document.querySelectorAll('.telegram-dropdown-store.active').forEach(dropdown => {
                if (dropdown !== telegramDropdownStore) {
                    dropdown.classList.remove('active');
                }
            });
            
            // Toggle this dropdown
            if (isActive) {
                telegramDropdownStore.classList.remove('active');
                console.log('🔴 Store Telegram dropdown closed');
            } else {
                telegramDropdownStore.classList.add('active');
                console.log('🟢 Store Telegram dropdown opened');
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (telegramDropdownStore.classList.contains('active') && !telegramDropdownStore.contains(e.target)) {
                telegramDropdownStore.classList.remove('active');
                console.log('🔴 Store Telegram dropdown closed (click outside)');
            }
        });
        
        console.log('✅ Store info Telegram dropdown set with', state.currentStoreData.telegramLinks.length, 'links');
    } else {
        // Hide Telegram if no links or elements not found
        if (telegramIconStore) {
            telegramIconStore.classList.add('hidden');
        }
        console.log('❌ Store Telegram links not available or elements not found');
    }
}

    // Add this to your existing closeImagePopup function
function closeImagePopup() {
    if (!elements.imagePopupModal) return;
    
    // Close any open Telegram dropdowns
    const openDropdowns = document.querySelectorAll('.telegram-dropdown.active');
    openDropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
    });
    
    elements.imagePopupModal.classList.add('hidden');
    elements.popupImage.src = '';
    elements.popupProductName.textContent = '';
    elements.popupProductDescription.textContent = '';
    elements.popupProductPrice.textContent = '';
    document.body.style.overflow = '';
}

   // Main initialization
async function initializeMenu() {
    try {
        // Check if required elements exist
        const requiredElements = [
            'menuTitle', 'storeName', 'loadingMessage', 
            'categoryTabs', 'menuContent'
        ];
        
        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                console.error(`Required element not found: ${elementId}`);
                showErrorMessage('Page Error', 'Page Loading Error', 'Some page elements failed to load. Please refresh the page.');
                return;
            }
        }

        console.log('🚀 Starting menu initialization with slug:', slug);
        
        // Fetch store data with debug logging
        console.log('🔍 Fetching store data from:', `/stores/public/slug/${slug}`);
        state.currentStoreData = await apiRequest(`/stores/public/slug/${slug}`, 'GET', null, false);
        console.log('✅ Store data received:', state.currentStoreData);
        
        if (!state.currentStoreData) {
            throw new Error('Store not found');
        }

        // Update page title and store info
        console.log('📝 Updating page with store:', state.currentStoreData.name);
        elements.menuTitle.textContent = `${state.currentStoreData.name}'s Menu`;
        elements.storeNameElem.textContent = state.currentStoreData.name;

        // Set store logo
        if (state.currentStoreData.logo) {
            console.log('🖼️ Setting store logo');
            elements.storeLogoImg.src = getOptimizedImageUrl(getProxiedImageUrl(state.currentStoreData.logo));
            elements.storeLogoImg.style.display = 'block';
        }

        // Setup banners
        if (Array.isArray(state.currentStoreData.banner) && state.currentStoreData.banner.length > 0) {
            console.log('🎨 Setting up banners:', state.currentStoreData.banner.length, 'banners found');
            renderBanners(state.currentStoreData.banner);
            startBannerSlider();
        }

        // Fetch categories and products
        console.log('🔍 Fetching categories from:', `/categories/store/slug/${slug}`);
        state.allCategories = await apiRequest(`/categories/store/slug/${slug}`, 'GET', null, false);
        console.log('✅ Categories received:', state.allCategories);

        console.log('🔍 Fetching products from:', `/products/public-store/slug/${slug}`);
        state.allProducts = await apiRequest(`/products/public-store/slug/${slug}`, 'GET', null, false);
        console.log('✅ Products received:', state.allProducts);

        elements.loadingMessage.classList.add('hidden');

        if (state.allProducts.length === 0) {
            console.log('⚠️ No products found for store');
            elements.noMenuMessage.classList.remove('hidden');
            return;
        }

        console.log('🛠️ Initializing all functionality');
        // Initialize all functionality
        setupSearchFunctionality();
        setupViewToggle();
        setupNavigation();
        setupEventListeners();

        // Render initial content
        console.log('🎨 Rendering initial content');
        renderCategoryTabs(state.allCategories, 'all-items');
        await fetchAndRenderProducts('all-items');

        console.log('✅ Menu initialization completed successfully');

    } catch (error) {
        console.error('❌ Error initializing menu:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        showErrorMessage('Menu Load Error', 'Error loading menu details', `Failed to load menu: ${error.message}`);
    }
}

    // Start the application
    await initializeMenu();
});