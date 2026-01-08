// AutoGrok Storage Manager

export class StorageManager {
  constructor() {
    this.settings = null;
    this.templates = [];
  }

  /**
   * Initialize default settings on first install
   */
  async initializeDefaults() {
    const defaultSettings = {
      autoDownload: true,
      downloadPath: 'AutoGrok',
      filenameTemplate: '{prompt}_{timestamp}_{index}',
      maxConcurrent: 1,
      retryAttempts: 3,
      retryDelay: 2000,
      taskDelay: 1000,
      autoStart: false,
      notifications: true,
      imageFormat: 'png',
      videoFormat: 'mp4',
      maxPromptLength: 500,
      organizeByDate: true,
      organizeByType: true
    };

    const defaultTemplates = [
      {
        id: 'default_1',
        name: 'Cinematic',
        prefix: 'cinematic, dramatic lighting',
        suffix: 'high quality, 4k, professional',
        variables: [],
        enabled: true
      },
      {
        id: 'default_2',
        name: 'Artistic',
        prefix: 'artistic, creative',
        suffix: 'detailed, masterpiece',
        variables: [],
        enabled: true
      }
    ];

    const defaultStatistics = {
      totalGenerated: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalDownloaded: 0
    };

    await chrome.storage.local.set({
      autogrok_settings: defaultSettings,
      autogrok_templates: defaultTemplates,
      autogrok_statistics: defaultStatistics,
      autogrok_tasks: [],
      autogrok_downloads: []
    });

    console.log('Default settings initialized');
  }

  /**
   * Get settings
   */
  async getSettings() {
    const data = await chrome.storage.local.get('autogrok_settings');
    this.settings = data.autogrok_settings || {};
    return this.settings;
  }

  /**
   * Save settings
   */
  async saveSettings(settings) {
    await chrome.storage.local.set({
      autogrok_settings: settings
    });

    this.settings = settings;
    console.log('Settings saved');

    return { success: true };
  }

  /**
   * Get templates
   */
  async getTemplates() {
    const data = await chrome.storage.local.get('autogrok_templates');
    this.templates = data.autogrok_templates || [];
    return this.templates;
  }

  /**
   * Save template
   */
  async saveTemplate(template) {
    // Add ID if new template
    if (!template.id) {
      template.id = this.generateId();
    }

    // Find existing template
    const existingIndex = this.templates.findIndex(t => t.id === template.id);

    if (existingIndex >= 0) {
      // Update existing
      this.templates[existingIndex] = template;
    } else {
      // Add new
      this.templates.push(template);
    }

    await chrome.storage.local.set({
      autogrok_templates: this.templates
    });

    console.log('Template saved:', template.id);

    return template;
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    this.templates = this.templates.filter(t => t.id !== templateId);

    await chrome.storage.local.set({
      autogrok_templates: this.templates
    });

    console.log('Template deleted:', templateId);

    return { success: true };
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const data = await chrome.storage.local.get('autogrok_statistics');
    return data.autogrok_statistics || {
      totalGenerated: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalDownloaded: 0
    };
  }

  /**
   * Update statistics
   */
  async updateStatistics(updates) {
    const stats = await this.getStatistics();

    Object.assign(stats, updates);

    await chrome.storage.local.set({
      autogrok_statistics: stats
    });

    return stats;
  }

  /**
   * Export all data
   */
  async exportData() {
    const data = await chrome.storage.local.get(null);

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: data.autogrok_settings || {},
      templates: data.autogrok_templates || [],
      statistics: data.autogrok_statistics || {}
    };

    return exportData;
  }

  /**
   * Import data
   */
  async importData(importData) {
    const updates = {};

    if (importData.settings) {
      updates.autogrok_settings = importData.settings;
    }

    if (importData.templates) {
      updates.autogrok_templates = importData.templates;
    }

    await chrome.storage.local.set(updates);

    console.log('Data imported successfully');

    return { success: true };
  }

  /**
   * Clear all data
   */
  async clearAllData() {
    await chrome.storage.local.clear();
    await this.initializeDefaults();

    console.log('All data cleared');

    return { success: true };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
