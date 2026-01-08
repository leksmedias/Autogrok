// AutoGrok Content Script
// This script runs on Grok pages and handles automation

console.log('AutoGrok content script loaded');

// State
let isProcessing = false;
let currentTask = null;
let floatingPanel = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(error => {
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Async response
});

/**
 * Handle messages
 */
async function handleMessage(message) {
  const { type, data } = message;

  switch (type) {
    case 'EXECUTE_TASK':
      return await executeTask(data);

    case 'INJECT_PROMPT':
      return await injectPrompt(data.prompt);

    case 'UPLOAD_IMAGE':
      return await uploadImage(data.imageData);

    case 'CLICK_GENERATE':
      return await clickGenerate();

    case 'MONITOR_PROGRESS':
      return await monitorProgress();

    case 'EXTRACT_RESULT':
      return await extractResult();

    case 'SHOW_PANEL':
      showFloatingPanel();
      return { success: true };

    case 'HIDE_PANEL':
      hideFloatingPanel();
      return { success: true };

    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

/**
 * Execute a task
 */
async function executeTask(task) {
  if (isProcessing) {
    throw new Error('Already processing a task');
  }

  isProcessing = true;
  currentTask = task;

  try {
    console.log('Executing task:', task.id, task.type);

    // Update floating panel
    updateFloatingPanel(task);

    // Wait for page to be ready
    await waitForPageReady();

    // Inject prompt
    await injectPrompt(task.prompt);

    // Handle image upload if needed
    if (task.images && task.images.length > 0) {
      await uploadImages(task.images);
    }

    // Click generate
    await clickGenerate();

    // Monitor progress
    await monitorProgress();

    // Extract result
    const result = await extractResult();

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'TASK_COMPLETED',
      data: {
        taskId: task.id,
        result: {
          ...result,
          prompt: task.prompt
        }
      }
    });

    isProcessing = false;
    currentTask = null;

    return { success: true, result };

  } catch (error) {
    console.error('Task execution failed:', error);

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'TASK_FAILED',
      data: {
        taskId: task.id,
        error: error.message
      }
    });

    isProcessing = false;
    currentTask = null;

    throw error;
  }
}

/**
 * Wait for page to be ready
 */
async function waitForPageReady() {
  // Wait for prompt input to be available
  await waitForElement(SELECTORS.promptInput);

  // Additional wait for dynamic content
  await sleep(500);
}

/**
 * Inject prompt into input field
 */
async function injectPrompt(prompt) {
  const input = await waitForElement(SELECTORS.promptInput);

  if (!input) {
    throw new Error(ERROR_MESSAGES.NO_PROMPT_INPUT);
  }

  // Clear existing content
  input.value = '';

  // Set new prompt
  input.value = prompt;

  // Trigger input events
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  console.log('Prompt injected:', prompt.substring(0, 50) + '...');

  return { success: true };
}

/**
 * Upload images
 */
async function uploadImages(images) {
  const fileInput = await waitForElement(SELECTORS.imageUpload, 5000);

  if (!fileInput) {
    throw new Error('Image upload input not found');
  }

  // Create DataTransfer object
  const dataTransfer = new DataTransfer();

  for (const imageData of images) {
    // Convert base64 to blob if needed
    const blob = await fetch(imageData).then(r => r.blob());
    const file = new File([blob], 'image.png', { type: 'image/png' });
    dataTransfer.items.add(file);
  }

  // Set files
  fileInput.files = dataTransfer.files;

  // Trigger change event
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));

  console.log('Images uploaded:', images.length);

  // Wait for images to be processed
  await sleep(1000);

  return { success: true };
}

/**
 * Click generate button
 */
async function clickGenerate() {
  const button = await waitForElement(SELECTORS.generateButton);

  if (!button) {
    throw new Error(ERROR_MESSAGES.NO_GENERATE_BUTTON);
  }

  // Check if button is disabled
  if (button.disabled || button.hasAttribute('disabled')) {
    throw new Error('Generate button is disabled');
  }

  // Click the button
  button.click();

  console.log('Generate button clicked');

  // Wait a bit for generation to start
  await sleep(1000);

  return { success: true };
}

/**
 * Monitor generation progress
 */
async function monitorProgress() {
  console.log('Monitoring progress...');

  const startTime = Date.now();
  const maxTime = TIMEOUTS.GENERATION;

  while (true) {
    // Check timeout
    if (Date.now() - startTime > maxTime) {
      throw new Error(ERROR_MESSAGES.TIMEOUT);
    }

    // Check if loading indicator is gone
    const loadingIndicator = document.querySelector(SELECTORS.loadingIndicator);
    const progressBar = document.querySelector(SELECTORS.progressBar);

    if (!loadingIndicator && !progressBar) {
      // Check if result is available
      const result = document.querySelector(SELECTORS.resultContainer) ||
                     document.querySelector(SELECTORS.imageElement) ||
                     document.querySelector(SELECTORS.videoElement);

      if (result) {
        console.log('Generation complete');
        break;
      }
    }

    // Wait before next check
    await sleep(1000);
  }

  // Additional wait for result to fully load
  await sleep(1000);

  return { success: true };
}

/**
 * Extract result (image/video URL)
 */
async function extractResult() {
  // Try to find image
  let resultElement = document.querySelector(SELECTORS.imageElement);
  let type = 'image';
  let url = null;
  let filename = null;

  if (resultElement && resultElement.src) {
    url = resultElement.src;
    type = 'image';
  } else {
    // Try video
    resultElement = document.querySelector(SELECTORS.videoElement);
    if (resultElement && resultElement.src) {
      url = resultElement.src;
      type = 'video';
    }
  }

  if (!url) {
    // Try download button
    const downloadButton = document.querySelector(SELECTORS.downloadButton);
    if (downloadButton && downloadButton.href) {
      url = downloadButton.href;
    }
  }

  if (!url) {
    throw new Error('Could not extract result URL');
  }

  console.log('Result extracted:', url);

  return {
    url,
    type,
    filename: filename || `autogrok_${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`
  };
}

/**
 * Create and show floating control panel
 */
function showFloatingPanel() {
  if (floatingPanel) {
    floatingPanel.style.display = 'block';
    return;
  }

  floatingPanel = document.createElement('div');
  floatingPanel.id = 'autogrok-panel';
  floatingPanel.className = 'autogrok-floating-panel';

  floatingPanel.innerHTML = `
    <div class="autogrok-panel-header">
      <span class="autogrok-panel-title">AutoGrok</span>
      <button class="autogrok-panel-minimize">−</button>
    </div>
    <div class="autogrok-panel-content">
      <div class="autogrok-panel-status">Idle</div>
      <div class="autogrok-panel-task"></div>
      <div class="autogrok-panel-progress">
        <div class="autogrok-progress-bar"></div>
      </div>
      <div class="autogrok-panel-controls">
        <button class="autogrok-btn autogrok-btn-pause">Pause</button>
        <button class="autogrok-btn autogrok-btn-stop">Stop</button>
      </div>
    </div>
  `;

  document.body.appendChild(floatingPanel);

  // Event listeners
  floatingPanel.querySelector('.autogrok-panel-minimize').addEventListener('click', () => {
    floatingPanel.classList.toggle('minimized');
  });

  floatingPanel.querySelector('.autogrok-btn-pause').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_QUEUE' });
  });

  floatingPanel.querySelector('.autogrok-btn-stop').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_QUEUE' });
  });
}

/**
 * Hide floating panel
 */
function hideFloatingPanel() {
  if (floatingPanel) {
    floatingPanel.style.display = 'none';
  }
}

/**
 * Update floating panel with task info
 */
function updateFloatingPanel(task) {
  if (!floatingPanel) {
    showFloatingPanel();
  }

  const statusElement = floatingPanel.querySelector('.autogrok-panel-status');
  const taskElement = floatingPanel.querySelector('.autogrok-panel-task');

  if (statusElement) {
    statusElement.textContent = 'Processing';
  }

  if (taskElement) {
    taskElement.textContent = truncateText(task.prompt, 50);
  }
}

/**
 * Initialize on page load
 */
function initialize() {
  console.log('AutoGrok initialized on:', window.location.href);

  // Show floating panel
  showFloatingPanel();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
