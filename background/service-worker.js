// AutoGrok Background Service Worker

import { TaskQueue } from './task-queue.js';
import { DownloadManager } from './download-manager.js';
import { StorageManager } from './storage-manager.js';

// Initialize managers
const taskQueue = new TaskQueue();
const downloadManager = new DownloadManager();
const storageManager = new StorageManager();

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('AutoGrok installed/updated', details);

  if (details.reason === 'install') {
    // First time install - set default settings
    await storageManager.initializeDefaults();

    // Open welcome page
    chrome.tabs.create({
      url: 'options/options.html?welcome=true'
    });
  }

  // Load saved state
  await taskQueue.loadFromStorage();
  await downloadManager.loadFromStorage();
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    });

  // Return true to indicate async response
  return true;
});

// Handle messages from popup, content scripts, etc.
async function handleMessage(message, sender) {
  const { type, data } = message;

  switch (type) {
    // Task management
    case 'ADD_TASK':
      return await taskQueue.addTask(data);

    case 'REMOVE_TASK':
      return await taskQueue.removeTask(data.taskId);

    case 'UPDATE_TASK':
      return await taskQueue.updateTask(data.taskId, data.updates);

    case 'REORDER_TASK':
      return await taskQueue.reorderTask(data.taskId, data.newPosition);

    case 'GET_TASKS':
      return taskQueue.getTasks();

    case 'CLEAR_COMPLETED':
      return await taskQueue.clearCompleted();

    // Queue control
    case 'START_QUEUE':
      return await taskQueue.start();

    case 'PAUSE_QUEUE':
      return await taskQueue.pause();

    case 'RESUME_QUEUE':
      return await taskQueue.resume();

    case 'STOP_QUEUE':
      return await taskQueue.stop();

    case 'GET_QUEUE_STATUS':
      return taskQueue.getStatus();

    // Downloads
    case 'DOWNLOAD_FILE':
      return await downloadManager.download(data.url, data.filename, data.metadata);

    case 'GET_DOWNLOADS':
      return downloadManager.getDownloads();

    case 'CLEAR_DOWNLOADS':
      return await downloadManager.clearHistory();

    // Templates
    case 'SAVE_TEMPLATE':
      return await storageManager.saveTemplate(data);

    case 'DELETE_TEMPLATE':
      return await storageManager.deleteTemplate(data.templateId);

    case 'GET_TEMPLATES':
      return await storageManager.getTemplates();

    // Settings
    case 'SAVE_SETTINGS':
      return await storageManager.saveSettings(data);

    case 'GET_SETTINGS':
      return await storageManager.getSettings();

    // Statistics
    case 'GET_STATISTICS':
      return await storageManager.getStatistics();

    case 'UPDATE_STATISTICS':
      return await storageManager.updateStatistics(data);

    // Content script responses
    case 'TASK_COMPLETED':
      await taskQueue.handleTaskCompleted(data.taskId, data.result);

      // Auto-download if enabled
      const settings = await storageManager.getSettings();
      if (settings.autoDownload && data.result.url) {
        await downloadManager.download(
          data.result.url,
          data.result.filename,
          { taskId: data.taskId, prompt: data.result.prompt }
        );
      }
      return { success: true };

    case 'TASK_FAILED':
      await taskQueue.handleTaskFailed(data.taskId, data.error);
      return { success: true };

    // Get active tab for Grok
    case 'GET_GROK_TAB':
      return await findGrokTab();

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

// Find active Grok tab
async function findGrokTab() {
  const tabs = await chrome.tabs.query({ url: 'https://*.x.ai/*' });

  if (tabs.length === 0) {
    return null;
  }

  // Prefer active tab
  const activeTab = tabs.find(tab => tab.active);
  return activeTab || tabs[0];
}

// Listen for download completion
chrome.downloads.onChanged.addListener(async (delta) => {
  if (delta.state?.current === 'complete') {
    await downloadManager.handleDownloadComplete(delta.id);
  } else if (delta.state?.current === 'interrupted') {
    await downloadManager.handleDownloadFailed(delta.id, 'Download interrupted');
  }
});

// Tab updates - check if Grok tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  // If the active task tab was closed, pause the queue
  if (taskQueue.currentTaskTabId === tabId) {
    await taskQueue.pause();
    console.log('Grok tab closed, queue paused');
  }
});

// Keep service worker alive
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Just log to keep worker alive
    console.log('AutoGrok service worker alive');
  }
});

console.log('AutoGrok service worker loaded');
