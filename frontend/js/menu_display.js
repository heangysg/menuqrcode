// qr-digital-menu-system/frontend/js/menu_display.js

// Extract slug from path (/menu/ysg)
const pathParts = window.location.pathname.split("/");
const slug = pathParts[pathParts.length - 1];

// Optimize Cloudinary images for delivery
function getOptimizedImageUrl(url) {
    if (!url) return url;
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
        return url.replace("/upload/", "/upload/f_auto,q_auto,w_600/");
    }
    return url;
}
// Simple Khmer text check
function isKhmerText(text) {
    return /[\u1780-\u17FF]/.test(text);
}
// Function to prepend CORS proxy if the URL is external
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
    const pathParts = window.location.pathname.split("/");
    const slug = pathParts[pathParts.length - 1];

    if (!slug || slug === 'menu') {
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
        isLoading: false,
        productsPerPage: 20,
        currentPage: 1,
        displayedProducts: [],
        totalProducts: 0
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
        
        if (window.bannerInterval) {
            clearInterval(window.bannerInterval);
        }
    }

    function setupSocialMediaLinks() {
        if (!state.currentStoreData) return;
        
        const modal = document.getElementById('imagePopupModal');
        if (!modal) {
            return;
        }
        
        const socialIcons = {
            facebook: modal.querySelector('.social-icon-modal.facebook'),
            tiktok: modal.querySelector('.social-icon-modal.tiktok'),
            telegram: modal.querySelector('.social-icon-modal.telegram')
        };
        
        if (socialIcons.facebook && state.currentStoreData.facebookUrl && state.currentStoreData.facebookUrl.trim() !== '') {
            socialIcons.facebook.href = state.currentStoreData.facebookUrl;
            socialIcons.facebook.style.display = 'flex';
            socialIcons.facebook.target = '_blank';
        } else if (socialIcons.facebook) {
            socialIcons.facebook.style.display = 'none';
        }
        
        if (socialIcons.tiktok && state.currentStoreData.tiktokUrl && state.currentStoreData.tiktokUrl.trim() !== '') {
            socialIcons.tiktok.href = state.currentStoreData.tiktokUrl;
            socialIcons.tiktok.style.display = 'flex';
            socialIcons.tiktok.target = '_blank';
        } else if (socialIcons.tiktok) {
            socialIcons.tiktok.style.display = 'none';
        }
        
        const telegramDropdown = modal.querySelector('.telegram-dropdown');
        const telegramDropdownMenu = modal.querySelector('.telegram-dropdown-menu');
        const telegramDropdownItems = modal.querySelector('.telegram-dropdown-items');
        
        if (telegramDropdown && socialIcons.telegram && 
            state.currentStoreData.telegramLinks && state.currentStoreData.telegramLinks.length > 0) {
            
            telegramDropdownItems.innerHTML = '';
            
            state.currentStoreData.telegramLinks.forEach((link, index) => {
                const dropdownItem = document.createElement('a');
                dropdownItem.href = "#";
                dropdownItem.className = 'telegram-dropdown-item';
                dropdownItem.innerHTML = `
                    <i class="fab fa-telegram-plane"></i>
                    ${link.name || `Sales Agent ${index + 1}`}
                `;
                dropdownItem.title = `Share product with ${link.name || `Sales Agent ${index + 1}`}`;
                
                dropdownItem.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    dropdownItem.classList.add('loading');
                    
                    try {
                        const productName = document.getElementById('popupProductName').textContent;
                        const productDescription = document.getElementById('popupProductDescription').textContent;
                        const productPrice = document.getElementById('popupProductPrice').textContent;
                        const productImage = document.getElementById('popupImage').src;
                        
                        let message = `🔧 *ព័ត៌មានផលិតផល*\n\n`;
                        message += `🛠️ *ឈ្មោះផលិតផល:* ${productName}\n`;
                        
                        if (productDescription && productDescription.trim() !== '' && productDescription !== 'No description available') {
                            message += `📋 *បារកូដ:* ${productDescription}\n`;
                        }
                        
                        if (productPrice && productPrice.trim() !== '' && productPrice !== 'N/A' && !productPrice.includes('undefined')) {
                            message += `💰 *តម្លៃ:* ${productPrice}\n`;
                        }
                        
                        const shareableImage = getShareableImageUrl(productImage);
                        if (shareableImage) {
                            message += `\n🖼️ *រូបភាព:* \n${shareableImage}\n`;
                        }
                        
                        message += `\n💬 *Message:* ខ្ញុំចាប់អារម្មណ៍នឹងផលិតផលនេះ! សូមផ្តល់ព័ត៌មានបន្ថែម។`;
                        
                        openTelegramWithMessage(link.url, message);
                        
                    } catch (error) {
                        const fallbackMessage = `🔧 Hello! I'm interested in one of your products.`;
                        openTelegramWithMessage(link.url, fallbackMessage);
                    } finally {
                        setTimeout(() => {
                            dropdownItem.classList.remove('loading');
                            telegramDropdown.classList.remove('active');
                        }, 500);
                    }
                });
                
                telegramDropdownItems.appendChild(dropdownItem);
            });

            socialIcons.telegram.style.display = 'flex';
            telegramDropdown.style.display = 'block';
            
            const newTelegramIcon = socialIcons.telegram.cloneNode(true);
            socialIcons.telegram.parentNode.replaceChild(newTelegramIcon, socialIcons.telegram);
            
            newTelegramIcon.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const isActive = telegramDropdown.classList.contains('active');
                
                document.querySelectorAll('.telegram-dropdown.active').forEach(dropdown => {
                    if (dropdown !== telegramDropdown) {
                        dropdown.classList.remove('active');
                    }
                });
                
                if (isActive) {
                    telegramDropdown.classList.remove('active');
                } else {
                    telegramDropdown.classList.add('active');
                }
            });
            
            if (!window.telegramDropdownClickHandler) {
                window.telegramDropdownClickHandler = function(e) {
                    if (telegramDropdown.classList.contains('active') && !telegramDropdown.contains(e.target)) {
                        telegramDropdown.classList.remove('active');
                    }
                };
                document.addEventListener('click', window.telegramDropdownClickHandler);
            }
            
            if (!window.telegramDropdownKeyHandler) {
                window.telegramDropdownKeyHandler = function(e) {
                    if (e.key === 'Escape' && telegramDropdown.classList.contains('active')) {
                        telegramDropdown.classList.remove('active');
                    }
                };
                document.addEventListener('keydown', window.telegramDropdownKeyHandler);
            }
            
        } else {
            if (socialIcons.telegram) {
                socialIcons.telegram.style.display = 'none';
            }
            if (telegramDropdown) {
                telegramDropdown.style.display = 'none';
            }
        }
    }

    function getShareableImageUrl(imageUrl) {
        if (!imageUrl) return '';
        
        if (imageUrl.includes('placehold.co')) {
            return '';
        }
        
        return imageUrl;
    }

    function openTelegramWithMessage(telegramUrl, message) {
        const encodedMessage = encodeURIComponent(message);
        
        let username = '';
        if (telegramUrl.includes('t.me/')) {
            username = telegramUrl.split('t.me/')[1].replace('/', '');
        } else if (telegramUrl.includes('telegram.me/')) {
            username = telegramUrl.split('telegram.me/')[1].replace('/', '');
        }
        
        username = username.split('?')[0];
        
        if (username) {
            window.open(`https://t.me/${username}?text=${encodedMessage}`, '_blank');
        } else {
            window.open(telegramUrl, '_blank');
        }
    }

    function toggleSocialLink(element, url) {
        if (!element) return;
        
        if (url && url.trim() !== '') {
            element.href = url;
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }

    function renderBanners(bannerUrls) {
        if (!elements.storeBannerContainer || !elements.sliderDotsContainer) return;
        
        elements.storeBannerContainer.innerHTML = '';
        elements.sliderDotsContainer.innerHTML = '';

        if (!bannerUrls || !Array.isArray(bannerUrls) || bannerUrls.length === 0) {
            elements.storeBannerContainer.classList.add('hidden');
            return;
        }

        elements.storeBannerContainer.classList.remove('hidden');
        elements.storeBannerContainer.classList.add('loading');

        bannerUrls.forEach((url, index) => {
            const img = document.createElement('img');
            const optimizedUrl = getOptimizedImageUrl(getProxiedImageUrl(url));
            
            img.src = optimizedUrl;
            img.alt = `Store Banner ${index + 1}`;
            img.classList.add('store-banner-slide');
            img.loading = 'lazy';
            img.decoding = 'async';
            
            img.onload = () => {
                elements.storeBannerContainer.classList.remove('loading');
            };
            
            img.onerror = () => {
                elements.storeBannerContainer.classList.remove('loading');
            };
            
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
        
        setTimeout(() => {
            elements.storeBannerContainer.classList.remove('loading');
        }, 3000);
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

    function setupSearchFunctionality() {
        if (!elements.searchMenuInput || !elements.clearSearchBtn) return;

        const debouncedSearch = debounce(async (searchTerm) => {
            state.activeCategoryId = 'all-items';
            setActiveCategoryTab('all-items');
            await fetchAndRenderProducts(null, searchTerm);
        }, 300);

        elements.searchMenuInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();

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

async function fetchAndRenderProducts(categoryId = null, searchTerm = null, loadMore = false) {
    if (state.isLoading && !loadMore) return;
    
    state.isLoading = true;
    
    if (!loadMore) {
        showLoadingState();
        resetPagination();
    }

    try {
        const queryParams = {
            page: state.currentPage,
            limit: state.productsPerPage
        };

        if (categoryId && categoryId !== 'all-items') {
            queryParams.category = categoryId;
        }

        if (searchTerm) {
            queryParams.search = searchTerm;
        }

        const response = await apiRequest(`/products/public-store/slug/${slug}`, 'GET', null, false, false, queryParams);
        
        let products = [];
        let totalProducts = 0;
        
        if (response && typeof response === 'object') {
            if (response.products && Array.isArray(response.products)) {
                products = response.products;
                totalProducts = response.total;
            } else if (Array.isArray(response)) {
                products = response;
                totalProducts = response.length;
            }
        }

        if (loadMore) {
            state.currentFilteredProducts = [...state.currentFilteredProducts, ...products];
            state.displayedProducts = [...state.displayedProducts, ...products];
        } else {
            state.currentFilteredProducts = products;
            state.displayedProducts = products;
        }

        state.totalProducts = totalProducts;

        hideLoadingState();

        if (state.displayedProducts.length === 0 && !loadMore) {
            showNoResultsMessage(searchTerm);
            return;
        }

        const hasMore = state.displayedProducts.length < state.totalProducts;
        renderMenuContent(state.displayedProducts, hasMore);

    } catch (error) {
        hideLoadingState();
        if (!loadMore) {
            showErrorMessage('Menu Error', 'Error loading menu', `Failed to load menu items: ${error.message}`);
        }
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

    function renderCategoryTabs(categories, activeTabId = 'all-items') {
        if (!elements.categoryTabs) return;
        
        elements.categoryTabs.innerHTML = '';

        const allLi = createCategoryTab('all-items', 'All', activeTabId === 'all-items');
        elements.categoryTabs.appendChild(allLi);

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
            
            setTimeout(() => {
                if (categoryId === 'all-items') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    const categoryElement = document.getElementById(`cat-${categoryId}`);
                    if (categoryElement) {
                        const headerHeight = 200;
                        const elementPosition = categoryElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerHeight;
                        
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            }, 100);
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

function renderMenuContent(productsToRender, showLoadMore = false) {
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

    const shouldShowLoadMore = state.totalProducts > state.displayedProducts.length;
    
    if (shouldShowLoadMore) {
        renderLoadMoreButton();
    }
}

function renderLoadMoreButton() {
    const existingBtn = document.getElementById('loadMoreBtn');
    if (existingBtn) {
        existingBtn.remove();
    }

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.id = 'loadMoreBtn';
    
    const remainingProducts = state.totalProducts - state.displayedProducts.length;
    
    loadMoreBtn.innerHTML = `
        <div class="load-more-main">
            <span>Load More Products</span>
            <i class="fas fa-chevron-down"></i>
        </div>
        <div class="load-more-count">
            (${state.displayedProducts.length} of ${state.totalProducts})
        </div>
    `;
    
    loadMoreBtn.addEventListener('click', loadMoreProducts);
    
    elements.menuContent.appendChild(loadMoreBtn);
}
    function renderAsSingleList(products) {
        const section = document.createElement('section');
        section.id = 'all-items-section';

        const title = document.createElement('h2');
        title.classList.add('category-title', 'text-lg', 'font-bold', 'text-gray-800');
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

            const title = document.createElement('h2');
            title.classList.add('category-title', 'text-lg', 'font-bold', 'text-gray-800');
            title.textContent = category.name;
            section.appendChild(title);

            const productsInCategory = products.filter(product => 
                product.category && product.category._id === category._id
            );

            if (productsInCategory.length === 0) {
                const message = document.createElement('p');
                message.classList.add('text-gray-500', 'text-center', 'py-4');
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
        grid.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-2', 'p-2');
        
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
        card.classList.add('bg-white', 'rounded-lg', 'shadow-sm', 'overflow-hidden', 'flex', 'flex-col', 'cursor-pointer', 'hover:shadow-md', 'transition-shadow', 'm-1', 'product-card');

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
        cardContent.classList.add('p-2', 'flex-grow', 'flex', 'flex-col', 'justify-between');

        const title = document.createElement('h3');
        title.classList.add('text-sm', 'font-semibold', 'text-gray-800', 'mb-1', 'line-clamp-2');
        title.textContent = product.title;
        cardContent.appendChild(title);

        if (product.description) {
            const description = document.createElement('p');
            description.classList.add('text-gray-600', 'text-xs', 'mb-1', 'line-clamp-2', 'product-card-description');
            description.textContent = product.description;
            cardContent.appendChild(description);
        }

        if (product.price && product.price !== '0' && product.price !== '0.00' && product.price.trim() !== '') {
            const price = document.createElement('p');
            price.classList.add('text-orange-600', 'font-bold', 'text-sm');
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

        if (product.price && product.price !== '0' && product.price !== '0.00' && product.price.trim() !== '') {
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

    function openImagePopup(imageUrl, productName, productDescription, productPrice) {
        if (!elements.imagePopupModal || !elements.popupImage) return;
        
        elements.popupImage.src = imageUrl;
        elements.popupProductName.textContent = productName;
        elements.popupProductDescription.textContent = productDescription || '';

        if (productPrice && productPrice !== '0' && productPrice !== '0.00' && productPrice.trim() !== '') {
            elements.popupProductPrice.textContent = productPrice;
            elements.popupProductPrice.classList.remove('hidden');
        } else {
            elements.popupProductPrice.textContent = '';
            elements.popupProductPrice.classList.add('hidden');
        }

        setupSocialMediaLinks();
        
        elements.imagePopupModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeImagePopup() {
        if (!elements.imagePopupModal) return;
        
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
        // Auto apply correct font to modal too
        if (isKhmerText(state.currentStoreData.name || '')) {
            elements.modalStoreName.className = 'store-name-khmer text-2xl font-bold text-gray-800';
        } else {
            elements.modalStoreName.className = 'store-name-english text-2xl font-bold text-gray-800';
        }
        elements.modalStoreDescription.textContent = state.currentStoreData.description || 'មិនមានការពិពណ៌នាទេ។';
        if (elements.modalStorePhone) elements.modalStorePhone.textContent = state.currentStoreData.phone || 'N/A';
        if (elements.modalStoreAddress) elements.modalStoreAddress.textContent = state.currentStoreData.address || 'N/A';

        toggleSocialLink(elements.socialFacebook, state.currentStoreData.facebookUrl);
        toggleSocialLink(elements.socialTikTok, state.currentStoreData.tiktokUrl);
        toggleSocialLink(elements.socialWebsite, state.currentStoreData.websiteUrl);

        setupStoreInfoTelegram();

        elements.storeInfoModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeStoreInfoPopup() {
        if (!elements.storeInfoModal) return;
        
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

        const allCategoryItem = createCategoryModalItem('All Items', 'all-items');
        elements.categoryListContainer.appendChild(allCategoryItem);

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

    function setupNavigation() {
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

    function setupEventListeners() {
        if (elements.closeImagePopupBtn) {
            elements.closeImagePopupBtn.addEventListener('click', closeImagePopup);
        }
        if (elements.closeStoreInfoBtn) {
            elements.closeStoreInfoBtn.addEventListener('click', closeStoreInfoPopup);
        }
        if (elements.closeCategorySelectionBtn) {
            elements.closeCategorySelectionBtn.addEventListener('click', closeCategorySelectionModal);
        }

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

        if (elements.storeHeaderInfo) {
            elements.storeHeaderInfo.addEventListener('click', openStoreInfoPopup);
        }
    }

    function setupStoreInfoTelegram() {
        if (!state.currentStoreData) return;
        
        const storeModal = document.getElementById('storeInfoModal');
        if (!storeModal) return;
        
        const telegramDropdownStore = storeModal.querySelector('.telegram-dropdown-store');
        const telegramIconStore = storeModal.querySelector('#storeTelegramIcon');
        const telegramDropdownMenuStore = storeModal.querySelector('.telegram-dropdown-menu-store');
        const telegramDropdownItemsStore = storeModal.querySelector('.telegram-dropdown-items-store');
        
        if (telegramDropdownStore && telegramIconStore && 
            state.currentStoreData.telegramLinks && state.currentStoreData.telegramLinks.length > 0) {
            
            telegramDropdownItemsStore.innerHTML = '';
            
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
            
            telegramIconStore.classList.remove('hidden');
            
            telegramIconStore.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const isActive = telegramDropdownStore.classList.contains('active');
                
                document.querySelectorAll('.telegram-dropdown-store.active').forEach(dropdown => {
                    if (dropdown !== telegramDropdownStore) {
                        dropdown.classList.remove('active');
                    }
                });
                
                if (isActive) {
                    telegramDropdownStore.classList.remove('active');
                } else {
                    telegramDropdownStore.classList.add('active');
                }
            });
            
            document.addEventListener('click', function(e) {
                if (telegramDropdownStore.classList.contains('active') && !telegramDropdownStore.contains(e.target)) {
                    telegramDropdownStore.classList.remove('active');
                }
            });
            
        } else {
            if (telegramIconStore) {
                telegramIconStore.classList.add('hidden');
            }
        }
    }

    function applyWallpaperBackground(storeData) {
        document.body.classList.remove('wallpaper-background');
        const existingOverlay = document.querySelector('.wallpaper-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        const wallpaperUrl = storeData.wallpaper || storeData.wallpaperUrl;

        if (!wallpaperUrl || wallpaperUrl.trim() === '') {
            document.body.style.backgroundImage = '';
            document.body.style.backgroundColor = '#f9fafb';
            document.body.classList.remove('wallpaper-background');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'wallpaper-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(255, 255, 255, 0.85);
            z-index: -1;
            pointer-events: none;
        `;
        document.body.appendChild(overlay);

        document.body.classList.add('wallpaper-background');
        const optimizedUrl = getOptimizedImageUrl(wallpaperUrl);
        
        document.body.style.cssText += `
            background-image: url('${optimizedUrl}') !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            background-attachment: fixed !important;
            background-color: #f9fafb !important;
        `;
        
        preloadWallpaper(optimizedUrl);
    }

    function preloadWallpaper(wallpaperUrl) {
        if (!wallpaperUrl || wallpaperUrl.trim() === '') return;
        
        const img = new Image();
        img.src = wallpaperUrl;
        img.onload = function() {
        };
        img.onerror = function() {
            document.body.classList.remove('wallpaper-background');
            document.body.style.backgroundImage = '';
            document.body.style.backgroundColor = '#f9fafb';
        };
    }

    function loadMoreProducts() {
        if (state.isLoading) return;
        
        state.isLoading = true;
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.classList.add('loading');
            loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading';
        }
        
        state.currentPage += 1;
        
        setTimeout(async () => {
            await fetchAndRenderProducts(state.activeCategoryId, elements.searchMenuInput?.value.trim(), true);
            state.isLoading = false;
        }, 300);
    }

    function resetPagination() {
        state.currentPage = 1;
        state.displayedProducts = [];
        state.totalProducts = 0;
    }

    async function initializeMenu() {
        try {
            const requiredElements = [
                'menuTitle', 'storeName', 'loadingMessage', 
                'categoryTabs', 'menuContent'
            ];
            
            for (const elementId of requiredElements) {
                if (!document.getElementById(elementId)) {
                    showErrorMessage('Page Error', 'Page Loading Error', 'Some page elements failed to load. Please refresh the page.');
                    return;
                }
            }
            
            state.currentStoreData = await apiRequest(`/stores/public/slug/${slug}`, 'GET', null, false);
            
            if (!state.currentStoreData) {
                throw new Error('Store not found');
            }

            applyWallpaperBackground(state.currentStoreData);

            elements.menuTitle.textContent = `${state.currentStoreData.name}'s Menu`;
            elements.storeNameElem.textContent = state.currentStoreData.name;
            // Auto apply correct font
            if (isKhmerText(state.currentStoreData.name)) {
                elements.storeNameElem.className = 'store-name-khmer text-xl sm:text-2xl font-bold text-orange-600';
            } else {
                elements.storeNameElem.className = 'store-name-english text-xl sm:text-2xl font-bold text-orange-600';
            }

            if (state.currentStoreData.logo) {
                elements.storeLogoImg.src = getOptimizedImageUrl(getProxiedImageUrl(state.currentStoreData.logo));
                elements.storeLogoImg.style.display = 'block';
            }

            if (Array.isArray(state.currentStoreData.banner) && state.currentStoreData.banner.length > 0) {
                renderBanners(state.currentStoreData.banner);
                startBannerSlider();
            }

            state.allCategories = await apiRequest(`/categories/store/slug/${slug}`, 'GET', null, false);

            elements.loadingMessage.classList.add('hidden');

            setupSearchFunctionality();
            setupViewToggle();
            setupNavigation();
            setupEventListeners();

            renderCategoryTabs(state.allCategories, 'all-items');
            await fetchAndRenderProducts('all-items');

        } catch (error) {
            showErrorMessage('Menu Load Error', 'Error loading menu details', `Failed to load menu: ${error.message}`);
        }
    }

    await initializeMenu();
});