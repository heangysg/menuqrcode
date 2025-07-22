// qr-digital-menu-system/tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Look for Tailwind classes in all your HTML files in the frontend directory
    "./frontend/**/*.html",
    // If you add any JS files where you dynamically generate class names, add them here too
    "./frontend/**/*.js",
  ],
theme: {
  extend: {},
},
  plugins: [],
}