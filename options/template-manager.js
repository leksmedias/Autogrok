// AutoGrok Template Manager UI
// Handles template editing, variables, and batch generation

// Import template engine (loaded via script tag)
const templateEngine = new TemplateEngine();

let templates = [];
let currentEditingTemplate = null;
let currentEditingIndex = -1;

/**
 * Initialize template manager
 */
async function initializeTemplateManager() {
  await loadTemplates();
  renderTemplatesList();
  setupTemplateEventListeners();
}

/**
 * Load templates from storage
 */
async function loadTemplates() {
  const response = await sendMessage('GET_TEMPLATES');
  templates = response || [];
}

/**
 * Save templates to storage
 */
async function saveTemplates() {
  for (const template of templates) {
    await sendMessage('SAVE_TEMPLATE', template);
  }
}

/**
 * Render templates list
 */
function renderTemplatesList() {
  const container = document.getElementById('templatesList');
  const selectElement = document.getElementById('batchTemplate');

  if (!container) return;

  // Clear existing
  container.innerHTML = '';
  if (selectElement) {
    selectElement.innerHTML = '<option value="">None</option>';
  }

  if (templates.length === 0) {
    container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No templates yet. Click "Add Template" to create one!</p>';
    return;
  }

  templates.forEach((template, index) => {
    // Create template card
    const card = document.createElement('div');
    card.className = 'template-item';

    const header = document.createElement('div');
    header.className = 'template-header';

    const name = document.createElement('div');
    name.className = 'template-name';
    name.textContent = template.name;

    const actions = document.createElement('div');
    actions.className = 'template-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'template-btn template-btn-edit';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => editTemplate(index);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'template-btn template-btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteTemplate(index);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(name);
    header.appendChild(actions);

    const details = document.createElement('div');
    details.className = 'template-details';

    if (template.prefix) {
      const prefixDetail = document.createElement('div');
      prefixDetail.className = 'template-detail';
      prefixDetail.innerHTML = `<span class="template-label">Prefix:</span> ${template.prefix}`;
      details.appendChild(prefixDetail);
    }

    if (template.suffix) {
      const suffixDetail = document.createElement('div');
      suffixDetail.className = 'template-detail';
      suffixDetail.innerHTML = `<span class="template-label">Suffix:</span> ${template.suffix}`;
      details.appendChild(suffixDetail);
    }

    if (template.variables && template.variables.length > 0) {
      const varsDetail = document.createElement('div');
      varsDetail.className = 'template-detail';
      const varNames = template.variables.map(v => `{${v.name}}`).join(', ');
      varsDetail.innerHTML = `<span class="template-label">Variables:</span> ${varNames}`;
      details.appendChild(varsDetail);
    }

    card.appendChild(header);
    card.appendChild(details);
    container.appendChild(card);

    // Add to batch template select
    if (selectElement) {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      selectElement.appendChild(option);
    }
  });
}

/**
 * Setup event listeners
 */
function setupTemplateEventListeners() {
  // Add template button
  const addBtn = document.getElementById('addTemplateBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => openTemplateEditor());
  }

  // Template editor close
  const closeBtn = document.getElementById('closeTemplateEditor');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeTemplateEditor);
  }

  // Cancel button
  const cancelBtn = document.getElementById('cancelTemplateBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeTemplateEditor);
  }

  // Save template button
  const saveBtn = document.getElementById('saveTemplateBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveTemplate);
  }

  // Add variable button
  const addVarBtn = document.getElementById('addVariableBtn');
  if (addVarBtn) {
    addVarBtn.addEventListener('click', addVariable);
  }

  // Preview prompt input
  const previewInput = document.getElementById('previewPrompt');
  if (previewInput) {
    previewInput.addEventListener('input', updatePreview);
  }

  // Batch generator buttons
  const previewBatchBtn = document.getElementById('previewBatchBtn');
  if (previewBatchBtn) {
    previewBatchBtn.addEventListener('click', previewBatch);
  }

  const generateBatchBtn = document.getElementById('generateBatchBtn');
  if (generateBatchBtn) {
    generateBatchBtn.addEventListener('click', generateBatch);
  }

  // Watch for changes in template fields to update preview
  ['templatePrefix', 'templateSuffix'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updatePreview);
    }
  });
}

/**
 * Open template editor (new or edit)
 */
function openTemplateEditor(template = null, index = -1) {
  currentEditingTemplate = template;
  currentEditingIndex = index;

  const modal = document.getElementById('templateEditorModal');
  const title = document.getElementById('templateEditorTitle');

  if (template) {
    title.textContent = 'Edit Template';
    document.getElementById('templateName').value = template.name || '';
    document.getElementById('templatePrefix').value = template.prefix || '';
    document.getElementById('templateSuffix').value = template.suffix || '';

    // Render variables
    renderVariables(template.variables || []);
  } else {
    title.textContent = 'Add Template';
    document.getElementById('templateName').value = '';
    document.getElementById('templatePrefix').value = '';
    document.getElementById('templateSuffix').value = '';
    renderVariables([]);
  }

  modal.style.display = 'flex';
  updatePreview();
}

/**
 * Close template editor
 */
function closeTemplateEditor() {
  const modal = document.getElementById('templateEditorModal');
  modal.style.display = 'none';
  currentEditingTemplate = null;
  currentEditingIndex = -1;
}

/**
 * Save template
 */
async function saveTemplate() {
  const name = document.getElementById('templateName').value.trim();
  const prefix = document.getElementById('templatePrefix').value.trim();
  const suffix = document.getElementById('templateSuffix').value.trim();

  if (!name) {
    alert('Please enter a template name');
    return;
  }

  const variables = getVariablesFromUI();

  const template = {
    id: currentEditingTemplate?.id || `template_${Date.now()}`,
    name,
    prefix,
    suffix,
    variables,
    enabled: true
  };

  // Validate
  const validation = templateEngine.validateTemplate(template);
  if (!validation.valid) {
    alert('Validation errors:\n' + validation.errors.join('\n'));
    return;
  }

  if (currentEditingIndex >= 0) {
    // Update existing
    templates[currentEditingIndex] = template;
  } else {
    // Add new
    templates.push(template);
  }

  await saveTemplates();
  renderTemplatesList();
  closeTemplateEditor();
  showSaveMessage('Template saved!', 'success');
}

/**
 * Edit template
 */
function editTemplate(index) {
  openTemplateEditor(templates[index], index);
}

/**
 * Delete template
 */
async function deleteTemplate(index) {
  if (!confirm('Delete this template?')) {
    return;
  }

  const template = templates[index];
  templates.splice(index, 1);

  await sendMessage('DELETE_TEMPLATE', { templateId: template.id });
  renderTemplatesList();
  showSaveMessage('Template deleted', 'success');
}

/**
 * Render variables UI
 */
function renderVariables(variables) {
  const container = document.getElementById('variablesList');
  if (!container) return;

  container.innerHTML = '';

  variables.forEach((variable, index) => {
    container.appendChild(createVariableElement(variable, index));
  });

  updatePreview();
}

/**
 * Create variable UI element
 */
function createVariableElement(variable, index) {
  const div = document.createElement('div');
  div.className = 'variable-item';
  div.dataset.index = index;

  const header = document.createElement('div');
  header.className = 'variable-header';

  // Name input
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'variable-input';
  nameInput.placeholder = 'Variable name (e.g., style)';
  nameInput.value = variable.name || '';
  nameInput.addEventListener('input', updatePreview);

  // Type select
  const typeSelect = document.createElement('select');
  typeSelect.className = 'variable-select';
  typeSelect.innerHTML = `
    <option value="text">Text</option>
    <option value="random">Random</option>
    <option value="list">List</option>
    <option value="range">Range</option>
  `;
  typeSelect.value = variable.type || 'text';
  typeSelect.addEventListener('change', () => {
    updateVariableInputs(div, typeSelect.value);
    updatePreview();
  });

  // Remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'variable-remove';
  removeBtn.textContent = '×';
  removeBtn.onclick = () => {
    div.remove();
    updatePreview();
  };

  header.appendChild(nameInput);
  header.appendChild(typeSelect);
  header.appendChild(removeBtn);
  div.appendChild(header);

  // Add type-specific inputs
  updateVariableInputs(div, variable.type || 'text', variable);

  return div;
}

/**
 * Update variable inputs based on type
 */
function updateVariableInputs(container, type, variable = {}) {
  // Remove existing inputs
  const existingValues = container.querySelector('.variable-values');
  if (existingValues) {
    existingValues.remove();
  }

  const valuesDiv = document.createElement('div');
  valuesDiv.className = 'variable-values';

  switch (type) {
    case 'text':
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'variable-values-input';
      textInput.placeholder = 'Value';
      textInput.value = variable.value || '';
      textInput.addEventListener('input', updatePreview);
      valuesDiv.appendChild(textInput);
      break;

    case 'random':
    case 'list':
      const listInput = document.createElement('input');
      listInput.type = 'text';
      listInput.className = 'variable-values-input';
      listInput.placeholder = 'Values (comma-separated)';
      listInput.value = variable.values ? variable.values.join(', ') : '';
      listInput.addEventListener('input', updatePreview);
      valuesDiv.appendChild(listInput);
      break;

    case 'range':
      const rangeDiv = document.createElement('div');
      rangeDiv.style.display = 'flex';
      rangeDiv.style.gap = '8px';

      const minInput = document.createElement('input');
      minInput.type = 'number';
      minInput.className = 'variable-input';
      minInput.placeholder = 'Min';
      minInput.value = variable.min || 0;
      minInput.addEventListener('input', updatePreview);

      const maxInput = document.createElement('input');
      maxInput.type = 'number';
      maxInput.className = 'variable-input';
      maxInput.placeholder = 'Max';
      maxInput.value = variable.max || 10;
      maxInput.addEventListener('input', updatePreview);

      const stepInput = document.createElement('input');
      stepInput.type = 'number';
      stepInput.className = 'variable-input';
      stepInput.placeholder = 'Step';
      stepInput.value = variable.step || 1;
      stepInput.addEventListener('input', updatePreview);

      rangeDiv.appendChild(minInput);
      rangeDiv.appendChild(maxInput);
      rangeDiv.appendChild(stepInput);
      valuesDiv.appendChild(rangeDiv);
      break;
  }

  container.appendChild(valuesDiv);
}

/**
 * Add new variable
 */
function addVariable() {
  const container = document.getElementById('variablesList');
  if (!container) return;

  const variable = {
    name: '',
    type: 'text',
    value: ''
  };

  container.appendChild(createVariableElement(variable, container.children.length));
}

/**
 * Get variables from UI
 */
function getVariablesFromUI() {
  const container = document.getElementById('variablesList');
  if (!container) return [];

  const variables = [];

  container.querySelectorAll('.variable-item').forEach(item => {
    const nameInput = item.querySelector('.variable-input');
    const typeSelect = item.querySelector('.variable-select');
    const valuesDiv = item.querySelector('.variable-values');

    if (!nameInput || !typeSelect) return;

    const variable = {
      name: nameInput.value.trim(),
      type: typeSelect.value
    };

    if (!variable.name) return;

    // Get type-specific values
    switch (variable.type) {
      case 'text':
        const textInput = valuesDiv.querySelector('input');
        variable.value = textInput ? textInput.value : '';
        break;

      case 'random':
      case 'list':
        const listInput = valuesDiv.querySelector('input');
        const listValue = listInput ? listInput.value : '';
        variable.values = listValue.split(',').map(v => v.trim()).filter(v => v);
        if (variable.type === 'random') {
          variable.generateAll = true; // For batch generation
        }
        break;

      case 'range':
        const inputs = valuesDiv.querySelectorAll('input');
        variable.min = inputs[0] ? parseInt(inputs[0].value) : 0;
        variable.max = inputs[1] ? parseInt(inputs[1].value) : 10;
        variable.step = inputs[2] ? parseInt(inputs[2].value) : 1;
        break;
    }

    variables.push(variable);
  });

  return variables;
}

/**
 * Update template preview
 */
function updatePreview() {
  const previewPrompt = document.getElementById('previewPrompt').value;
  const prefix = document.getElementById('templatePrefix').value;
  const suffix = document.getElementById('templateSuffix').value;
  const variables = getVariablesFromUI();

  const template = { prefix, suffix, variables };

  const preview = templateEngine.previewTemplate(previewPrompt, template, 10);

  const output = document.getElementById('previewOutput');
  if (!output) return;

  if (preview.total === 0) {
    output.innerHTML = '<em style="color: #999;">Enter a prompt to see preview</em>';
    return;
  }

  let html = '';

  if (preview.total > 1) {
    html += `<div class="preview-count">${preview.total} prompts will be generated</div>`;
  }

  preview.previews.forEach(prompt => {
    html += `<div class="preview-item">${prompt}</div>`;
  });

  if (preview.truncated) {
    html += `<div class="preview-item"><em style="color: #999;">... and ${preview.total - preview.previews.length} more</em></div>`;
  }

  output.innerHTML = html;
}

/**
 * Preview batch generation
 */
async function previewBatch() {
  const promptsText = document.getElementById('batchPrompts').value;
  const templateId = document.getElementById('batchTemplate').value;
  const generateCombinations = document.getElementById('generateCombinations').checked;

  if (!promptsText.trim()) {
    alert('Please enter some prompts');
    return;
  }

  const template = templateId ? templates.find(t => t.id === templateId) : null;

  const prompts = templateEngine.generateBatchPrompts(promptsText, template, { generateCombinations });

  const previewDiv = document.getElementById('batchPreview');
  const previewContent = document.getElementById('batchPreviewContent');

  let html = `<div class="preview-count">${prompts.length} tasks will be created</div>`;

  prompts.slice(0, 20).forEach((prompt, index) => {
    html += `<div class="batch-preview-item">${index + 1}. ${prompt}</div>`;
  });

  if (prompts.length > 20) {
    html += `<div class="batch-preview-item"><em>... and ${prompts.length - 20} more</em></div>`;
  }

  previewContent.innerHTML = html;
  previewDiv.style.display = 'block';
}

/**
 * Generate batch tasks
 */
async function generateBatch() {
  const promptsText = document.getElementById('batchPrompts').value;
  const templateId = document.getElementById('batchTemplate').value;
  const generateCombinations = document.getElementById('generateCombinations').checked;

  if (!promptsText.trim()) {
    alert('Please enter some prompts');
    return;
  }

  const template = templateId ? templates.find(t => t.id === templateId) : null;

  const prompts = templateEngine.generateBatchPrompts(promptsText, template, { generateCombinations });

  const tasks = templateEngine.createTasksFromPrompts(prompts, 'text-to-image');

  // Add all tasks
  const response = await sendMessage('ADD_TASKS', tasks);

  if (response && response.length > 0) {
    alert(`${response.length} tasks added to queue!`);

    // Clear inputs
    document.getElementById('batchPrompts').value = '';
    document.getElementById('batchPreview').style.display = 'none';
  } else {
    alert('Failed to add tasks');
  }
}

// Export for use in options.js
window.initializeTemplateManager = initializeTemplateManager;
