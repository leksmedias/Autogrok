// AutoGrok Options Page

let settings = {};

// Initialize
async function initialize() {
  await loadSettings();
  setupTabs();
  setupEventListeners();

  // Initialize template manager
  if (typeof initializeTemplateManager === 'function') {
    await initializeTemplateManager();
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  const response = await sendMessage('GET_SETTINGS');
  settings = response;

  // Populate form fields
  document.getElementById('autoStart').checked = settings.autoStart || false;
  document.getElementById('notifications').checked = settings.notifications !== false;
  document.getElementById('taskDelay').value = settings.taskDelay || 1000;
  document.getElementById('retryAttempts').value = settings.retryAttempts || 3;
  document.getElementById('retryDelay').value = settings.retryDelay || 2000;
  document.getElementById('autoDownload').checked = settings.autoDownload !== false;
  document.getElementById('downloadPath').value = settings.downloadPath || 'AutoGrok';
  document.getElementById('filenameTemplate').value = settings.filenameTemplate || '{prompt}_{timestamp}';
  document.getElementById('organizeByDate').checked = settings.organizeByDate !== false;
  document.getElementById('organizeByType').checked = settings.organizeByType !== false;
  document.getElementById('imageFormat').value = settings.imageFormat || 'png';
  document.getElementById('videoFormat').value = settings.videoFormat || 'mp4';
  document.getElementById('maxPromptLength').value = settings.maxPromptLength || 500;
}

/**
 * Save settings
 */
async function saveSettings() {
  const newSettings = {
    autoStart: document.getElementById('autoStart').checked,
    notifications: document.getElementById('notifications').checked,
    taskDelay: parseInt(document.getElementById('taskDelay').value),
    retryAttempts: parseInt(document.getElementById('retryAttempts').value),
    retryDelay: parseInt(document.getElementById('retryDelay').value),
    autoDownload: document.getElementById('autoDownload').checked,
    downloadPath: document.getElementById('downloadPath').value,
    filenameTemplate: document.getElementById('filenameTemplate').value,
    organizeByDate: document.getElementById('organizeByDate').checked,
    organizeByType: document.getElementById('organizeByType').checked,
    imageFormat: document.getElementById('imageFormat').value,
    videoFormat: document.getElementById('videoFormat').value,
    maxPromptLength: parseInt(document.getElementById('maxPromptLength').value)
  };

  await sendMessage('SAVE_SETTINGS', newSettings);
  settings = newSettings;

  showSaveMessage('Settings saved successfully!', 'success');
}

/**
 * Setup tabs
 */
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // Check URL hash for initial tab
  const hash = window.location.hash.substring(1);
  if (hash) {
    const targetTab = document.querySelector(`.tab[data-tab="${hash}"]`);
    if (targetTab) {
      targetTab.click();
    }
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Export settings
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const data = await sendMessage('GET_SETTINGS');
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autogrok-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import settings
  document.getElementById('importBtn').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      const text = await file.text();
      const data = JSON.parse(text);
      await sendMessage('SAVE_SETTINGS', data);
      await loadSettings();
      showSaveMessage('Settings imported successfully!', 'success');
    };
    input.click();
  });

  // Reset settings
  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
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
      await sendMessage('SAVE_SETTINGS', defaultSettings);
      await loadSettings();
      showSaveMessage('Settings reset to defaults!', 'success');
    }
  });
}

/**
 * Send message to background script
 */
async function sendMessage(type, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, data }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response && response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Show save message
 */
function showSaveMessage(message, type = 'success') {
  const messageEl = document.getElementById('saveMessage');
  messageEl.textContent = message;
  messageEl.className = `save-message ${type} show`;

  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 3000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
