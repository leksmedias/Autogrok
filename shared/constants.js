// AutoGrok Constants

// Task Types
const TASK_TYPES = {
  TEXT_TO_IMAGE: 'text-to-image',
  TEXT_TO_VIDEO: 'text-to-video',
  IMAGE_TO_VIDEO: 'image-to-video',
  IMAGE_TO_IMAGE: 'image-to-image',
  UPSCALE: 'upscale',
  REMOVE_BG: 'remove-background'
};

// Task Status
const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused'
};

// Queue Status
const QUEUE_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  ERROR: 'error'
};

// Message Types for communication between components
const MESSAGE_TYPES = {
  // Task management
  ADD_TASK: 'ADD_TASK',
  REMOVE_TASK: 'REMOVE_TASK',
  UPDATE_TASK: 'UPDATE_TASK',
  REORDER_TASK: 'REORDER_TASK',
  GET_TASKS: 'GET_TASKS',

  // Queue control
  START_QUEUE: 'START_QUEUE',
  PAUSE_QUEUE: 'PAUSE_QUEUE',
  RESUME_QUEUE: 'RESUME_QUEUE',
  STOP_QUEUE: 'STOP_QUEUE',
  GET_QUEUE_STATUS: 'GET_QUEUE_STATUS',

  // Downloads
  DOWNLOAD_FILE: 'DOWNLOAD_FILE',
  GET_DOWNLOADS: 'GET_DOWNLOADS',

  // Templates
  SAVE_TEMPLATE: 'SAVE_TEMPLATE',
  DELETE_TEMPLATE: 'DELETE_TEMPLATE',
  GET_TEMPLATES: 'GET_TEMPLATES',

  // Settings
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  GET_SETTINGS: 'GET_SETTINGS',

  // Content script communication
  INJECT_PROMPT: 'INJECT_PROMPT',
  UPLOAD_IMAGE: 'UPLOAD_IMAGE',
  CLICK_GENERATE: 'CLICK_GENERATE',
  MONITOR_PROGRESS: 'MONITOR_PROGRESS',
  EXTRACT_RESULT: 'EXTRACT_RESULT',

  // Notifications
  TASK_STARTED: 'TASK_STARTED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_FAILED: 'TASK_FAILED',
  DOWNLOAD_COMPLETE: 'DOWNLOAD_COMPLETE'
};

// Default Settings
const DEFAULT_SETTINGS = {
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

// Grok Interface Selectors (these may need to be updated based on actual Grok UI)
const SELECTORS = {
  // Input elements
  promptInput: 'textarea[placeholder*="Imagine"], textarea[name="prompt"], #prompt-input',
  generateButton: 'button[type="submit"], button:has-text("Generate"), button:has-text("Create")',
  imageUpload: 'input[type="file"][accept*="image"]',

  // Result containers
  resultContainer: '.result-container, .generated-image, .image-result',
  videoContainer: '.video-container, .generated-video, .video-result',
  imageElement: 'img[src*="generated"], img[src*="result"]',
  videoElement: 'video[src*="generated"], video[src*="result"]',
  downloadButton: 'button:has-text("Download"), a[download]',

  // Progress indicators
  progressBar: '.progress, .loading, [role="progressbar"]',
  loadingIndicator: '.spinner, .loading, .generating',

  // Advanced features
  upscaleButton: 'button:has-text("Upscale"), button[aria-label*="upscale"]',
  removeBgButton: 'button:has-text("Remove Background"), button:has-text("Remove BG")',

  // Imagine page (infinite scroll)
  imagineContainer: '.imagine-page, .gallery, .image-grid',
  imagineImage: '.imagine-page img, .gallery img, .grid-item img'
};

// Storage Keys
const STORAGE_KEYS = {
  TASKS: 'autogrok_tasks',
  QUEUE_STATUS: 'autogrok_queue_status',
  TEMPLATES: 'autogrok_templates',
  SETTINGS: 'autogrok_settings',
  DOWNLOADS: 'autogrok_downloads',
  STATISTICS: 'autogrok_statistics'
};

// Error Messages
const ERROR_MESSAGES = {
  NO_PROMPT_INPUT: 'Could not find prompt input field',
  NO_GENERATE_BUTTON: 'Could not find generate button',
  GENERATION_FAILED: 'Generation failed',
  DOWNLOAD_FAILED: 'Download failed',
  UPLOAD_FAILED: 'Image upload failed',
  TIMEOUT: 'Operation timed out',
  NETWORK_ERROR: 'Network error occurred'
};

// Timeouts (milliseconds)
const TIMEOUTS = {
  ELEMENT_WAIT: 10000,
  GENERATION: 120000,
  DOWNLOAD: 30000,
  UPLOAD: 15000
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TASK_TYPES,
    TASK_STATUS,
    QUEUE_STATUS,
    MESSAGE_TYPES,
    DEFAULT_SETTINGS,
    SELECTORS,
    STORAGE_KEYS,
    ERROR_MESSAGES,
    TIMEOUTS
  };
}
