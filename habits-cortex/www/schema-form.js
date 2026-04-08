/**
 * Schema Form - Mobile UI Generator
 * 
 * Auto-generates mobile-friendly forms from habit.yaml input/output/env schema.
 * Falls back to inferring inputs from {{habits.input.*}} template references.
 */

// ============================================================================
// Schema Parser
// ============================================================================

/**
 * Parse habit YAML content to extract schema definitions
 * @param {object} habitYaml - Parsed habit.yaml object
 * @returns {object} Schema with inputs, outputs, env fields
 */
function parseHabitSchema(habitYaml) {
  const schema = {
    inputs: [],
    outputs: [],
    env: [],
    hasExplicitSchema: false,
  };

  // Check for explicit input schema (new format)
  if (Array.isArray(habitYaml.input)) {
    schema.hasExplicitSchema = true;
    schema.inputs = habitYaml.input.map(normalizeInputField);
  } else {
    // Fallback: infer inputs from {{habits.input.*}} references in nodes
    schema.inputs = inferInputsFromNodes(habitYaml.nodes || []);
  }

  // Check for explicit env schema (new format)
  if (Array.isArray(habitYaml.env)) {
    schema.env = habitYaml.env.map(normalizeEnvField);
  } else {
    // Fallback: infer env from {{habits.env.*}} references
    schema.env = inferEnvFromNodes(habitYaml.nodes || []);
  }

  // Check for output schema
  if (Array.isArray(habitYaml.output)) {
    // New array format with type hints
    schema.outputs = habitYaml.output.map(normalizeOutputField);
  } else if (habitYaml.output && typeof habitYaml.output === 'object') {
    // Object format - convert to array
    schema.outputs = Object.entries(habitYaml.output).map(([id, value]) => {
      // Check if value is an object with schema properties or just a simple value
      if (value && typeof value === 'object') {
        return normalizeOutputField({
          id,
          ...value,
        });
      }
      // Simple value (e.g., "{{some-node}}")
      return {
        id,
        value,
        type: 'string',
        displayAs: 'text',
        displayName: formatDisplayName(id),
      };
    });
  }

  return schema;
}

/**
 * Normalize input field with defaults
 */
function normalizeInputField(field) {
  // Support both 'id' and 'name' for the field identifier
  const id = field.id || field.name;
  // Support both 'displayName' and 'label' for the display label
  const displayName = field.displayName || field.label || formatDisplayName(id);
  
  return {
    id,
    type: field.type || 'string',
    displayAs: field.displayAs || inferDisplayAs(field.type || 'string', 'input'),
    displayName,
    description: field.description || '',
    required: field.required || false,
    default: field.default,
    placeholder: field.placeholder || '',
    options: field.options || [],
    validation: field.validation || {},
    dependsOn: field.dependsOn,
    showIf: field.showIf,
  };
}

/**
 * Normalize env field with defaults
 */
function normalizeEnvField(field) {
  // Support both 'id' and 'name' for the field identifier
  const id = field.id || field.name;
  // Support both 'displayName' and 'label' for the display label
  const displayName = field.displayName || field.label || formatDisplayName(id);
  
  return {
    id,
    type: field.type || 'string',
    displayName,
    description: field.description || '',
    required: field.required || false,
    secret: field.secret || false,
    default: field.default,
  };
}

/**
 * Normalize output field with defaults
 */
function normalizeOutputField(field) {
  // Support both 'id' and 'name' for the field identifier
  const id = field.id || field.name;
  // Support both 'displayName' and 'label' for the display label
  const displayName = field.displayName || field.label || formatDisplayName(id);
  
  return {
    id,
    value: field.value,
    type: field.type || 'string',
    displayAs: field.displayAs || inferDisplayAs(field.type || 'string', 'output'),
    displayName,
    description: field.description || '',
  };
}

/**
 * Infer input fields from node template references
 */
function inferInputsFromNodes(nodes) {
  const inputs = new Map();
  const inputRegex = /\{\{habits\.input\.([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

  function searchObject(obj) {
    if (!obj) return;
    if (typeof obj === 'string') {
      let match;
      while ((match = inputRegex.exec(obj)) !== null) {
        const id = match[1];
        if (!inputs.has(id)) {
          inputs.set(id, {
            id,
            type: 'string',
            displayAs: 'text',
            displayName: formatDisplayName(id),
            description: '',
            required: false,
          });
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(searchObject);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(searchObject);
    }
  }

  nodes.forEach(searchObject);
  return Array.from(inputs.values());
}

/**
 * Infer env fields from node template references
 */
function inferEnvFromNodes(nodes) {
  const envVars = new Map();
  const envRegex = /\{\{habits\.env\.([A-Z_][A-Z0-9_]*)\}\}/gi;

  function searchObject(obj) {
    if (!obj) return;
    if (typeof obj === 'string') {
      let match;
      while ((match = envRegex.exec(obj)) !== null) {
        const id = match[1];
        if (!envVars.has(id)) {
          // Guess if it's a secret based on common patterns
          const isSecret = /key|token|secret|password|api_key/i.test(id);
          envVars.set(id, {
            id,
            type: 'string',
            displayName: formatDisplayName(id),
            description: '',
            required: true,
            secret: isSecret,
          });
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach(searchObject);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(searchObject);
    }
  }

  nodes.forEach(searchObject);
  return Array.from(envVars.values());
}

/**
 * Infer UI display type from field type
 */
function inferDisplayAs(type, context) {
  const inputMap = {
    string: 'text',
    number: 'number',
    boolean: 'checkbox',
    object: 'json-editor',
    array: 'json-editor',
    json: 'json-editor',
    base64: 'file-picker',
    file: 'file-picker',
    email: 'text',
    url: 'text',
    date: 'date-picker',
    time: 'time-picker',
    datetime: 'datetime-picker',
    secret: 'password',
  };

  const outputMap = {
    string: 'text',
    number: 'text',
    boolean: 'text',
    object: 'json',
    array: 'json',
    json: 'json',
    base64: 'image',
    file: 'download',
    email: 'text',
    url: 'text',
    date: 'text',
    time: 'text',
    datetime: 'text',
    secret: 'hidden',
  };

  const map = context === 'output' ? outputMap : inputMap;
  return map[type] || 'text';
}

/**
 * Format field ID as display name (snake_case -> Title Case)
 */
function formatDisplayName(id) {
  return id
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================================
// Form Generator
// ============================================================================

/**
 * Generate mobile-friendly HTML form from schema
 * @param {object} schema - Parsed schema from parseHabitSchema
 * @param {string} workflowId - Workflow identifier
 * @returns {string} HTML string for the form
 */
function generateFormHtml(schema, workflowId) {
  const formId = `workflow-form-${workflowId}`;
  
  let html = `
    <div class="schema-form" id="${formId}-container">
      <form id="${formId}" class="workflow-input-form" onsubmit="return false;">
  `;

  // Generate input fields
  if (schema.inputs.length > 0) {
    html += `<div class="form-section"><div class="form-section-title">Inputs</div>`;
    for (const field of schema.inputs) {
      html += generateInputFieldHtml(field);
    }
    html += `</div>`;
  }

  // Submit button
  html += `
        <div class="form-actions">
          <button type="submit" class="form-submit-btn" id="${formId}-submit">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Run Workflow
          </button>
        </div>
      </form>
      
      <div id="${formId}-output" class="workflow-output hidden"></div>
    </div>
  `;

  return html;
}

/**
 * Generate HTML for a single input field
 */
function generateInputFieldHtml(field) {
  const fieldId = `field-${field.id}`;
  const required = field.required ? 'required' : '';
  const requiredBadge = field.required ? '<span class="field-required">*</span>' : '';
  
  let inputHtml = '';
  
  switch (field.displayAs) {
    case 'textarea':
      inputHtml = `
        <textarea 
          id="${fieldId}" 
          name="${field.id}" 
          placeholder="${escapeAttr(field.placeholder)}"
          class="form-textarea"
          rows="4"
          ${required}
        >${escapeHtml(field.default || '')}</textarea>
      `;
      break;
      
    case 'number':
      const min = field.validation?.min !== undefined ? `min="${field.validation.min}"` : '';
      const max = field.validation?.max !== undefined ? `max="${field.validation.max}"` : '';
      inputHtml = `
        <input 
          type="number" 
          id="${fieldId}" 
          name="${field.id}" 
          placeholder="${escapeAttr(field.placeholder)}"
          value="${escapeAttr(field.default || '')}"
          class="form-input"
          ${min} ${max}
          ${required}
        />
      `;
      break;
      
    case 'checkbox':
      const checked = field.default ? 'checked' : '';
      inputHtml = `
        <label class="form-checkbox-label">
          <input 
            type="checkbox" 
            id="${fieldId}" 
            name="${field.id}"
            class="form-checkbox"
            ${checked}
          />
          <span class="checkbox-text">${escapeHtml(field.description || 'Enable')}</span>
        </label>
      `;
      break;
      
    case 'dropdown':
    case 'radio':
      if (field.options && field.options.length > 0) {
        if (field.displayAs === 'dropdown') {
          inputHtml = `
            <select id="${fieldId}" name="${field.id}" class="form-select" ${required}>
              <option value="">Select...</option>
              ${field.options.map(opt => `
                <option value="${escapeAttr(opt.value)}" ${field.default === opt.value ? 'selected' : ''}>
                  ${escapeHtml(opt.label || opt.value)}
                </option>
              `).join('')}
            </select>
          `;
        } else {
          inputHtml = `<div class="form-radio-group">`;
          for (const opt of field.options) {
            const checked = field.default === opt.value ? 'checked' : '';
            inputHtml += `
              <label class="form-radio-label">
                <input type="radio" name="${field.id}" value="${escapeAttr(opt.value)}" ${checked} />
                <span>${escapeHtml(opt.label || opt.value)}</span>
              </label>
            `;
          }
          inputHtml += `</div>`;
        }
      } else {
        inputHtml = generateTextInput(field, fieldId, required);
      }
      break;
      
    case 'password':
      inputHtml = `
        <input 
          type="password" 
          id="${fieldId}" 
          name="${field.id}" 
          placeholder="${escapeAttr(field.placeholder)}"
          class="form-input"
          autocomplete="off"
          ${required}
        />
      `;
      break;
      
    case 'date-picker':
      inputHtml = `
        <input 
          type="date" 
          id="${fieldId}" 
          name="${field.id}" 
          value="${escapeAttr(field.default || '')}"
          class="form-input"
          ${required}
        />
      `;
      break;
      
    case 'time-picker':
      inputHtml = `
        <input 
          type="time" 
          id="${fieldId}" 
          name="${field.id}" 
          value="${escapeAttr(field.default || '')}"
          class="form-input"
          ${required}
        />
      `;
      break;
      
    case 'datetime-picker':
      inputHtml = `
        <input 
          type="datetime-local" 
          id="${fieldId}" 
          name="${field.id}" 
          value="${escapeAttr(field.default || '')}"
          class="form-input"
          ${required}
        />
      `;
      break;
      
    case 'file-picker':
      inputHtml = `
        <div class="form-file-picker">
          <input 
            type="text" 
            id="${fieldId}" 
            name="${field.id}" 
            placeholder="Select file..."
            class="form-input form-file-input"
            readonly
            ${required}
          />
          <button type="button" class="form-file-btn" data-field="${field.id}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
          </button>
        </div>
      `;
      break;
      
    case 'json-editor':
      inputHtml = `
        <textarea 
          id="${fieldId}" 
          name="${field.id}" 
          placeholder='${escapeAttr(field.placeholder || '{"key": "value"}')}'
          class="form-textarea form-json-editor"
          rows="6"
          spellcheck="false"
          ${required}
        >${escapeHtml(typeof field.default === 'object' ? JSON.stringify(field.default, null, 2) : (field.default || ''))}</textarea>
      `;
      break;
      
    case 'code-editor':
      inputHtml = `
        <textarea 
          id="${fieldId}" 
          name="${field.id}" 
          placeholder="${escapeAttr(field.placeholder)}"
          class="form-textarea form-code-editor"
          rows="8"
          spellcheck="false"
          ${required}
        >${escapeHtml(field.default || '')}</textarea>
      `;
      break;
      
    case 'text':
    default:
      inputHtml = generateTextInput(field, fieldId, required);
      break;
  }
  
  // Wrap in field container (checkbox has special layout)
  if (field.displayAs === 'checkbox') {
    return `
      <div class="form-field" data-field-id="${field.id}">
        ${inputHtml}
      </div>
    `;
  }
  
  return `
    <div class="form-field" data-field-id="${field.id}">
      <label for="${fieldId}" class="form-label">
        ${escapeHtml(field.displayName)}${requiredBadge}
      </label>
      ${field.description && field.displayAs !== 'checkbox' ? `<div class="form-hint">${escapeHtml(field.description)}</div>` : ''}
      ${inputHtml}
    </div>
  `;
}

function generateTextInput(field, fieldId, required) {
  const inputType = field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text';
  const pattern = field.validation?.pattern ? `pattern="${escapeAttr(field.validation.pattern)}"` : '';
  const minLength = field.validation?.minLength ? `minlength="${field.validation.minLength}"` : '';
  const maxLength = field.validation?.maxLength ? `maxlength="${field.validation.maxLength}"` : '';
  
  return `
    <input 
      type="${inputType}" 
      id="${fieldId}" 
      name="${field.id}" 
      placeholder="${escapeAttr(field.placeholder)}"
      value="${escapeAttr(field.default || '')}"
      class="form-input"
      ${pattern} ${minLength} ${maxLength}
      ${required}
    />
  `;
}

// ============================================================================
// Output Renderer
// ============================================================================

/**
 * Generate HTML for workflow output display
 * @param {object} schema - Parsed schema
 * @param {object} result - Workflow execution result
 * @returns {string} HTML string for output display
 */
function generateOutputHtml(schema, result) {
  if (!result || typeof result !== 'object') {
    return `<div class="output-empty">No output</div>`;
  }

  // Extract actual output values
  const output = result.output || result;
  
  let html = `<div class="output-container">`;
  
  // If we have output schema, use it to render
  if (schema.outputs && schema.outputs.length > 0) {
    for (const field of schema.outputs) {
      let value = getNestedValue(output, field.id);
      // Handle nested output object with value/type/displayAs structure
      if (value && typeof value === 'object' && 'value' in value) {
        value = value.value;
      }
      html += renderOutputField(field, value);
    }
  } else {
    // No schema - render all output keys, handling nested value objects
    for (const [key, rawValue] of Object.entries(output)) {
      // Check if this is a structured output { value, type, displayAs, label }
      if (rawValue && typeof rawValue === 'object' && 'value' in rawValue) {
        const outputDef = {
          id: key,
          displayName: rawValue.label || rawValue.displayName || formatDisplayName(key),
          type: rawValue.type || 'string',
          displayAs: rawValue.displayAs || 'text',
        };
        html += renderOutputField(outputDef, rawValue.value);
      } else {
        // Plain value
        html += renderOutputField({
          id: key,
          displayName: formatDisplayName(key),
          type: typeof rawValue === 'object' ? 'json' : 'string',
          displayAs: typeof rawValue === 'object' ? 'json' : 'text',
        }, rawValue);
      }
    }
  }
  
  html += `</div>`;
  return html;
}

/**
 * Render a single output field
 */
function renderOutputField(field, value) {
  let contentHtml = '';
  
  switch (field.displayAs) {
    case 'json':
      const jsonStr = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      contentHtml = `<pre class="output-json">${escapeHtml(jsonStr)}</pre>`;
      break;
      
    case 'markdown':
      // For now, just display as text - could add markdown renderer later
      contentHtml = `<div class="output-markdown">${escapeHtml(String(value || ''))}</div>`;
      break;
      
    case 'image':
      if (value && typeof value === 'string') {
        const src = value.startsWith('data:') ? value : `data:image/png;base64,${value}`;
        contentHtml = `<img src="${src}" class="output-image" alt="${escapeAttr(field.displayName)}" />`;
      } else {
        contentHtml = `<div class="output-empty">No image</div>`;
      }
      break;
      
    case 'download':
      if (value) {
        contentHtml = `
          <a href="${escapeAttr(value)}" download class="output-download">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download
          </a>
        `;
      } else {
        contentHtml = `<div class="output-empty">No file</div>`;
      }
      break;
      
    case 'code':
      contentHtml = `<pre class="output-code">${escapeHtml(String(value || ''))}</pre>`;
      break;
      
    case 'table':
      if (Array.isArray(value) && value.length > 0) {
        contentHtml = generateTableHtml(value);
      } else {
        contentHtml = `<div class="output-empty">No data</div>`;
      }
      break;
      
    case 'hidden':
      return ''; // Don't render hidden outputs
      
    case 'text':
    default:
      contentHtml = `<div class="output-text">${escapeHtml(String(value ?? ''))}</div>`;
      break;
  }
  
  return `
    <div class="output-field">
      <div class="output-label">${escapeHtml(field.displayName)}</div>
      ${field.description ? `<div class="output-hint">${escapeHtml(field.description)}</div>` : ''}
      ${contentHtml}
    </div>
  `;
}

/**
 * Generate HTML table from array of objects
 */
function generateTableHtml(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  
  const firstRow = data[0];
  if (typeof firstRow !== 'object' || firstRow === null) {
    // Simple array - render as list
    return `<ul class="output-list">${data.map(item => `<li>${escapeHtml(String(item))}</li>`).join('')}</ul>`;
  }
  
  const keys = Object.keys(firstRow);
  
  return `
    <div class="output-table-container">
      <table class="output-table">
        <thead>
          <tr>${keys.map(k => `<th>${escapeHtml(formatDisplayName(k))}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>${keys.map(k => `<td>${escapeHtml(String(row[k] ?? ''))}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Collect form data and convert to workflow input object
 * @param {HTMLFormElement} form 
 * @param {Array} inputFields - Schema input fields
 * @returns {object} Input data for workflow execution
 */
function collectFormData(form, inputFields) {
  const formData = new FormData(form);
  const data = {};
  
  for (const field of inputFields) {
    const rawValue = formData.get(field.id);
    
    // Handle different types
    switch (field.type) {
      case 'number':
        data[field.id] = rawValue ? Number(rawValue) : undefined;
        break;
      case 'boolean':
        data[field.id] = formData.has(field.id);
        break;
      case 'object':
      case 'array':
      case 'json':
        try {
          data[field.id] = rawValue ? JSON.parse(rawValue) : undefined;
        } catch {
          data[field.id] = rawValue;
        }
        break;
      default:
        data[field.id] = rawValue || undefined;
    }
  }
  
  // Remove undefined values
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }
  
  return data;
}

/**
 * Validate form data against schema
 * @param {object} data - Form data
 * @param {Array} inputFields - Schema input fields
 * @returns {{valid: boolean, errors: object}}
 */
function validateFormData(data, inputFields) {
  const errors = {};
  
  for (const field of inputFields) {
    const value = data[field.id];
    
    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      errors[field.id] = `${field.displayName} is required`;
      continue;
    }
    
    // Skip validation if empty and not required
    if (value === undefined || value === null || value === '') continue;
    
    // Type-specific validation
    if (field.validation) {
      const v = field.validation;
      
      if (field.type === 'number') {
        if (v.min !== undefined && value < v.min) {
          errors[field.id] = `${field.displayName} must be at least ${v.min}`;
        }
        if (v.max !== undefined && value > v.max) {
          errors[field.id] = `${field.displayName} must be at most ${v.max}`;
        }
      }
      
      if (field.type === 'string' || !field.type) {
        if (v.minLength && String(value).length < v.minLength) {
          errors[field.id] = `${field.displayName} must be at least ${v.minLength} characters`;
        }
        if (v.maxLength && String(value).length > v.maxLength) {
          errors[field.id] = `${field.displayName} must be at most ${v.maxLength} characters`;
        }
        if (v.pattern && !new RegExp(v.pattern).test(String(value))) {
          errors[field.id] = `${field.displayName} format is invalid`;
        }
      }
      
      if ((field.type === 'array') && Array.isArray(value)) {
        if (v.minItems && value.length < v.minItems) {
          errors[field.id] = `${field.displayName} must have at least ${v.minItems} items`;
        }
        if (v.maxItems && value.length > v.maxItems) {
          errors[field.id] = `${field.displayName} must have at most ${v.maxItems} items`;
        }
      }
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// CSS Styles (injected into page)
// ============================================================================

const SCHEMA_FORM_STYLES = `
/* Schema Form - Mobile-first dark theme */
.schema-form {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #cdd6f4;
  background: #1e1e2e;
}

.form-section {
  margin-bottom: 24px;
}

.form-section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #a6adc8;
  margin-bottom: 12px;
}

.form-field {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #cdd6f4;
  margin-bottom: 6px;
}

.field-required {
  color: #f38ba8;
  margin-left: 2px;
}

.form-hint {
  font-size: 12px;
  color: #6c7086;
  margin-bottom: 6px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 14px;
  font-size: 16px; /* Prevents zoom on iOS */
  color: #cdd6f4;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 8px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #89b4fa;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #6c7086;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-json-editor,
.form-code-editor {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
}

/* Checkbox */
.form-checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 12px 0;
}

.form-checkbox {
  width: 22px;
  height: 22px;
  accent-color: #89b4fa;
}

.checkbox-text {
  font-size: 14px;
  color: #cdd6f4;
}

/* Radio group */
.form-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-radio-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 8px;
  cursor: pointer;
}

.form-radio-label input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: #89b4fa;
}

/* File picker */
.form-file-picker {
  display: flex;
  gap: 8px;
}

.form-file-input {
  flex: 1;
  cursor: pointer;
}

.form-file-btn {
  padding: 12px 16px;
  background: #45475a;
  border: 1px solid #585b70;
  border-radius: 8px;
  color: #cdd6f4;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-file-btn:active {
  background: #585b70;
}

/* Select dropdown */
.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23a6adc8' viewBox='0 0 16 16'%3E%3Cpath d='M4.646 5.646a.5.5 0 0 1 .708 0L8 8.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}

/* Submit button */
.form-actions {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #313244;
}

.form-submit-btn {
  width: 100%;
  padding: 14px 20px;
  font-size: 16px;
  font-weight: 600;
  color: #1e1e2e;
  background: #89b4fa;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s ease;
}

.form-submit-btn:hover {
  background: #b4befe;
}

.form-submit-btn:active {
  transform: scale(0.98);
}

.form-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-submit-btn.loading::after {
  content: '';
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Validation errors */
.form-field.has-error .form-input,
.form-field.has-error .form-select,
.form-field.has-error .form-textarea {
  border-color: #f38ba8;
}

.form-error {
  font-size: 12px;
  color: #f38ba8;
  margin-top: 4px;
}

/* Output styles */
.workflow-output {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #313244;
}

.workflow-output.hidden {
  display: none;
}

.output-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.output-field {
  background: #313244;
  padding: 14px;
  border-radius: 10px;
}

.output-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #a6adc8;
  margin-bottom: 8px;
}

.output-hint {
  font-size: 12px;
  color: #6c7086;
  margin-bottom: 8px;
}

.output-text {
  font-size: 14px;
  color: #cdd6f4;
  word-break: break-word;
}

.output-json,
.output-code {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  color: #a6e3a1;
  background: #1e1e2e;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.output-image {
  max-width: 100%;
  border-radius: 8px;
}

.output-download {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #45475a;
  color: #89b4fa;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
}

.output-empty {
  font-size: 14px;
  color: #6c7086;
  font-style: italic;
}

/* Table */
.output-table-container {
  overflow-x: auto;
}

.output-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.output-table th,
.output-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #45475a;
}

.output-table th {
  font-weight: 600;
  color: #a6adc8;
  background: #1e1e2e;
}

.output-table td {
  color: #cdd6f4;
}

.output-list {
  margin: 0;
  padding-left: 20px;
}

.output-list li {
  padding: 4px 0;
}

/* Success/Error states */
.output-success {
  color: #a6e3a1;
}

.output-error {
  color: #f38ba8;
  background: rgba(243, 139, 168, 0.1);
  padding: 12px;
  border-radius: 8px;
}
`;

/**
 * Inject form styles into document
 */
function injectFormStyles() {
  if (document.getElementById('schema-form-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'schema-form-styles';
  style.textContent = SCHEMA_FORM_STYLES;
  document.head.appendChild(style);
}

// Export for use in runner.js
if (typeof window !== 'undefined') {
  window.SchemaForm = {
    parseHabitSchema,
    generateFormHtml,
    generateOutputHtml,
    collectFormData,
    validateFormData,
    injectFormStyles,
    SCHEMA_FORM_STYLES,
  };
}
