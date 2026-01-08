// AutoGrok Template Engine
// Handles advanced prompt template processing with variables

/**
 * Template Variable Types
 */
const VARIABLE_TYPES = {
  TEXT: 'text',           // Single text value
  RANDOM: 'random',       // Random selection from list
  SELECT: 'select',       // User selects from list
  NUMBER: 'number',       // Numeric value
  RANGE: 'range',         // Number range (generates multiple)
  LIST: 'list'            // List of values (generates multiple)
};

/**
 * Template Engine Class
 */
class TemplateEngine {
  constructor() {
    this.templates = [];
  }

  /**
   * Apply template to a single prompt
   */
  applyTemplate(prompt, template) {
    let result = prompt;

    // Add prefix
    if (template.prefix) {
      result = template.prefix.trim() + ' ' + result;
    }

    // Add suffix
    if (template.suffix) {
      result = result + ' ' + template.suffix.trim();
    }

    // Replace variables with their values
    if (template.variables && template.variables.length > 0) {
      template.variables.forEach(variable => {
        const value = this.getVariableValue(variable);
        const regex = new RegExp(`\\{${variable.name}\\}`, 'g');
        result = result.replace(regex, value);
      });
    }

    return result.trim();
  }

  /**
   * Get value for a single variable instance
   */
  getVariableValue(variable) {
    switch (variable.type) {
      case VARIABLE_TYPES.TEXT:
        return variable.value || '';

      case VARIABLE_TYPES.RANDOM:
        if (!variable.values || variable.values.length === 0) return '';
        return variable.values[Math.floor(Math.random() * variable.values.length)];

      case VARIABLE_TYPES.SELECT:
        return variable.value || (variable.values && variable.values[0]) || '';

      case VARIABLE_TYPES.NUMBER:
        return String(variable.value || 0);

      case VARIABLE_TYPES.RANGE:
        return String(variable.value || variable.min || 0);

      case VARIABLE_TYPES.LIST:
        return variable.value || (variable.values && variable.values[0]) || '';

      default:
        return '';
    }
  }

  /**
   * Generate all combinations from template and variables
   * This creates multiple prompts from a single template with variable combinations
   */
  generateCombinations(basePrompt, template) {
    if (!template.variables || template.variables.length === 0) {
      // No variables, just apply template once
      return [this.applyTemplate(basePrompt, template)];
    }

    // Separate single-value and multi-value variables
    const multiValueVars = template.variables.filter(v =>
      v.type === VARIABLE_TYPES.RANGE ||
      v.type === VARIABLE_TYPES.LIST ||
      (v.type === VARIABLE_TYPES.RANDOM && v.generateAll)
    );

    const singleValueVars = template.variables.filter(v =>
      !multiValueVars.includes(v)
    );

    // If no multi-value variables, just generate one prompt
    if (multiValueVars.length === 0) {
      return [this.applyTemplate(basePrompt, template)];
    }

    // Generate all combinations
    const combinations = this.generateVariableCombinations(multiValueVars);

    // Create prompts for each combination
    return combinations.map(combination => {
      let prompt = basePrompt;

      // Add prefix
      if (template.prefix) {
        prompt = template.prefix.trim() + ' ' + prompt;
      }

      // Add suffix
      if (template.suffix) {
        prompt = prompt + ' ' + template.suffix.trim();
      }

      // Replace multi-value variables with combination values
      combination.forEach(({ name, value }) => {
        const regex = new RegExp(`\\{${name}\\}`, 'g');
        prompt = prompt.replace(regex, value);
      });

      // Replace single-value variables
      singleValueVars.forEach(variable => {
        const value = this.getVariableValue(variable);
        const regex = new RegExp(`\\{${variable.name}\\}`, 'g');
        prompt = prompt.replace(regex, value);
      });

      return prompt.trim();
    });
  }

  /**
   * Generate all combinations of multi-value variables
   */
  generateVariableCombinations(variables) {
    if (variables.length === 0) {
      return [[]];
    }

    const [first, ...rest] = variables;
    const firstValues = this.getVariableValues(first);
    const restCombinations = this.generateVariableCombinations(rest);

    const combinations = [];
    firstValues.forEach(value => {
      restCombinations.forEach(restCombo => {
        combinations.push([
          { name: first.name, value },
          ...restCombo
        ]);
      });
    });

    return combinations;
  }

  /**
   * Get all possible values for a variable (for combination generation)
   */
  getVariableValues(variable) {
    switch (variable.type) {
      case VARIABLE_TYPES.RANGE:
        const min = variable.min || 0;
        const max = variable.max || 10;
        const step = variable.step || 1;
        const values = [];
        for (let i = min; i <= max; i += step) {
          values.push(String(i));
        }
        return values;

      case VARIABLE_TYPES.LIST:
        return variable.values || [];

      case VARIABLE_TYPES.RANDOM:
        if (variable.generateAll) {
          return variable.values || [];
        }
        return [this.getVariableValue(variable)];

      default:
        return [this.getVariableValue(variable)];
    }
  }

  /**
   * Generate batch prompts from text input
   * Handles multiple prompts (one per line) with optional template application
   */
  generateBatchPrompts(text, template = null, options = {}) {
    // Parse prompts from text
    const prompts = this.parsePromptsFromText(text);

    if (!template) {
      return prompts;
    }

    // Apply template to each prompt
    const results = [];
    prompts.forEach(prompt => {
      if (options.generateCombinations && template.variables && template.variables.length > 0) {
        // Generate all combinations for this prompt
        const combinations = this.generateCombinations(prompt, template);
        results.push(...combinations);
      } else {
        // Just apply template once
        results.push(this.applyTemplate(prompt, template));
      }
    });

    return results;
  }

  /**
   * Parse prompts from text (line by line)
   */
  parsePromptsFromText(text) {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  /**
   * Parse CSV-style prompts
   */
  parsePromptsFromCSV(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // First line might be headers
    const hasHeaders = lines[0].includes(',') && !lines[0].match(/^["\'].*["\']$/);

    if (hasHeaders) {
      return lines.slice(1).map(line => {
        // Simple CSV parsing (doesn't handle complex cases)
        return line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''))[0];
      });
    }

    return lines;
  }

  /**
   * Create task objects from prompts
   */
  createTasksFromPrompts(prompts, taskType = 'text-to-image', config = {}) {
    return prompts.map((prompt, index) => ({
      type: taskType,
      prompt: prompt,
      images: config.images || null,
      config: {
        ...config,
        index: index
      }
    }));
  }

  /**
   * Validate template
   */
  validateTemplate(template) {
    const errors = [];

    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required');
    }

    if (template.variables && template.variables.length > 0) {
      template.variables.forEach((variable, index) => {
        if (!variable.name || variable.name.trim() === '') {
          errors.push(`Variable ${index + 1}: Name is required`);
        }

        if (variable.type === VARIABLE_TYPES.RANGE) {
          if (variable.min === undefined || variable.max === undefined) {
            errors.push(`Variable ${variable.name}: Range requires min and max values`);
          }
          if (variable.min > variable.max) {
            errors.push(`Variable ${variable.name}: Min cannot be greater than max`);
          }
        }

        if (variable.type === VARIABLE_TYPES.LIST && (!variable.values || variable.values.length === 0)) {
          errors.push(`Variable ${variable.name}: List requires at least one value`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Preview template output
   */
  previewTemplate(basePrompt, template, maxPreviews = 10) {
    const prompts = this.generateCombinations(basePrompt, template);

    return {
      total: prompts.length,
      previews: prompts.slice(0, maxPreviews),
      truncated: prompts.length > maxPreviews
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TemplateEngine,
    VARIABLE_TYPES
  };
}
