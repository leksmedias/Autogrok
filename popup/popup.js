// AutoGrok Popup Script

// Elements
const elements = {
  statusIndicator: document.getElementById('statusIndicator'),
  statusText: document.getElementById('statusText'),
  totalTasks: document.getElementById('totalTasks'),
  pendingTasks: document.getElementById('pendingTasks'),
  completedTasks: document.getElementById('completedTasks'),
  currentTaskSection: document.getElementById('currentTaskSection'),
  currentTaskPrompt: document.getElementById('currentTaskPrompt'),
  startBtn: document.getElementById('startBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  stopBtn: document.getElementById('stopBtn'),
  quickPrompt: document.getElementById('quickPrompt'),
  taskType: document.getElementById('taskType'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  taskManagerBtn: document.getElementById('taskManagerBtn'),
  templatesBtn: document.getElementById('templatesBtn'),
  downloadsBtn: document.getElementById('downloadsBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  statGenerated: document.getElementById('statGenerated'),
  statDownloaded: document.getElementById('statDownloaded'),
  statFailed: document.getElementById('statFailed')
};

// Initialize
async function initialize() {
  await updateUI();

  // Set up event listeners
  setupEventListeners();

  // Auto-refresh every 2 seconds
  setInterval(updateUI, 2000);
}

/**
 * Update UI with current status
 */
async function updateUI() {
  try {
    // Get queue status
    const queueStatus = await sendMessage('GET_QUEUE_STATUS');

    // Update status
    elements.statusText.textContent = getStatusText(queueStatus.status);
    elements.statusIndicator.className = `status-indicator status-${queueStatus.status}`;

    // Update task counts
    elements.totalTasks.textContent = queueStatus.totalTasks;
    elements.pendingTasks.textContent = queueStatus.pendingTasks;
    elements.completedTasks.textContent = queueStatus.completedTasks;

    // Update current task
    if (queueStatus.currentTask) {
      elements.currentTaskSection.style.display = 'block';
      elements.currentTaskPrompt.textContent = truncateText(queueStatus.currentTask.prompt, 100);
    } else {
      elements.currentTaskSection.style.display = 'none';
    }

    // Update buttons
    if (queueStatus.status === 'idle') {
      elements.startBtn.style.display = 'block';
      elements.pauseBtn.style.display = 'none';
      elements.stopBtn.style.display = 'none';
    } else if (queueStatus.status === 'running') {
      elements.startBtn.style.display = 'none';
      elements.pauseBtn.style.display = 'block';
      elements.stopBtn.style.display = 'block';
    } else if (queueStatus.status === 'paused') {
      elements.startBtn.style.display = 'block';
      elements.startBtn.textContent = '▶ Resume';
      elements.pauseBtn.style.display = 'none';
      elements.stopBtn.style.display = 'block';
    }

    // Get statistics
    const stats = await sendMessage('GET_STATISTICS');
    elements.statGenerated.textContent = stats.totalGenerated || 0;
    elements.statDownloaded.textContent = stats.totalDownloaded || 0;
    elements.statFailed.textContent = stats.totalFailed || 0;

  } catch (error) {
    console.error('Failed to update UI:', error);
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Queue controls
  elements.startBtn.addEventListener('click', async () => {
    await sendMessage('START_QUEUE');
    await updateUI();
  });

  elements.pauseBtn.addEventListener('click', async () => {
    await sendMessage('PAUSE_QUEUE');
    await updateUI();
  });

  elements.stopBtn.addEventListener('click', async () => {
    await sendMessage('STOP_QUEUE');
    await updateUI();
  });

  // Add task
  elements.addTaskBtn.addEventListener('click', async () => {
    const prompt = elements.quickPrompt.value.trim();

    if (!prompt) {
      alert('Please enter a prompt');
      return;
    }

    try {
      await sendMessage('ADD_TASK', {
        type: elements.taskType.value,
        prompt: prompt
      });

      // Clear input
      elements.quickPrompt.value = '';

      // Update UI
      await updateUI();

      // Show feedback
      showNotification('Task added successfully');

    } catch (error) {
      alert('Failed to add task: ' + error.message);
    }
  });

  // Quick links
  elements.taskManagerBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'task-manager/task-manager.html' });
  });

  elements.templatesBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'options/options.html#templates' });
  });

  elements.downloadsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'options/options.html#downloads' });
  });

  elements.settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'options/options.html' });
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
 * Get status text
 */
function getStatusText(status) {
  switch (status) {
    case 'idle':
      return 'Idle';
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    default:
      return 'Unknown';
  }
}

/**
 * Truncate text
 */
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Show notification
 */
function showNotification(message) {
  // Create temporary notification element
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  // Fade in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Fade out and remove
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 2000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
