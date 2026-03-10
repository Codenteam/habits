/**
 * Frontend Blocks Compiler
 * 
 * Browser-friendly compiler that renders frontend.yaml → HTML
 * Works in both browser and Node.js environments.
 * 
 * Usage (Browser):
 *   import { compile, renderToDocument } from './compiler.js';
 *   const html = compile(yamlConfig, blocks);
 *   document.body.innerHTML = html;
 * 
 * Usage (Node.js):
 *   import { compile } from './compiler.js';
 *   import { blocks } from './blocks.js';
 *   const html = compile(yamlConfig, blocks);
 */

import { blocks, customStyles, runtimeScript } from './blocks.js';

/**
 * Recursively render a block and its children
 * @param {Object} block - Block definition from YAML
 * @param {Object} blockRegistry - Map of block types to implementations
 * @returns {string} Rendered HTML
 */
function renderBlock(block, blockRegistry) {
  const blockDef = blockRegistry[block.type];
  
  if (!blockDef) {
    console.error(`Unknown block type: ${block.type}`);
    return `<!-- Unknown block: ${block.type} -->`;
  }

  // Render children recursively
  let childrenHtml = '';
  if (block.children && Array.isArray(block.children)) {
    childrenHtml = block.children
      .map(child => renderBlock(child, blockRegistry))
      .join('\n');
  }

  // Render this block
  const props = block.props || {};
  return blockDef.render(props, childrenHtml);
}

/**
 * Compile a YAML config object into an HTML string
 * @param {Object} config - Parsed YAML configuration
 * @param {Object} blockRegistry - Block definitions (defaults to imported blocks)
 * @returns {string} Complete HTML document
 */
export function compile(config, blockRegistry = blocks) {
  if (!config) {
    throw new Error('Config is undefined or null');
  }
  if (!config.blocks || !Array.isArray(config.blocks)) {
    throw new Error(`Config.blocks must be an array. Got: ${typeof config.blocks}`);
  }
  
  // Render all root-level blocks
  const bodyContent = config.blocks
    .map(block => renderBlock(block, blockRegistry))
    .join('\n');

  return bodyContent;
}

/**
 * Compile to a complete HTML document (with head, tailwind, scripts)
 * @param {Object} config - Parsed YAML configuration
 * @param {Object} blockRegistry - Block definitions
 * @returns {string} Complete HTML document
 */
export function compileToDocument(config, blockRegistry = blocks) {
  const bodyContent = compile(config, blockRegistry);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title || 'Habits Frontend'}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    ${customStyles}
</head>
<body>
${bodyContent}
${runtimeScript}
</body>
</html>`;
}

/**
 * Render directly to a DOM element (browser only)
 * @param {Object} config - Parsed YAML configuration  
 * @param {HTMLElement} container - DOM element to render into
 * @param {Object} blockRegistry - Block definitions
 */
export function renderToElement(config, container, blockRegistry = blocks) {
  const html = compile(config, blockRegistry);
  container.innerHTML = html;
  
  // Re-run any initialization scripts
  initializeInteractivity();
}

/**
 * Initialize interactivity after DOM render (for JIT rendering)
 */
export function initializeInteractivity() {
  let selectedFormat = 'solo';

  // Format buttons
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-btn').forEach(b => {
        b.classList.remove('active', 'border-cyan-400', 'bg-cyan-400/20');
      });
      btn.classList.add('active', 'border-cyan-400', 'bg-cyan-400/20');
      selectedFormat = btn.dataset.format;
      const guestGroup = document.getElementById('guest-group');
      if (guestGroup) {
        guestGroup.style.display = ['interview', 'debate'].includes(selectedFormat) ? 'block' : 'none';
      }
    });
  });

  // Form submission
  const form = document.getElementById('episode-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('submitBtn');
      const loading = document.getElementById('loading');
      const createSection = document.getElementById('create-section');
      const historySection = document.getElementById('history-section');

      submitBtn.disabled = true;
      loading.classList.remove('hidden');
      if (createSection) createSection.style.display = 'none';
      if (historySection) historySection.style.display = 'none';

      try {
        const response = await fetch('/api/generate-episode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: document.getElementById('topic').value,
            format: selectedFormat,
            duration: parseInt(document.getElementById('duration').value),
            podcastName: document.getElementById('podcastName').value || undefined,
            hostName: document.getElementById('hostName').value || undefined,
            guestName: document.getElementById('guestName').value || undefined,
            notes: document.getElementById('notes').value || undefined
          })
        });

        const data = await response.json();
        window.displayResults(data);
        window.loadHistory();
      } catch (error) {
        alert('Error: ' + error.message);
        if (createSection) createSection.style.display = 'block';
        if (historySection) historySection.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        loading.classList.add('hidden');
      }
    });
  }

  // Load history on init
  if (typeof window !== 'undefined' && window.loadHistory) {
    window.loadHistory();
  }
}

// Export blocks for external use
export { blocks, customStyles, runtimeScript };
