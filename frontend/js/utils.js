// qr-digital-menu-system/frontend/js/utils.js

/**
 * Generates a QR code and appends it to a specified container.
 * Requires the QRious library to be loaded (e.g., via CDN in HTML).
 * @param {string} text - The text/URL to encode in the QR code.
 * @param {HTMLElement} containerElement - The DOM element where the QR code canvas will be appended.
 * @param {number} [size=256] - The size of the QR code in pixels (width and height).
 * @returns {HTMLCanvasElement|null} The generated canvas element, or null if QRious is not available.
 */
function generateQRCode(text, containerElement, size = 256) {
    if (typeof QRious === 'undefined') {
        console.error("QRious library not loaded. Cannot generate QR code.");
        return null;
    }

    // Clear previous QR code if any
    containerElement.innerHTML = '';

    const canvas = document.createElement('canvas');
    containerElement.appendChild(canvas);

    try {
        new QRious({
            element: canvas,
            value: text,
            size: size,
            level: 'H' // Error correction level (L, M, Q, H)
        });
        return canvas;
    } catch (error) {
        console.error("Error generating QR code:", error);
        return null;
    }
}

/**
 * Helper function to download a canvas as a PNG image.
 * @param {HTMLCanvasElement} canvas - The canvas element to download.
 * @param {string} filename - The desired filename for the download (e.g., "my_qrcode.png").
 */
function downloadCanvasAsPNG(canvas, filename) {
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        console.error("Invalid canvas element provided for download.");
        return;
    }
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link); // Required for Firefox
    link.click();
    document.body.removeChild(link); // Clean up
}


// You can add more utility functions here as needed, e.g.,
// - input validation helpers
// - date formatting
// - local storage helpers (beyond just token/role)