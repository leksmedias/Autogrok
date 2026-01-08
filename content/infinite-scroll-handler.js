// AutoGrok Infinite Scroll Handler
// Handles infinite scroll functionality on Grok Imagine page

class InfiniteScrollHandler {
  constructor() {
    this.observing = false;
    this.collectedImages = new Set();
    this.observer = null;
    this.scrollInterval = null;
    this.targetCount = 0;
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
  }

  /**
   * Start infinite scroll collection
   */
  async start(targetCount, onProgress, onComplete) {
    this.targetCount = targetCount;
    this.onProgressCallback = onProgress;
    this.onCompleteCallback = onComplete;
    this.collectedImages.clear();

    console.log(`Starting infinite scroll collection for ${targetCount} images`);

    // Set up mutation observer to watch for new images
    this.setupImageObserver();

    // Start auto-scrolling
    this.startAutoScroll();

    this.observing = true;
  }

  /**
   * Stop collection
   */
  stop() {
    console.log('Stopping infinite scroll collection');

    this.observing = false;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }

    return Array.from(this.collectedImages);
  }

  /**
   * Setup mutation observer for images
   */
  setupImageObserver() {
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src']
    };

    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    // Observe the image container
    const container = this.findImageContainer();
    if (container) {
      this.observer.observe(container, config);
      console.log('Image observer set up successfully');

      // Also collect existing images
      this.collectVisibleImages();
    } else {
      console.warn('Could not find image container for observation');
    }
  }

  /**
   * Find the container holding images
   */
  findImageContainer() {
    // Try multiple selectors that might match Grok's imagine page
    const selectors = [
      '.imagine-container',
      '.image-grid',
      '.gallery',
      '[class*="imagine"]',
      '[class*="gallery"]',
      'main',
      '#root'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }

    // Fallback to body
    return document.body;
  }

  /**
   * Handle mutations
   */
  handleMutations(mutations) {
    let newImagesFound = false;

    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processNode(node);
            newImagesFound = true;
          }
        });
      } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        this.processNode(mutation.target);
        newImagesFound = true;
      }
    });

    if (newImagesFound) {
      this.collectVisibleImages();
    }
  }

  /**
   * Process a node for images
   */
  processNode(node) {
    // Check if node is an image
    if (node.tagName === 'IMG') {
      this.collectImage(node);
    }

    // Check if node contains images
    const images = node.querySelectorAll('img');
    images.forEach(img => this.collectImage(img));
  }

  /**
   * Collect visible images
   */
  collectVisibleImages() {
    const images = document.querySelectorAll(SELECTORS.imagineImage);

    images.forEach(img => {
      if (this.isValidImage(img)) {
        this.collectImage(img);
      }
    });

    console.log(`Collected ${this.collectedImages.size} images so far`);

    // Update progress
    if (this.onProgressCallback) {
      this.onProgressCallback(this.collectedImages.size, this.targetCount);
    }

    // Check if we've reached target
    if (this.collectedImages.size >= this.targetCount) {
      this.complete();
    }
  }

  /**
   * Check if image is valid
   */
  isValidImage(img) {
    if (!img.src || img.src === '') return false;

    // Filter out placeholder images, icons, etc.
    if (img.width < 100 || img.height < 100) return false;
    if (img.src.includes('placeholder')) return false;
    if (img.src.includes('icon')) return false;
    if (img.src.includes('avatar')) return false;

    return true;
  }

  /**
   * Collect an image
   */
  collectImage(img) {
    if (!this.isValidImage(img)) return;

    const imageData = {
      src: img.src,
      alt: img.alt || '',
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      timestamp: Date.now()
    };

    // Use src as unique identifier
    const key = imageData.src;

    if (!this.collectedImages.has(key)) {
      this.collectedImages.add(key);
      console.log(`Collected image: ${key.substring(0, 50)}...`);
    }
  }

  /**
   * Auto-scroll to load more images
   */
  startAutoScroll() {
    let scrollAttempts = 0;
    const maxScrollAttempts = 100;

    this.scrollInterval = setInterval(() => {
      if (!this.observing || scrollAttempts >= maxScrollAttempts) {
        this.stop();
        return;
      }

      // Scroll to bottom
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      });

      scrollAttempts++;

      // Check if we've reached target
      if (this.collectedImages.size >= this.targetCount) {
        this.complete();
      }
    }, 1000); // Scroll every second
  }

  /**
   * Complete collection
   */
  complete() {
    console.log(`Collection complete: ${this.collectedImages.size} images`);

    const images = this.stop();

    if (this.onCompleteCallback) {
      this.onCompleteCallback(images);
    }
  }

  /**
   * Download all collected images
   */
  async downloadAll(images, filenamePrefix = 'grok_imagine') {
    console.log(`Downloading ${images.length} images`);

    const downloads = [];

    images.forEach((imgUrl, index) => {
      const filename = `${filenamePrefix}_${index + 1}.png`;

      downloads.push({
        url: imgUrl,
        filename: filename,
        index: index
      });
    });

    return downloads;
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.InfiniteScrollHandler = InfiniteScrollHandler;
}
