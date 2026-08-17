/**
 * Image Compressor Utility
 * Compresses images to max 24KB for profile uploads
 * Uses browser Canvas API for compression
 */

(function() {
    const MAX_SIZE_KB = 24;
    const MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;
    const DEFAULT_MAX_DIMENSION = 800;
    const JPEG_QUALITY_START = 0.9;
    const JPEG_QUALITY_STEP = 0.1;

    /**
     * Compress an image file to base64 with max size constraint
     * @param {File} file - The image file to compress
     * @param {number} maxDimension - Maximum width/height (default 800px)
     * @returns {Promise<{base64: string, size: number, width: number, height: number}>}
     */
    async function compressToBase64(file, maxDimension = DEFAULT_MAX_DIMENSION) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Invalid image file'));
                return;
            }

            const reader = new FileReader();

            reader.onload = function(e) {
                const img = new Image();

                img.onload = function() {
                    // Calculate new dimensions maintaining aspect ratio
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxDimension) {
                            height = Math.round(height * maxDimension / width);
                            width = maxDimension;
                        }
                    } else {
                        if (height > maxDimension) {
                            width = Math.round(width * maxDimension / height);
                            height = maxDimension;
                        }
                    }

                    // Create canvas and resize
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress with decreasing quality until under size limit
                    let quality = JPEG_QUALITY_START;
                    let base64 = canvas.toDataURL('image/jpeg', quality);
                    let size = Math.round((base64.length * 3) / 4); // Approximate base64 size

                    while (size > MAX_SIZE_BYTES && quality > 0.1) {
                        quality -= JPEG_QUALITY_STEP;
                        base64 = canvas.toDataURL('image/jpeg', quality);
                        size = Math.round((base64.length * 3) / 4);
                    }

                    // If still too large, scale down further
                    while (size > MAX_SIZE_BYTES && width > 100) {
                        width = Math.round(width * 0.8);
                        height = Math.round(height * 0.8);
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        quality = JPEG_QUALITY_START;
                        base64 = canvas.toDataURL('image/jpeg', quality);
                        size = Math.round((base64.length * 3) / 4);

                        while (size > MAX_SIZE_BYTES && quality > 0.1) {
                            quality -= JPEG_QUALITY_STEP;
                            base64 = canvas.toDataURL('image/jpeg', quality);
                            size = Math.round((base64.length * 3) / 4);
                        }
                    }

                    resolve({
                        base64: base64,
                        size: size,
                        width: width,
                        height: height
                    });
                };

                img.onerror = function() {
                    reject(new Error('Failed to load image'));
                };

                img.src = e.target.result;
            };

            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Preview image compression result
     * @param {File} file - The image file
     * @param {HTMLElement} previewElement - Element to show preview
     * @param {HTMLElement} sizeElement - Element to show file size
     */
    async function previewCompression(file, previewElement, sizeElement) {
        try {
            const result = await compressToBase64(file);

            if (previewElement) {
                previewElement.innerHTML = `<img src="${result.base64}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
            }

            if (sizeElement) {
                const sizeKB = (result.size / 1024).toFixed(1);
                const statusColor = result.size <= MAX_SIZE_BYTES ? '#1d7a44' : '#9f2f26';
                sizeElement.innerHTML = `
                    <span style="color: ${statusColor}; font-weight: 600;">
                        ${sizeKB} KB
                    </span>
                    <span style="color: #666; font-size: 0.85rem;">
                        (${result.width} × ${result.height}px)
                    </span>
                `;
            }

            return result.base64;
        } catch (error) {
            console.error('Compression error:', error);
            if (previewElement) {
                previewElement.innerHTML = '<span style="color: #9f2f26;">Failed to load image</span>';
            }
            return null;
        }
    }

    /**
     * Validate file before upload
     * @param {File} file - The file to validate
     * @returns {{valid: boolean, error?: string}}
     */
    function validateFile(file) {
        if (!file) {
            return { valid: false, error: 'No file selected' };
        }

        if (!file.type.startsWith('image/')) {
            return { valid: false, error: 'Please select an image file' };
        }

        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
            return { valid: false, error: 'Only JPEG and PNG images are allowed' };
        }

        // Check original file size (warn if > 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return { valid: false, error: 'Image file is too large (max 5MB)' };
        }

        return { valid: true };
    }

    // Expose public API
    window.imageCompressor = {
        compressToBase64,
        previewCompression,
        validateFile,
        MAX_SIZE_KB
    };

})();
