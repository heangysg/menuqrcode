// frontend/js/index.js
document.addEventListener('DOMContentLoaded', async () => {
    await loadProductsForIndex();
});

async function loadProductsForIndex() {
    try {
        const products = await fetch('/api/products/website').then(res => res.json());
        const productsContainer = document.getElementById('products-container');
        
        if (!productsContainer) return;
        
        if (products.length === 0) {
            productsContainer.innerHTML = '<p class="text-center text-gray-500">No products available.</p>';
            return;
        }
        
        productsContainer.innerHTML = products.map(product => `
            <div class="bg-white rounded-lg shadow-md p-4">
                ${product.image || product.imageUrl ? 
                    `<img src="${product.image || product.imageUrl}" alt="${product.title}" class="w-full h-48 object-cover rounded-md mb-4">` : 
                    '<div class="w-full h-48 bg-gray-200 rounded-md mb-4 flex items-center justify-center text-gray-500">No Image</div>'
                }
                <h3 class="text-lg font-semibold mb-2">${product.title}</h3>
                <p class="text-gray-600 mb-2">${product.description || ''}</p>
                <p class="text-green-600 font-bold">$${product.price || '0.00'}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading products for index:', error);
        const productsContainer = document.getElementById('products-container');
        if (productsContainer) {
            productsContainer.innerHTML = '<p class="text-center text-red-500">Error loading products.</p>';
        }
    }
}