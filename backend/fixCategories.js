// qr-digital-menu-system/backend/fixCategories.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Category = require('./models/Category');
const connectDB = require('./config/db'); // Assuming db.js exports a connectDB function

dotenv.config({ path: './.env' }); // Load environment variables from .env file

// Connect to Database
connectDB();

// Function to update a product's category
const updateProductCategory = async (productTitle, categoryName) => {
    try {
        console.log(`Attempting to update product "${productTitle}" to category "${categoryName}"...`);

        // 1. Find the target category by name
        const category = await Category.findOne({ name: categoryName });

        if (!category) {
            console.error(`Error: Category "${categoryName}" not found. Please check the category name.`);
            return;
        }
        console.log(`Found category "${category.name}" with ID: ${category._id}`);

        // 2. Find the product by its title
        const product = await Product.findOne({ title: productTitle });

        if (!product) {
            console.error(`Error: Product "${productTitle}" not found. Please check the product title.`);
            return;
        }
        console.log(`Found product "${product.title}" with current category ID: ${product.category}`);

        // 3. Update the product's category
        if (product.category && product.category.toString() === category._id.toString()) {
            console.log(`Product "${product.title}" is already in the correct category "${category.name}". No update needed.`);
        } else {
            product.category = category._id; // Assign the correct category ObjectId
            await product.save(); // Save the updated product
            console.log(`Success: Product "${product.title}" category updated to "${category.name}" (ID: ${category._id}).`);
        }

    } catch (error) {
        console.error('An error occurred during update:', error.message);
    }
};

// --- Main execution block ---
// Use an async IIFE (Immediately Invoked Function Expression) to run the updates
(async () => {
    try {
        // IMPORTANT: Customize these calls based on your actual product titles
        // and the exact category names they should belong to.

        // Example based on your provided data:
        // If 'ទូរតាំងពោតផ្ទុះ' (Popcorn Stand) should be under 'ម៉ាសុីនផ្នែកអាហារ' (Food Machine)
        await updateProductCategory('ទូរតាំងពោតផ្ទុះ', 'ម៉ាសុីនផ្នែកអាហារ');

        // If 'ម៉ាសុីនកិនសាច់' (Meat Grinder) should be under 'ម៉ាសុីនផ្នែកអាហារ' (Food Machine)
        await updateProductCategory('ម៉ាសុីនកិនសាច់', 'ម៉ាសុីនផ្នែកអាហារ');

        // Add more calls here for any other miscategorized products:
        // await updateProductCategory('Your Other Product Title', 'Your Correct Category Name');

    } catch (error) {
        console.error('Error during script execution:', error.message);
    } finally {
        // Disconnect from MongoDB after all operations are done
        if (mongoose.connection.readyState === 1) { // Check if connection is open
            await mongoose.connection.close();
            console.log('MongoDB connection closed.');
        }
    }
})();
