// AutoGrok Task Queue Manager

export class TaskQueue {
  constructor() {
    this.tasks = [];
    this.currentTask = null;
    this.currentTaskTabId = null;
    this.status = 'idle'; // idle, running, paused
    this.settings = null;
  }

  /**
   * Load tasks from storage
   */
  async loadFromStorage() {
    const data = await chrome.storage.local.get(['autogrok_tasks', 'autogrok_queue_status', 'autogrok_settings']);
    this.tasks = data.autogrok_tasks || [];
    this.status = data.autogrok_queue_status || 'idle';
    this.settings = data.autogrok_settings || {};

    console.log('Loaded tasks from storage:', this.tasks.length);
  }

  /**
   * Save tasks to storage
   */
  async saveToStorage() {
    await chrome.storage.local.set({
      autogrok_tasks: this.tasks,
      autogrok_queue_status: this.status
    });
  }

  /**
   * Add task to queue
   */
  async addTask(taskData) {
    const task = {
      id: this.generateId(),
      type: taskData.type,
      prompt: taskData.prompt,
      images: taskData.images || null,
      status: 'pending',
      config: taskData.config || {},
      createdAt: Date.now(),
      completedAt: null,
      result: null,
      error: null,
      retries: 0
    };

    this.tasks.push(task);
    await this.saveToStorage();

    console.log('Task added:', task.id);

    // Auto-start if enabled and queue is idle
    if (this.settings.autoStart && this.status === 'idle') {
      await this.start();
    }

    return task;
  }

  /**
   * Add multiple tasks at once
   */
  async addTasks(tasksData) {
    const tasks = tasksData.map(taskData => ({
      id: this.generateId(),
      type: taskData.type,
      prompt: taskData.prompt,
      images: taskData.images || null,
      status: 'pending',
      config: taskData.config || {},
      createdAt: Date.now(),
      completedAt: null,
      result: null,
      error: null,
      retries: 0
    }));

    this.tasks.push(...tasks);
    await this.saveToStorage();

    console.log('Tasks added:', tasks.length);

    // Auto-start if enabled
    if (this.settings.autoStart && this.status === 'idle') {
      await this.start();
    }

    return tasks;
  }

  /**
   * Remove task from queue
   */
  async removeTask(taskId) {
    const index = this.tasks.findIndex(t => t.id === taskId);

    if (index === -1) {
      throw new Error('Task not found');
    }

    // Can't remove currently processing task
    if (this.currentTask && this.currentTask.id === taskId) {
      throw new Error('Cannot remove task that is currently processing');
    }

    this.tasks.splice(index, 1);
    await this.saveToStorage();

    return { success: true };
  }

  /**
   * Update task
   */
  async updateTask(taskId, updates) {
    const task = this.tasks.find(t => t.id === taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    Object.assign(task, updates);
    await this.saveToStorage();

    return task;
  }

  /**
   * Reorder task in queue
   */
  async reorderTask(taskId, newPosition) {
    const currentIndex = this.tasks.findIndex(t => t.id === taskId);

    if (currentIndex === -1) {
      throw new Error('Task not found');
    }

    const task = this.tasks.splice(currentIndex, 1)[0];
    this.tasks.splice(newPosition, 0, task);

    await this.saveToStorage();

    return { success: true };
  }

  /**
   * Get all tasks
   */
  getTasks() {
    return {
      tasks: this.tasks,
      currentTask: this.currentTask,
      status: this.status
    };
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      status: this.status,
      totalTasks: this.tasks.length,
      pendingTasks: this.tasks.filter(t => t.status === 'pending').length,
      completedTasks: this.tasks.filter(t => t.status === 'completed').length,
      failedTasks: this.tasks.filter(t => t.status === 'failed').length,
      currentTask: this.currentTask
    };
  }

  /**
   * Clear completed tasks
   */
  async clearCompleted() {
    this.tasks = this.tasks.filter(t => t.status !== 'completed');
    await this.saveToStorage();
    return { success: true };
  }

  /**
   * Start queue processing
   */
  async start() {
    if (this.status === 'running') {
      console.log('Queue already running');
      return { success: false, message: 'Queue already running' };
    }

    this.status = 'running';
    await this.saveToStorage();

    console.log('Queue started');
    await this.processNext();

    return { success: true };
  }

  /**
   * Pause queue
   */
  async pause() {
    this.status = 'paused';
    await this.saveToStorage();

    console.log('Queue paused');
    return { success: true };
  }

  /**
   * Resume queue
   */
  async resume() {
    if (this.status !== 'paused') {
      return { success: false, message: 'Queue is not paused' };
    }

    this.status = 'running';
    await this.saveToStorage();

    console.log('Queue resumed');
    await this.processNext();

    return { success: true };
  }

  /**
   * Stop queue and clear current task
   */
  async stop() {
    this.status = 'idle';
    this.currentTask = null;
    this.currentTaskTabId = null;
    await this.saveToStorage();

    console.log('Queue stopped');
    return { success: true };
  }

  /**
   * Process next task in queue
   */
  async processNext() {
    if (this.status !== 'running') {
      console.log('Queue not running, skipping processNext');
      return;
    }

    // Find next pending task
    const nextTask = this.tasks.find(t => t.status === 'pending');

    if (!nextTask) {
      console.log('No more tasks to process');
      this.status = 'idle';
      this.currentTask = null;
      await this.saveToStorage();
      return;
    }

    // Set as current task
    this.currentTask = nextTask;
    nextTask.status = 'processing';
    await this.saveToStorage();

    console.log('Processing task:', nextTask.id);

    try {
      // Find or create Grok tab
      const tab = await this.findOrCreateGrokTab(nextTask.type);
      this.currentTaskTabId = tab.id;

      // Wait for page to load
      await this.waitForTabLoad(tab.id);

      // Inject prompt and execute task
      await this.executeTask(tab.id, nextTask);

    } catch (error) {
      console.error('Task execution error:', error);
      await this.handleTaskFailed(nextTask.id, error.message);
    }
  }

  /**
   * Execute task in content script
   */
  async executeTask(tabId, task) {
    // Send task to content script
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_TASK',
      data: task
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Task execution failed');
    }

    // Content script will handle the rest and send back completion/failure message
  }

  /**
   * Handle task completion
   */
  async handleTaskCompleted(taskId, result) {
    const task = this.tasks.find(t => t.id === taskId);

    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    task.status = 'completed';
    task.result = result;
    task.completedAt = Date.now();

    await this.saveToStorage();

    console.log('Task completed:', taskId);

    // Update statistics
    await this.updateStatistics('completed');

    // Wait for task delay before next task
    if (this.settings.taskDelay) {
      await new Promise(resolve => setTimeout(resolve, this.settings.taskDelay));
    }

    // Process next task
    this.currentTask = null;
    await this.processNext();
  }

  /**
   * Handle task failure
   */
  async handleTaskFailed(taskId, error) {
    const task = this.tasks.find(t => t.id === taskId);

    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    task.retries++;

    // Retry if under max attempts
    if (task.retries < (this.settings.retryAttempts || 3)) {
      console.log(`Task ${taskId} failed, retrying (${task.retries}/${this.settings.retryAttempts})`);

      task.status = 'pending';
      task.error = error;

      await this.saveToStorage();

      // Wait before retry
      if (this.settings.retryDelay) {
        await new Promise(resolve => setTimeout(resolve, this.settings.retryDelay * task.retries));
      }

      // Process next (will pick up this task again)
      this.currentTask = null;
      await this.processNext();

    } else {
      // Max retries reached, mark as failed
      console.log(`Task ${taskId} failed permanently after ${task.retries} retries`);

      task.status = 'failed';
      task.error = error;
      task.completedAt = Date.now();

      await this.saveToStorage();

      // Update statistics
      await this.updateStatistics('failed');

      // Process next task
      this.currentTask = null;
      await this.processNext();
    }
  }

  /**
   * Find or create Grok tab
   */
  async findOrCreateGrokTab(taskType) {
    // Try to find existing Grok tab
    const tabs = await chrome.tabs.query({ url: 'https://*.x.ai/*' });

    // Determine target URL based on task type
    let targetUrl = 'https://grok.x.ai/';

    if (taskType === 'text-to-image' || taskType === 'image-to-image') {
      targetUrl = 'https://grok.x.ai/imagine'; // Adjust based on actual Grok URL
    }

    // If we have a matching tab, use it
    const matchingTab = tabs.find(tab => tab.url.includes(targetUrl));
    if (matchingTab) {
      // Make sure it's active
      await chrome.tabs.update(matchingTab.id, { active: true });
      return matchingTab;
    }

    // Otherwise create new tab
    const newTab = await chrome.tabs.create({ url: targetUrl });
    return newTab;
  }

  /**
   * Wait for tab to finish loading
   */
  async waitForTabLoad(tabId) {
    return new Promise((resolve) => {
      const checkTab = async () => {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          // Wait a bit more for dynamic content
          setTimeout(resolve, 1000);
        } else {
          setTimeout(checkTab, 100);
        }
      };
      checkTab();
    });
  }

  /**
   * Update statistics
   */
  async updateStatistics(type) {
    const data = await chrome.storage.local.get('autogrok_statistics');
    const stats = data.autogrok_statistics || {
      totalGenerated: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalDownloaded: 0
    };

    if (type === 'completed') {
      stats.totalGenerated++;
      stats.totalCompleted++;
    } else if (type === 'failed') {
      stats.totalFailed++;
    }

    await chrome.storage.local.set({ autogrok_statistics: stats });
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
