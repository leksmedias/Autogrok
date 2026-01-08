// AutoGrok Task Manager
// Visual task queue management with drag-and-drop

let tasks = [];
let currentFilter = 'all';
let draggedTaskId = null;

/**
 * Initialize task manager
 */
async function initialize() {
  await loadTasks();
  setupEventListeners();
  renderTasks();

  // Auto-refresh every 2 seconds
  setInterval(async () => {
    await loadTasks();
    renderTasks();
  }, 2000);
}

/**
 * Load tasks from background
 */
async function loadTasks() {
  const response = await sendMessage('GET_TASKS');
  tasks = response.tasks || [];
  updateStatusBar(response);
  updateControls(response.status);
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
 * Update status bar
 */
function updateStatusBar(queueData) {
  document.getElementById('queueStatus').textContent = getStatusText(queueData.status);
  document.getElementById('totalTasks').textContent = queueData.totalTasks || 0;
  document.getElementById('pendingTasks').textContent = queueData.pendingTasks || 0;

  // Processing tasks
  const processingCount = tasks.filter(t => t.status === 'processing').length;
  document.getElementById('processingTasks').textContent = processingCount;

  document.getElementById('completedTasks').textContent = queueData.completedTasks || 0;
  document.getElementById('failedTasks').textContent = queueData.failedTasks || 0;
}

/**
 * Update control buttons
 */
function updateControls(queueStatus) {
  const startBtn = document.getElementById('startQueueBtn');
  const pauseBtn = document.getElementById('pauseQueueBtn');
  const stopBtn = document.getElementById('stopQueueBtn');

  if (queueStatus === 'idle') {
    startBtn.style.display = 'flex';
    startBtn.innerHTML = '<span>▶</span> Start Queue';
    pauseBtn.style.display = 'none';
    stopBtn.style.display = 'none';
  } else if (queueStatus === 'running') {
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'flex';
    stopBtn.style.display = 'flex';
  } else if (queueStatus === 'paused') {
    startBtn.style.display = 'flex';
    startBtn.innerHTML = '<span>▶</span> Resume Queue';
    pauseBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
  }
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
 * Setup event listeners
 */
function setupEventListeners() {
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await loadTasks();
    renderTasks();
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: '../options/options.html' });
  });

  // Queue controls
  document.getElementById('startQueueBtn').addEventListener('click', async () => {
    await sendMessage('START_QUEUE');
    await loadTasks();
  });

  document.getElementById('pauseQueueBtn').addEventListener('click', async () => {
    await sendMessage('PAUSE_QUEUE');
    await loadTasks();
  });

  document.getElementById('stopQueueBtn').addEventListener('click', async () => {
    await sendMessage('STOP_QUEUE');
    await loadTasks();
  });

  // Filter
  document.getElementById('filterStatus').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderTasks();
  });

  // Clear completed
  document.getElementById('clearCompletedBtn').addEventListener('click', async () => {
    if (confirm('Clear all completed tasks?')) {
      await sendMessage('CLEAR_COMPLETED');
      await loadTasks();
      renderTasks();
    }
  });

  // Add task
  document.getElementById('addTaskBtn').addEventListener('click', openAddTaskModal);

  // Add task modal
  document.getElementById('closeAddTaskModal').addEventListener('click', closeAddTaskModal);
  document.getElementById('cancelAddTaskBtn').addEventListener('click', closeAddTaskModal);
  document.getElementById('confirmAddTaskBtn').addEventListener('click', confirmAddTask);

  // Task type change
  document.getElementById('taskType').addEventListener('change', (e) => {
    const imageUploadGroup = document.getElementById('imageUploadGroup');
    if (e.target.value === 'image-to-video' || e.target.value === 'image-to-image') {
      imageUploadGroup.style.display = 'block';
    } else {
      imageUploadGroup.style.display = 'none';
    }
  });
}

/**
 * Render tasks
 */
function renderTasks() {
  const container = document.getElementById('taskList');
  const emptyState = document.getElementById('emptyState');

  // Filter tasks
  let filteredTasks = tasks;
  if (currentFilter !== 'all') {
    filteredTasks = tasks.filter(t => t.status === currentFilter);
  }

  // Clear container
  container.innerHTML = '';

  // Show empty state if no tasks
  if (filteredTasks.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  // Render each task
  filteredTasks.forEach((task, index) => {
    const taskElement = createTaskElement(task, index);
    container.appendChild(taskElement);
  });
}

/**
 * Create task element
 */
function createTaskElement(task, index) {
  const div = document.createElement('div');
  div.className = 'task-item';
  div.draggable = task.status === 'pending'; // Only pending tasks can be dragged
  div.dataset.taskId = task.id;

  // Drag events
  div.addEventListener('dragstart', handleDragStart);
  div.addEventListener('dragend', handleDragEnd);
  div.addEventListener('dragover', handleDragOver);
  div.addEventListener('drop', handleDrop);
  div.addEventListener('dragleave', handleDragLeave);

  // Header
  const header = document.createElement('div');
  header.className = 'task-header';

  const info = document.createElement('div');
  info.className = 'task-info';

  // Type badge
  const typeBadge = document.createElement('span');
  typeBadge.className = `task-type ${task.type}`;
  typeBadge.textContent = formatTaskType(task.type);
  info.appendChild(typeBadge);

  // Prompt
  const prompt = document.createElement('div');
  prompt.className = 'task-prompt';
  prompt.textContent = task.prompt;
  info.appendChild(prompt);

  // Meta info
  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const createdAt = document.createElement('span');
  createdAt.textContent = `Created: ${formatDate(task.createdAt)}`;
  meta.appendChild(createdAt);

  if (task.retries > 0) {
    const retries = document.createElement('span');
    retries.textContent = `Retries: ${task.retries}`;
    meta.appendChild(retries);
  }

  info.appendChild(meta);
  header.appendChild(info);

  // Status badge
  const statusBadge = document.createElement('div');
  statusBadge.className = `task-status ${task.status}`;
  statusBadge.innerHTML = `<span>${getStatusIcon(task.status)}</span> ${formatStatus(task.status)}`;
  header.appendChild(statusBadge);

  div.appendChild(header);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'task-actions';

  // Retry button (for failed tasks)
  if (task.status === 'failed') {
    const retryBtn = document.createElement('button');
    retryBtn.className = 'task-btn task-btn-retry';
    retryBtn.textContent = '↻ Retry';
    retryBtn.onclick = () => retryTask(task.id);
    actions.appendChild(retryBtn);
  }

  // Remove button (for non-processing tasks)
  if (task.status !== 'processing') {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'task-btn task-btn-remove';
    removeBtn.textContent = '× Remove';
    removeBtn.onclick = () => removeTask(task.id);
    actions.appendChild(removeBtn);
  }

  if (actions.children.length > 0) {
    div.appendChild(actions);
  }

  return div;
}

/**
 * Drag and drop handlers
 */
function handleDragStart(e) {
  draggedTaskId = e.currentTarget.dataset.taskId;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.task-item').forEach(item => {
    item.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }

  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');

  return false;
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

async function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  e.currentTarget.classList.remove('drag-over');

  const dropTargetId = e.currentTarget.dataset.taskId;

  if (draggedTaskId !== dropTargetId) {
    // Find positions
    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = tasks.findIndex(t => t.id === dropTargetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Reorder in background
      await sendMessage('REORDER_TASK', {
        taskId: draggedTaskId,
        newPosition: targetIndex
      });

      // Reload and render
      await loadTasks();
      renderTasks();
    }
  }

  return false;
}

/**
 * Remove task
 */
async function removeTask(taskId) {
  if (confirm('Remove this task?')) {
    await sendMessage('REMOVE_TASK', { taskId });
    await loadTasks();
    renderTasks();
  }
}

/**
 * Retry failed task
 */
async function retryTask(taskId) {
  await sendMessage('UPDATE_TASK', {
    taskId,
    updates: { status: 'pending', retries: 0, error: null }
  });
  await loadTasks();
  renderTasks();
}

/**
 * Format helpers
 */
function formatTaskType(type) {
  return type.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatStatus(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusIcon(status) {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'processing':
      return '⚙️';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    default:
      return '●';
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min ago`;
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // Otherwise show date
  return date.toLocaleDateString();
}

/**
 * Add task modal
 */
function openAddTaskModal() {
  document.getElementById('addTaskModal').style.display = 'flex';
  document.getElementById('taskPrompt').value = '';
  document.getElementById('taskType').value = 'text-to-image';
  document.getElementById('imageUploadGroup').style.display = 'none';
}

function closeAddTaskModal() {
  document.getElementById('addTaskModal').style.display = 'none';
}

async function confirmAddTask() {
  const type = document.getElementById('taskType').value;
  const prompt = document.getElementById('taskPrompt').value.trim();

  if (!prompt) {
    alert('Please enter a prompt');
    return;
  }

  const task = {
    type,
    prompt,
    images: null // TODO: Handle image upload
  };

  await sendMessage('ADD_TASK', task);
  await loadTasks();
  renderTasks();
  closeAddTaskModal();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
