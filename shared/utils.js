// AutoGrok Utility Functions

/**
 * Generate a unique ID
 */
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for element to appear in DOM
 */
async function waitForElement(selector, timeout = TIMEOUTS.ELEMENT_WAIT) {
  return new Promise((resolve, reject) => {
    // Check if element already exists
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    // Set up observer
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Timeout
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Wait for condition to be true
 */
async function waitForCondition(conditionFn, timeout = 10000, interval = 100) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (conditionFn()) {
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Condition timeout'));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
}

/**
 * Sleep/delay utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate filename from template
 */
function generateFilename(template, data) {
  let filename = template;

  // Replace variables
  const replacements = {
    '{prompt}': sanitizeFilename(data.prompt || 'untitled'),
    '{timestamp}': new Date().getTime(),
    '{date}': new Date().toISOString().split('T')[0],
    '{time}': new Date().toTimeString().split(' ')[0].replace(/:/g, '-'),
    '{index}': data.index || 0,
    '{type}': data.type || 'image',
    '{id}': data.id || generateId()
  };

  for (const [key, value] of Object.entries(replacements)) {
    filename = filename.replace(new RegExp(key, 'g'), value);
  }

  return filename;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename) {
  // Remove invalid characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100); // Limit length
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Truncate text
 */
function truncateText(text, maxLength = 50) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Parse prompts from text (line by line)
 */
function parsePrompts(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Apply template to prompt
 */
function applyTemplate(prompt, template) {
  let result = prompt;

  if (template.prefix) {
    result = template.prefix + ' ' + result;
  }

  if (template.suffix) {
    result = result + ' ' + template.suffix;
  }

  // Replace variables
  if (template.variables) {
    template.variables.forEach(variable => {
      const regex = new RegExp(`\\{${variable.name}\\}`, 'g');
      const value = getVariableValue(variable);
      result = result.replace(regex, value);
    });
  }

  return result.trim();
}

/**
 * Get value for a variable
 */
function getVariableValue(variable) {
  switch (variable.type) {
    case 'text':
      return variable.value || '';
    case 'random':
      return variable.values[Math.floor(Math.random() * variable.values.length)];
    case 'select':
      return variable.value || variable.values[0];
    case 'number':
      return variable.value || 0;
    default:
      return '';
  }
}

/**
 * Generate combinations of prompts with variables
 */
function generateCombinations(basePrompt, variables) {
  if (!variables || variables.length === 0) {
    return [basePrompt];
  }

  // Start with base prompt
  let combinations = [basePrompt];

  // For each variable, multiply combinations
  variables.forEach(variable => {
    const newCombinations = [];
    const values = variable.type === 'random' ? variable.values : [getVariableValue(variable)];

    combinations.forEach(combo => {
      values.forEach(value => {
        const regex = new RegExp(`\\{${variable.name}\\}`, 'g');
        newCombinations.push(combo.replace(regex, value));
      });
    });

    combinations = newCombinations;
  });

  return combinations;
}

/**
 * Send message to background script
 */
async function sendMessage(type, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, data }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Send message to content script
 */
async function sendMessageToTab(tabId, type, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type, data }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Get storage data
 */
async function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

/**
 * Set storage data
 */
async function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

/**
 * Download file from URL
 */
async function downloadFile(url, filename, options = {}) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url,
      filename,
      conflictAction: options.conflictAction || 'uniquify',
      saveAs: options.saveAs || false
    }, downloadId => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(downloadId);
      }
    });
  });
}

/**
 * Retry function with exponential backoff
 */
async function retry(fn, maxAttempts = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await sleep(delay * attempt);
    }
  }
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateId,
    waitForElement,
    waitForCondition,
    sleep,
    generateFilename,
    sanitizeFilename,
    formatFileSize,
    formatDuration,
    truncateText,
    parsePrompts,
    applyTemplate,
    getVariableValue,
    generateCombinations,
    sendMessage,
    sendMessageToTab,
    getStorage,
    setStorage,
    downloadFile,
    retry,
    debounce,
    throttle
  };
}
