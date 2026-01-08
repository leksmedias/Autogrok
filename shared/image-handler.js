// AutoGrok Image Handler
// Handles image upload, conversion, and management

/**
 * Convert file to base64
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 to blob
 */
function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Resize image to max dimensions
 */
async function resizeImage(file, maxWidth = 2048, maxHeight = 2048) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, file.type || 'image/jpeg', 0.9);
    };

    img.onerror = reject;

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 */
function validateImage(file, maxSizeMB = 10) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload JPG, PNG, GIF, or WebP.');
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File too large. Maximum size is ${maxSizeMB}MB.`);
  }

  return true;
}

/**
 * Process multiple images
 */
async function processImages(files, options = {}) {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    maxSizeMB = 10,
    resize = true
  } = options;

  const processed = [];

  for (const file of files) {
    try {
      // Validate
      validateImage(file, maxSizeMB);

      // Resize if needed
      let processedFile = file;
      if (resize) {
        const blob = await resizeImage(file, maxWidth, maxHeight);
        processedFile = new File([blob], file.name, { type: file.type });
      }

      // Convert to base64
      const base64 = await fileToBase64(processedFile);

      processed.push({
        name: file.name,
        type: file.type,
        size: processedFile.size,
        base64: base64
      });

    } catch (error) {
      console.error(`Error processing ${file.name}:`, error);
      throw error;
    }
  }

  return processed;
}

/**
 * Create thumbnail from image
 */
async function createThumbnail(file, size = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      const ratio = Math.min(size / img.width, size / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL(file.type || 'image/jpeg', 0.8));
    };

    img.onerror = reject;

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions
 */
async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };

    img.onerror = reject;

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fileToBase64,
    base64ToBlob,
    resizeImage,
    validateImage,
    processImages,
    createThumbnail,
    getImageDimensions
  };
}
