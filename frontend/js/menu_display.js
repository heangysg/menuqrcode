// qr-digital-menu-system/frontend/js/menu_display.js

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const publicSlug = urlParams.get('slug');

    const menuTitle = document.getElementById('menuTitle');
    const storeHeaderInfo = document.getElementById('storeHeaderInfo');
    const storeLogoImg = document.getElementById('storeLogo');
    const storeNameElem = document.getElementById('storeName');
    const categoryTabs = document.getElementById('categoryTabs');
    const menuContent = document.getElementById('menuContent');
    const loadingMessage = document.getElementById('loadingMessage');
    const noMenuMessage = document.getElementById('noMenuMessage');
    const searchMenuInput = document.getElementById('searchMenuInput');
    const noSearchResultsMessage = document.getElementById('noSearchResultsMessage');

    const imagePopupModal = document.getElementById('imagePopupModal');
    const popupImage = document.getElementById('popupImage');
    const closeImagePopupBtn = document.getElementById('closeImagePopupBtn');
    const popupProductName = document.getElementById('popupProductName');
    const popupProductDescription = document.getElementById('popupProductDescription');
    const popupProductPrice = document.getElementById('popupProductPrice');

    const storeInfoModal = document.getElementById('storeInfoModal');
    const closeStoreInfoBtn = document.getElementById('closeStoreInfoBtn');
    const modalStoreLogo = document.getElementById('modalStoreLogo');
    const modalStoreName = document.getElementById('modalStoreName');
    const modalStoreDescription = document.getElementById('modalStoreDescription');
    const modalStorePhone = document.getElementById('modalStorePhone').querySelector('span');
    const modalStoreAddress = document.getElementById('modalStoreAddress').querySelector('span');
    const socialFacebook = document.getElementById('socialFacebook');
    const socialTelegram = document.getElementById('socialTelegram');
    const socialTikTok = document.getElementById('socialTikTok');
    const socialWebsite = document.getElementById('socialWebsite');

    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');

    // MODIFIED: Banner elements for slider
    const storeBannerContainer = document.getElementById('storeBannerContainer');
    const sliderDotsContainer = document.getElementById('sliderDots');

    let allProducts = []; // Keep this to store *all* products for search functionality
    let currentFilteredProducts = []; // Stores products currently displayed based on active category or search
    let allCategories = [];
    let currentStoreData = null;
    let currentView = 'grid'; // Default view
    let activeCategoryId = 'all-items'; // Track active category for re-rendering on view change

    let currentBannerIndex = 0;
    let bannerInterval; // To hold the interval for automatic sliding

    // Function to prepend CORS proxy if the URL is external and not already proxied
    function getProxiedImageUrl(url) {
        if (!url) return '';
        // Check if the URL is already using the proxy
        if (url.startsWith('https://corsproxy.io/?')) {
            return url;
        }
        // Check if the URL is from the same origin or cloudinary (which is already allowed by CSP)
        const isCloudinary = url.includes('res.cloudinary.com');
        const isPlaceholder = url.includes('placehold.co');
        const isSameOrigin = url.startsWith(window.location.origin);

        if (!isCloudinary && !isPlaceholder && !isSameOrigin) {
            return `https://corsproxy.io/?${encodeURIComponent(url)}`;
        }
        return url;
    }


    if (!publicSlug) {
        menuTitle.textContent = 'Menu Not Found';
        storeNameElem.textContent = 'Error: No Store ID provided.';
        loadingMessage.classList.add('hidden');
        noMenuMessage.textContent = 'Please scan a valid QR code.';
        noMenuMessage.classList.remove('hidden');
        console.error('No publicUrlId found in URL for menu display.');
        return;
    }

    // Function to fetch and render products based on category/search
    async function fetchAndRenderProducts(categoryId = null, searchTerm = null) {
        loadingMessage.classList.remove('hidden');
        noMenuMessage.classList.add('hidden');
        noSearchResultsMessage.classList.add('hidden');
        menuContent.innerHTML = ''; // Clear previous content

        try {
            let products;
            if (searchTerm) {
                // If there's a search term, fetch all products and filter locally for simplicity.
                // For very large menus, you might implement a backend search endpoint.
                products = await apiRequest(`/products/public-store/slug/${publicSlug}`, 'GET', null, false);
                products = products.filter(product =>
                    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (product.category && product.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            } else {
                // If no search term, fetch products based on the category ID (or all if 'all-items')
                const queryParams = categoryId && categoryId !== 'all-items' ? { category: categoryId } : null;
                products = await apiRequest(`/products/public-store/slug/${publicSlug}`, 'GET', null, false, false, queryParams);
            }
            currentFilteredProducts = products; // Update currently displayed products

            loadingMessage.classList.add('hidden');

            if (products.length === 0) {
                if (searchTerm) {
                    noSearchResultsMessage.classList.remove('hidden');
                } else {
                    noMenuMessage.textContent = 'No items found in this category.';
                    noMenuMessage.classList.remove('hidden');
                }
                return;
            }

            // Determine how to render: grouped by category or as a single list ("All Items" or "Search Results")
            const renderAsSingleList = (activeCategoryId === 'all-items' && !searchTerm) || searchTerm;

            if (renderAsSingleList) {
                renderMenuContent(products, []); // Pass an empty array for categories to indicate no grouping
            } else {
                // If a specific category is selected, filter categoriesToDisplay to only that one
                const categoriesToDisplay = allCategories.filter(cat => cat._id === activeCategoryId);
                renderMenuContent(products, categoriesToDisplay); // Pass filtered products and specific category for grouping
            }


        } catch (error) {
            console.error('Error fetching filtered products:', error.message);
            loadingMessage.classList.add('hidden');
            noMenuMessage.textContent = `Failed to load menu items: ${error.message}`;
            noMenuMessage.classList.remove('hidden');
        }
    }


    try {
        // Fetch store details using publicUrlId
       currentStoreData = await apiRequest(`/stores/public/slug/${publicSlug}`, 'GET', null, false);
        menuTitle.textContent = `${currentStoreData.name}'s Menu`;
        storeNameElem.textContent = currentStoreData.name;

        if (currentStoreData.logo) {
            storeLogoImg.src = getProxiedImageUrl(currentStoreData.logo); // Apply proxy to store logo
            storeLogoImg.style.display = 'block';
        } else {
            storeLogoImg.src = '';
            storeLogoImg.style.display = 'none';
        }

        // MODIFIED: Handle multiple banners for slider
        // Ensure currentStoreData.banner is an array before checking length
        if (Array.isArray(currentStoreData.banner) && currentStoreData.banner.length > 0) {
            storeBannerContainer.classList.remove('hidden');
            renderBanners(currentStoreData.banner);
            startBannerSlider();
        } else {
            storeBannerContainer.classList.add('hidden');
            stopBannerSlider();
        }


        // Fetch categories (always all categories for the store)
        allCategories = await apiRequest(`/categories/store/${currentStoreData._id}`, 'GET', null, false);

        // Fetch all products initially to populate `allProducts` for search
        // This initial fetch populates 'allProducts' for local search filtering.
        // It's separate from 'fetchAndRenderProducts' which handles display logic.
        allProducts = await apiRequest(`/products/public-store/slug/${publicSlug}`, 'GET', null, false);


        loadingMessage.classList.add('hidden');

        if (allProducts.length === 0) {
            noMenuMessage.classList.remove('hidden');
            return;
        }

        // Render Category Tabs
        function renderCategoryTabs(categoriesToRender, activeTabId = 'all-items') {
            categoryTabs.innerHTML = '';

            // Add "All" tab
            const allLi = document.createElement('li');
            const allA = document.createElement('a');
            allA.href = `#all-items`;
            allA.textContent = 'All';
            allA.classList.add('block', 'py-2', 'px-4', 'text-gray-700', 'font-medium', 'border-b-2', 'border-transparent', 'hover:border-orange-500', 'hover:text-orange-600', 'transition', 'duration-300', 'cursor-pointer');
            allA.addEventListener('click', async (e) => { // Make async
                e.preventDefault();
                activeCategoryId = 'all-items'; // Update active category
                setActiveCategoryTab('all-items');
                searchMenuInput.value = ''; // Clear search when "All" is clicked
                await fetchAndRenderProducts('all-items'); // Fetch all products from backend (no category filter)
                try {
                    document.querySelector('#all-items-section').scrollIntoView({ behavior: 'smooth' });
                } catch (error) {
                    console.warn("Element #all-items-section not found for scrolling.", error);
                }
            });
            allLi.appendChild(allA);
            categoryTabs.appendChild(allLi);

            // Add other category tabs
            categoriesToRender.forEach((category) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `#cat-${category._id}`;
                a.textContent = category.name;
                a.classList.add('block', 'py-2', 'px-4', 'text-gray-700', 'font-medium', 'border-b-2', 'border-transparent', 'hover:border-orange-500', 'hover:text-orange-600', 'transition', 'duration-300', 'cursor-pointer');
                a.addEventListener('click', async (e) => { // Make async
                    e.preventDefault();
                    activeCategoryId = category._id; // Update active category
                    setActiveCategoryTab(`cat-${category._id}`);
                    searchMenuInput.value = ''; // Clear search when category is clicked
                    await fetchAndRenderProducts(category._id); // Fetch products for this category from backend
                    try {
                        document.querySelector(a.hash).scrollIntoView({ behavior: 'smooth' });
                    } catch (error) {
                        console.warn(`Element ${a.hash} not found for scrolling.`, error);
                    }
                });
                li.appendChild(a);
                categoryTabs.appendChild(li);
            });

            // Set active tab
            setActiveCategoryTab(activeTabId);
        }

        // Helper function to set the active category tab
        function setActiveCategoryTab(tabId) {
            document.querySelectorAll('#categoryTabs a').forEach(tab => {
                tab.classList.remove('border-orange-600', 'text-orange-600');
            });
            const activeTab = document.querySelector(`#categoryTabs a[href="#${tabId}"]`);
            if (activeTab) {
                activeTab.classList.add('border-orange-600', 'text-orange-600');
            }
        }

        // Render Menu Content based on current view and filtered products/categories
        // productsToRender: The list of products to display (already filtered by category or search if applicable)
        // categoriesToRender: The list of categories to group by. If empty, it means render as a single list.
        function renderMenuContent(productsToRender, categoriesToRender) {
            menuContent.innerHTML = '';
            noSearchResultsMessage.classList.add('hidden');
            noMenuMessage.classList.add('hidden'); // Ensure this is hidden when content is rendered

            if (productsToRender.length === 0) {
                // Determine if it's no search results or no items in category
                if (searchMenuInput.value.trim() !== '') {
                    noSearchResultsMessage.classList.remove('hidden');
                } else {
                    noMenuMessage.textContent = 'No items found in this category.';
                    noMenuMessage.classList.remove('hidden');
                }
                return;
            }

            // Determine if we should group by categories or just show a single list ("All Items" or "Search Results")
            // This is true if categoriesToRender is NOT empty AND there's no active search term
            const shouldGroupByCategory = categoriesToRender.length > 0 && !searchMenuInput.value.trim();

            if (!shouldGroupByCategory) {
                // Render as a single, mixed list (for "All Items" or "Search Results")
                const allItemsSection = document.createElement('section');
                allItemsSection.id = 'all-items-section';
                allItemsSection.classList.add('mb-8');

                const allItemsTitle = document.createElement('h2');
                allItemsTitle.classList.add('text-2xl', 'font-bold', 'text-gray-800', 'mb-4', 'pb-2', 'border-b', 'border-orange-500', 'sticky', 'top-0', 'bg-gray-100', 'z-10', 'py-2');
                allItemsTitle.textContent = searchMenuInput.value.trim() !== '' ? 'Search Results' : 'All Items';
                allItemsSection.appendChild(allItemsTitle);

                if (currentView === 'grid') {
                    const productGrid = document.createElement('div');
                    productGrid.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-4');
                    productsToRender.forEach(product => {
                        productGrid.appendChild(createProductGridCard(product));
                    });
                    allItemsSection.appendChild(productGrid);
                } else { // List View
                    const productList = document.createElement('div');
                    productList.classList.add('divide-y', 'divide-gray-200');
                    productsToRender.forEach(product => {
                        productList.appendChild(createProductListItem(product));
                    });
                    allItemsSection.appendChild(productList);
                }
                menuContent.appendChild(allItemsSection);

            } else {
                // Render by category (for specific category tabs)
                categoriesToRender.forEach(category => {
                    const categorySection = document.createElement('section');
                    categorySection.id = `cat-${category._id}`;
                    categorySection.classList.add('mb-8');

                    const categoryTitle = document.createElement('h2');
                    categoryTitle.classList.add('text-2xl', 'font-bold', 'text-gray-800', 'mb-4', 'pb-2', 'border-b', 'border-orange-500', 'sticky', 'top-0', 'bg-gray-100', 'z-10', 'py-2');
                    categoryTitle.textContent = category.name;
                    categorySection.appendChild(categoryTitle);

                    // Filter products to only those belonging to the current category being rendered
                    // This is still needed here because productsToRender might contain ALL products if fetched initially
                    // but we only want to display products of the current 'category' in this specific section.
                    const productsInThisCategorySection = productsToRender.filter(product => product.category && product.category._id === category._id);


                    if (productsInThisCategorySection.length === 0) {
                        const noItemsMessage = document.createElement('p');
                        noItemsMessage.classList.add('text-gray-500', 'text-center', 'col-span-full');
                        noItemsMessage.textContent = 'No items in this category yet.';
                        categorySection.appendChild(noItemsMessage);
                    } else {
                        if (currentView === 'grid') {
                            const productGrid = document.createElement('div');
                            productGrid.classList.add('grid', 'grid-cols-2', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4', 'gap-4');
                            productsInThisCategorySection.forEach(product => {
                                productGrid.appendChild(createProductGridCard(product));
                            });
                            categorySection.appendChild(productGrid);
                        } else { // List View
                            const productList = document.createElement('div');
                            productList.classList.add('divide-y', 'divide-gray-200');
                            productsInThisCategorySection.forEach(product => {
                                productList.appendChild(createProductListItem(product));
                            });
                            categorySection.appendChild(productList);
                        }
                    }
                    menuContent.appendChild(categorySection);
                });
            }
        }

        // Helper function to create a product card for grid view
        function createProductGridCard(product) {
            const productCard = document.createElement('div');
            productCard.classList.add('bg-white', 'rounded-lg', 'shadow-md', 'overflow-hidden', 'flex', 'flex-col', 'cursor-pointer');

            const imgContainer = document.createElement('div');
            imgContainer.classList.add('product-image-container');
            const defaultImage = `https://placehold.co/400x400/e2e8f0/64748b?text=No+Image`;
            
            // Prioritize imageUrl, then image (Cloudinary), then image (from backend, if not imageUrl), then placeholder
            const displayImage = getProxiedImageUrl(product.imageUrl || product.image) || defaultImage;

            const img = document.createElement('img');
            img.src = displayImage;
            img.alt = product.title;
            img.classList.add('product-image');
            imgContainer.appendChild(img);
            productCard.appendChild(imgContainer);

            const cardContent = document.createElement('div');
            cardContent.classList.add('p-3', 'flex-grow', 'flex', 'flex-col', 'justify-between');

            const title = document.createElement('h3');
            title.classList.add('text-base', 'font-semibold', 'text-gray-800', 'mb-1');
            title.textContent = product.title;
            cardContent.appendChild(title);

            if (product.description) {
                const description = document.createElement('p');
                description.classList.add('text-gray-600', 'text-xs', 'mb-2', 'line-clamp-2');
                description.textContent = product.description;
                cardContent.appendChild(description);
            }

            if (product.price !== undefined && product.price !== null && product.price !== '') {
                const price = document.createElement('p');
                price.classList.add('text-orange-600', 'font-bold', 'text-md');
                price.textContent = product.price; // Display price as string
                cardContent.appendChild(price);
            }

            productCard.appendChild(cardContent);

            productCard.addEventListener('click', () => {
                // Pass product.price to openImagePopup
                openImagePopup(displayImage, product.title, product.description, product.price);
            });
            return productCard;
        }

        // Helper function to create a product item for list view
        function createProductListItem(product) {
            const listItem = document.createElement('div');
            listItem.classList.add('product-list-item');

            const defaultImage = `https://placehold.co/60x60/e2e8f0/64748b?text=No+Img`;
            // Prioritize imageUrl, then image (Cloudinary), then image (from backend, if not imageUrl), then placeholder
            const displayImage = getProxiedImageUrl(product.imageUrl || product.image) || defaultImage;

            const imgContainer = document.createElement('div');
            imgContainer.classList.add('list-image-container');
            const img = document.createElement('img');
            img.src = displayImage;
            img.alt = product.title;
            img.classList.add('list-image');
            imgContainer.appendChild(img);
            listItem.appendChild(imgContainer);

            const listContent = document.createElement('div');
            listContent.classList.add('list-content');

            const title = document.createElement('h3');
            title.textContent = product.title;
            listContent.appendChild(title);

            if (product.description) {
                const description = document.createElement('p');
                description.textContent = product.description;
                listContent.appendChild(description);
            }
            listItem.appendChild(listContent);

            if (product.price !== undefined && product.price !== null && product.price !== '') {
                const price = document.createElement('p');
                price.classList.add('list-price');
                price.textContent = product.price; // Display price as string
                listItem.appendChild(price);
            }

            listItem.addEventListener('click', () => {
                // Pass product.price to openImagePopup
                openImagePopup(displayImage, product.title, product.description, product.price);
            });
            return listItem;
        }


        // Image popup functions
        function openImagePopup(imageUrl, productName, productDescription, productPrice) {
            popupImage.src = imageUrl;
            popupProductName.textContent = productName;
            popupProductDescription.textContent = productDescription || 'No description available.';

            // Set the price in the popup
            if (productPrice !== undefined && productPrice !== null && productPrice !== '') {
                popupProductPrice.textContent = productPrice;
                popupProductPrice.classList.remove('hidden');
            } else {
                popupProductPrice.textContent = '';
                popupProductPrice.classList.add('hidden');
            }

            imagePopupModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeImagePopup() {
            imagePopupModal.classList.add('hidden');
            popupImage.src = '';
            popupProductName.textContent = '';
            popupProductDescription.textContent = '';
            popupProductPrice.textContent = '';
            popupProductPrice.classList.add('hidden');
            document.body.style.overflow = '';
        }


        // Store Info popup functions
        function openStoreInfoPopup() {
            if (!currentStoreData) return;

            if (currentStoreData.logo) {
                modalStoreLogo.src = getProxiedImageUrl(currentStoreData.logo); // Apply proxy to modal logo
                modalStoreLogo.style.display = 'block';
            } else {
                modalStoreLogo.src = '';
                modalStoreLogo.style.display = 'none';
            }
            modalStoreName.textContent = currentStoreData.name || 'N/A';
            modalStoreDescription.textContent = currentStoreData.description || 'មិនមានការពិពណ៌នាទេ។';
            modalStorePhone.textContent = currentStoreData.phone || 'N/A';
            modalStoreAddress.textContent = currentStoreData.address || 'N/A';

            if (currentStoreData.facebookUrl) {
                socialFacebook.href = currentStoreData.facebookUrl;
                socialFacebook.classList.remove('hidden');
            } else { socialFacebook.classList.add('hidden'); }

            if (currentStoreData.telegramUrl) {
                socialTelegram.href = currentStoreData.telegramUrl;
                socialTelegram.classList.remove('hidden');
            } else { socialTelegram.classList.add('hidden'); }

            if (currentStoreData.tiktokUrl) {
                socialTikTok.href = currentStoreData.tiktokUrl;
                socialTikTok.classList.remove('hidden');
            } else { socialTikTok.classList.add('hidden'); }

            if (currentStoreData.websiteUrl) {
                socialWebsite.href = currentStoreData.websiteUrl;
                socialWebsite.classList.remove('hidden');
            } else { socialWebsite.classList.add('hidden'); }


            storeInfoModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        function closeStoreInfoPopup() {
            storeInfoModal.classList.add('hidden');
            document.body.style.overflow = '';
        }


        // Event listeners for popup close
        if (closeImagePopupBtn) {
            closeImagePopupBtn.addEventListener('click', closeImagePopup);
        }
        if (closeStoreInfoBtn) {
            closeStoreInfoBtn.addEventListener('click', closeStoreInfoPopup);
        }

        // Close popup if clicking on the overlay itself
        if (imagePopupModal) {
            imagePopupModal.addEventListener('click', (e) => {
                if (e.target === imagePopupModal) {
                    closeImagePopup();
                }
            });
        }
        if (storeInfoModal) {
            storeInfoModal.addEventListener('click', (e) => {
                if (e.target === storeInfoModal) {
                    closeStoreInfoPopup();
                }
            });
        }

        // Event listener for store header (logo/name) click
        if (storeHeaderInfo) {
            storeHeaderInfo.addEventListener('click', openStoreInfoPopup);
        }

        // View Toggle Event Listeners
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', async () => { // Make async
                currentView = 'grid';
                gridViewBtn.classList.add('text-orange-600');
                listViewBtn.classList.remove('text-orange-600');
                listViewBtn.classList.add('text-gray-400');
                // Re-render based on current search term or active category
                await fetchAndRenderProducts(activeCategoryId, searchMenuInput.value.trim()); // Use activeCategoryId and search term
            });
        }

        if (listViewBtn) {
            listViewBtn.addEventListener('click', async () => { // Make async
                currentView = 'list';
                listViewBtn.classList.add('text-orange-600');
                gridViewBtn.classList.remove('text-orange-600');
                gridViewBtn.classList.add('text-gray-400');
                // Re-render based on current search term or active category
                await fetchAndRenderProducts(activeCategoryId, searchMenuInput.value.trim()); // Use activeCategoryId and search term
            });
        }

        // MODIFIED: Banner Slider Functions
        function renderBanners(bannerUrls) {
            storeBannerContainer.innerHTML = ''; // Clear existing banners and dots
            sliderDotsContainer.innerHTML = '';

            if (!bannerUrls || bannerUrls.length === 0) {
                storeBannerContainer.classList.add('hidden');
                return;
            }

            storeBannerContainer.classList.remove('hidden');

            bannerUrls.forEach((url, index) => {
                const img = document.createElement('img');
                img.src = getProxiedImageUrl(url); // Apply proxy here
                img.alt = `Store Banner ${index + 1}`;
                img.classList.add('store-banner-slide');
                if (index === 0) {
                    img.classList.add('active'); // First banner is active initially
                }
                storeBannerContainer.appendChild(img);

                const dot = document.createElement('span');
                dot.classList.add('dot');
                if (index === 0) {
                    dot.classList.add('active');
                }
                dot.addEventListener('click', () => {
                    showBanner(index);
                    resetBannerSlider(); // Reset timer on manual navigation
                });
                sliderDotsContainer.appendChild(dot);
            });

            // Append dots container to the banner container
            storeBannerContainer.appendChild(sliderDotsContainer);
        }

        function showBanner(index) {
            const slides = storeBannerContainer.querySelectorAll('.store-banner-slide');
            const dots = sliderDotsContainer.querySelectorAll('.dot');

            if (slides.length === 0) return;

            // Loop back to start if index is out of bounds
            if (index >= slides.length) {
                currentBannerIndex = 0;
            } else if (index < 0) {
                currentBannerIndex = slides.length - 1;
            } else {
                currentBannerIndex = index;
            }

            slides.forEach((slide, i) => {
                slide.classList.remove('active');
                if (i === currentBannerIndex) {
                    slide.classList.add('active');
                }
            });

            dots.forEach((dot, i) => {
                dot.classList.remove('active');
                if (i === currentBannerIndex) {
                    dot.classList.add('active');
                }
            });
        }

        function nextBanner() {
            showBanner(currentBannerIndex + 1);
        }

        function startBannerSlider() {
            stopBannerSlider(); // Clear any existing interval
            if (currentStoreData && Array.isArray(currentStoreData.banner) && currentStoreData.banner.length > 1) {
                bannerInterval = setInterval(nextBanner, 5000); // Change banner every 5 seconds
            }
        }

        function stopBannerSlider() {
            if (bannerInterval) {
                clearInterval(bannerInterval);
            }
        }

        function resetBannerSlider() {
            stopBannerSlider();
            startBannerSlider();
        }

        // Initial render
        renderCategoryTabs(allCategories, 'all-items'); // Set 'All' as active initially
        await fetchAndRenderProducts('all-items'); // Initial fetch of all products

        // Search functionality
        searchMenuInput.addEventListener('input', async (e) => { // Make async
            const searchTerm = e.target.value.toLowerCase();
            // When searching, reset active category to "all-items" visually and logically
            activeCategoryId = 'all-items';
            setActiveCategoryTab('all-items');

            await fetchAndRenderProducts(null, searchTerm); // Pass null for category, searchTerm for search
        });


    } catch (error) {
        console.error('Error fetching menu:', error.message);
        loadingMessage.classList.add('hidden');
        noMenuMessage.textContent = `Failed to load menu: ${error.message}`;
        noMenuMessage.classList.remove('hidden');
        menuTitle.textContent = 'Menu Load Error';
        storeNameElem.textContent = 'Error loading menu details.';
        storeLogoImg.style.display = 'none';
        storeBannerContainer.classList.add('hidden'); // Hide banner container on error
        stopBannerSlider(); // Stop slider on error
    }
});
