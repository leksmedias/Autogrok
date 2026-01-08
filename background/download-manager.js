// AutoGrok Download Manager

export class DownloadManager {
  constructor() {
    this.downloads = [];
    this.settings = null;
  }

  /**
   * Load downloads from storage
   */
  async loadFromStorage() {
    const data = await chrome.storage.local.get(['autogrok_downloads', 'autogrok_settings']);
    this.downloads = data.autogrok_downloads || [];
    this.settings = data.autogrok_settings || {};

    console.log('Loaded downloads from storage:', this.downloads.length);
  }

  /**
   * Save downloads to storage
   */
  async saveToStorage() {
    await chrome.storage.local.set({
      autogrok_downloads: this.downloads
    });
  }

  /**
   * Download a file
   */
  async download(url, filename, metadata = {}) {
    try {
      // Generate filename if needed
      if (!filename || filename === '') {
        filename = this.generateFilename(metadata);
      }

      // Add download path prefix if configured
      if (this.settings.downloadPath) {
        filename = `${this.settings.downloadPath}/${filename}`;
      }

      // Organize by date/type if configured
      if (this.settings.organizeByDate || this.settings.organizeByType) {
        filename = this.organizePath(filename, metadata);
      }

      // Create download
      const downloadId = await chrome.downloads.download({
        url: url,
        filename: filename,
        conflictAction: 'uniquify',
        saveAs: false
      });

      // Save to history
      const download = {
        id: this.generateId(),
        downloadId: downloadId,
        url: url,
        filename: filename,
        metadata: metadata,
        status: 'in_progress',
        startedAt: Date.now(),
        completedAt: null,
        error: null
      };

      this.downloads.push(download);
      await this.saveToStorage();

      console.log('Download started:', downloadId, filename);

      return download;

    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  }

  /**
   * Generate filename from template
   */
  generateFilename(metadata) {
    const template = this.settings.filenameTemplate || '{prompt}_{timestamp}_{index}';
    let filename = template;

    // Prepare data
    const data = {
      prompt: this.sanitizeFilename(metadata.prompt || 'untitled'),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].replace(/:/g, '-'),
      index: metadata.index || 0,
      type: metadata.type || 'image',
      id: metadata.taskId || this.generateId()
    };

    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
      filename = filename.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }

    // Add extension
    const ext = this.getExtension(metadata.type);
    if (!filename.endsWith(ext)) {
      filename += ext;
    }

    return filename;
  }

  /**
   * Organize file path by date/type
   */
  organizePath(filename, metadata) {
    let path = '';

    if (this.settings.organizeByDate) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      path += `${year}/${month}-${day}/`;
    }

    if (this.settings.organizeByType && metadata.type) {
      path += `${metadata.type}/`;
    }

    // Remove leading downloadPath if already in filename
    if (this.settings.downloadPath && filename.startsWith(this.settings.downloadPath + '/')) {
      filename = filename.substring(this.settings.downloadPath.length + 1);
    }

    return `${this.settings.downloadPath}/${path}${filename}`;
  }

  /**
   * Get file extension based on type
   */
  getExtension(type) {
    switch (type) {
      case 'text-to-image':
      case 'image-to-image':
        return '.' + (this.settings.imageFormat || 'png');
      case 'text-to-video':
      case 'image-to-video':
        return '.' + (this.settings.videoFormat || 'mp4');
      default:
        return '.png';
    }
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  /**
   * Handle download completion
   */
  async handleDownloadComplete(downloadId) {
    const download = this.downloads.find(d => d.downloadId === downloadId);

    if (download) {
      download.status = 'completed';
      download.completedAt = Date.now();

      await this.saveToStorage();

      // Update statistics
      await this.updateStatistics();

      console.log('Download completed:', downloadId);

      // Show notification if enabled
      if (this.settings.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icons/icon48.png',
          title: 'AutoGrok Download Complete',
          message: `Downloaded: ${download.filename}`
        });
      }
    }
  }

  /**
   * Handle download failure
   */
  async handleDownloadFailed(downloadId, error) {
    const download = this.downloads.find(d => d.downloadId === downloadId);

    if (download) {
      download.status = 'failed';
      download.error = error;
      download.completedAt = Date.now();

      await this.saveToStorage();

      console.error('Download failed:', downloadId, error);

      // Show notification if enabled
      if (this.settings.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icons/icon48.png',
          title: 'AutoGrok Download Failed',
          message: `Failed to download: ${download.filename}`
        });
      }
    }
  }

  /**
   * Get all downloads
   */
  getDownloads() {
    return this.downloads;
  }

  /**
   * Clear download history
   */
  async clearHistory() {
    this.downloads = [];
    await this.saveToStorage();
    return { success: true };
  }

  /**
   * Update statistics
   */
  async updateStatistics() {
    const data = await chrome.storage.local.get('autogrok_statistics');
    const stats = data.autogrok_statistics || {
      totalGenerated: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalDownloaded: 0
    };

    stats.totalDownloaded++;

    await chrome.storage.local.set({ autogrok_statistics: stats });
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
