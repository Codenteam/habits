/**
 * Frontend Blocks Registry for AI Podcast
 * 
 * All styling uses Tailwind CSS classes only.
 * Browser-compatible - no Node.js dependencies.
 * 
 * Each block defines:
 * - render: function(props, children) => HTML string with Tailwind classes
 */

export const blocks = {
  /**
   * Page wrapper - dark theme with gradient background
   */
  'ui-page': {
    render: (props, children) => `
      <div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white font-sans">
        <div class="max-w-4xl mx-auto">
          ${children}
        </div>
      </div>
    `
  },

  /**
   * Header with icon, title, and subtitle
   */
  'ui-header': {
    render: (props) => `
      <div class="text-6xl text-center mb-5">${props.icon || ''}</div>
      <h1 class="text-4xl font-bold text-center mb-2">${props.title || ''}</h1>
      <p class="text-center text-white/80 mb-8">${props.subtitle || ''}</p>
    `
  },

  /**
   * Card container with glass morphism effect
   */
  'ui-card': {
    render: (props, children) => `
      <div class="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 mb-5"${props.id ? ` id="${props.id}"` : ''}>
        ${props.title ? `<h2 class="text-xl font-semibold mb-6 text-cyan-400">${props.title}</h2>` : ''}
        ${children}
      </div>
    `
  },

  /**
   * Form wrapper
   */
  'ui-form': {
    render: (props, children) => `
      <form id="${props.id || 'form'}" class="space-y-5">
        ${children}
      </form>
    `
  },

  /**
   * Textarea input field
   */
  'ui-textarea': {
    render: (props) => `
      <div class="mb-5">
        <label class="block mb-2 text-white/90">${props.label || ''}</label>
        <textarea 
          id="${props.name}" 
          ${props.required ? 'required' : ''} 
          placeholder="${props.placeholder || ''}"
          class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400 resize-y min-h-20"
        ></textarea>
      </div>
    `
  },

  /**
   * Text input field
   */
  'ui-input': {
    render: (props) => `
      <div class="mb-5"${props.id ? ` id="${props.id}"` : ''}>
        <label class="block mb-2 text-white/90">${props.label || ''}</label>
        <input 
          type="${props.type || 'text'}" 
          id="${props.name}" 
          placeholder="${props.placeholder || ''}"
          class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-cyan-400"
        >
      </div>
    `
  },

  /**
   * Select dropdown
   */
  'ui-select': {
    render: (props) => {
      const options = (props.options || []).map(opt => 
        `<option value="${opt.value}"${opt.selected ? ' selected' : ''} class="bg-slate-900">${opt.label}</option>`
      ).join('\n');
      return `
        <div class="mb-5">
          <label class="block mb-2 text-white/90">${props.label || ''}</label>
          <select id="${props.name}" class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-400">
            ${options}
          </select>
        </div>
      `;
    }
  },

  /**
   * Two-column form row
   */
  'ui-form-row': {
    render: (props, children) => `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${children}
      </div>
    `
  },

  /**
   * Format selection grid (radio-like buttons)
   */
  'ui-format-grid': {
    render: (props) => {
      const options = (props.options || []).map((opt, i) => `
        <div class="format-btn p-4 bg-white/10 border-2 border-white/20 rounded-xl cursor-pointer text-center transition-all hover:border-cyan-400 ${i === 0 ? 'border-cyan-400 bg-cyan-400/20' : ''}" data-format="${opt.value}">
          <div class="text-2xl mb-1">${opt.icon}</div>
          <div class="text-sm">${opt.label}</div>
        </div>
      `).join('');
      return `
        <div class="mb-5">
          <label class="block mb-2 text-white/90">${props.label || ''}</label>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3" data-name="${props.name}">
            ${options}
          </div>
        </div>
      `;
    }
  },

  /**
   * Submit button with gradient
   */
  'ui-button': {
    render: (props) => `
      <button 
        type="submit" 
        id="${props.id || 'submitBtn'}"
        class="w-full py-4 px-8 bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-bold text-lg rounded-xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
      >${props.text || 'Submit'}</button>
    `
  },

  /**
   * Loading animation with waveform
   */
  'ui-loading': {
    render: (props) => `
      <div class="hidden text-center py-16" id="${props.id || 'loading'}">
        <div class="flex gap-1 justify-center h-12 items-center mb-5">
          <div class="w-1.5 h-5 bg-cyan-400 rounded animate-wave"></div>
          <div class="w-1.5 h-9 bg-cyan-400 rounded animate-wave animation-delay-100"></div>
          <div class="w-1.5 h-12 bg-cyan-400 rounded animate-wave animation-delay-200"></div>
          <div class="w-1.5 h-9 bg-cyan-400 rounded animate-wave animation-delay-300"></div>
          <div class="w-1.5 h-5 bg-cyan-400 rounded animate-wave animation-delay-400"></div>
        </div>
        <p class="text-white/80">${props.message || 'Loading...'}</p>
      </div>
    `
  },

  /**
   * Results container
   */
  'ui-results': {
    render: (props, children) => `
      <div class="hidden" id="${props.id || 'results'}">
        ${children}
      </div>
    `
  },

  /**
   * Back button
   */
  'ui-back-button': {
    render: (props) => `
      <button 
        class="mb-5 bg-white/10 px-5 py-2.5 border-none rounded-lg text-white cursor-pointer hover:bg-white/20 transition-all"
        onclick="${props.onClick || ''}"
      >${props.text || '← Back'}</button>
    `
  },

  /**
   * Tab navigation
   */
  'ui-tabs': {
    render: (props) => {
      const tabs = (props.tabs || []).map((tab, i) => 
        `<button class="tab px-6 py-3 bg-white/10 border-none rounded-full cursor-pointer whitespace-nowrap transition-all text-white hover:bg-white/20 ${i === 0 ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 !text-slate-900' : ''}" onclick="showTab('${tab.id}')">${tab.icon || ''} ${tab.label}</button>`
      ).join('\n');
      return `<div class="flex gap-2.5 mb-6 overflow-x-auto">${tabs}</div>`;
    }
  },

  /**
   * Tab content panel
   */
  'ui-tab-content': {
    render: (props, children) => `
      <div id="${props.id}-tab" class="tab-content ${props.active ? '' : 'hidden'}">
        ${children}
      </div>
    `
  },

  /**
   * Content section with copy button
   */
  'ui-section': {
    render: (props) => `
      <div class="bg-white/5 rounded-2xl p-6 mb-5 relative">
        <h3 class="text-cyan-400 mb-4 font-semibold">${props.title || ''}</h3>
        ${props.copyable ? `<button class="absolute top-5 right-5 px-4 py-2 bg-cyan-400 border-none rounded-lg text-slate-900 cursor-pointer text-sm font-semibold hover:bg-cyan-300" onclick="copyContent('${props.contentId}')">Copy</button>` : ''}
        <pre id="${props.contentId}" class="whitespace-pre-wrap leading-relaxed text-white/90"></pre>
      </div>
    `
  },

  /**
   * Social media card
   */
  'ui-social-card': {
    render: (props) => `
      <div class="bg-white/10 rounded-xl p-5 mb-4">
        <h4 class="text-cyan-400 mb-2.5 font-semibold">${props.icon || ''} ${props.title || ''}</h4>
        <p${props.italic ? ' class="italic"' : ''}>${props.contentId ? `<span id="${props.contentId}"></span>` : ''}</p>
      </div>
    `
  },

  /**
   * Social container (for dynamic content)
   */
  'ui-social-container': {
    render: (props) => `<div id="${props.id || 'social-container'}"></div>`
  },

  /**
   * Episode history grid
   */
  'ui-episode-grid': {
    render: (props) => `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="${props.id || 'episode-grid'}">
        <p class="text-white/60 col-span-full text-center">${props.loadingText || 'Loading...'}</p>
      </div>
    `
  }
};

/**
 * Custom styles for animations (Tailwind doesn't have these built-in)
 */
export const customStyles = `
<style>
  @keyframes wave {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(0.5); }
  }
  .animate-wave { animation: wave 1s ease-in-out infinite; }
  .animation-delay-100 { animation-delay: 0.1s; }
  .animation-delay-200 { animation-delay: 0.2s; }
  .animation-delay-300 { animation-delay: 0.3s; }
  .animation-delay-400 { animation-delay: 0.4s; }
  
  /* Active states for JS toggling */
  .format-btn.active { 
    border-color: rgb(34 211 238) !important; 
    background-color: rgb(34 211 238 / 0.2) !important; 
  }
  .tab.active {
    background: linear-gradient(to right, rgb(34 211 238), rgb(52 211 153)) !important;
    color: rgb(15 23 42) !important;
  }
</style>
`;

/**
 * JavaScript runtime code for interactivity
 */
export const runtimeScript = `
<script>
  let selectedFormat = 'solo';

  // Format buttons
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active', 'border-cyan-400', 'bg-cyan-400/20'));
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
        displayResults(data);
        loadHistory();
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

  function parseJSON(data) {
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data.replace(/\`\`\`json\\n?/g, '').replace(/\`\`\`\\n?/g, ''));
    } catch { return {}; }
  }

  function displayResults(data) {
    const results = document.getElementById('results');
    results.classList.remove('hidden');
    
    const introText = document.getElementById('intro-text');
    const scriptText = document.getElementById('script-text');
    const chaptersText = document.getElementById('chapters-text');
    const shownotesText = document.getElementById('shownotes-text');
    
    if (introText) introText.textContent = data.intro || '';
    if (scriptText) scriptText.textContent = data.script || '';
    if (chaptersText) chaptersText.textContent = data.chapters || '';
    if (shownotesText) shownotesText.textContent = data.shownotes || '';

    const social = parseJSON(data.social);
    const socialContainer = document.getElementById('social-container');
    if (socialContainer) {
      socialContainer.innerHTML = \`
        <div class="bg-white/10 rounded-xl p-5 mb-4">
          <h4 class="text-cyan-400 mb-2.5 font-semibold">🐦 Twitter</h4>
          <p>\${social?.twitter || ''}</p>
        </div>
        <div class="bg-white/10 rounded-xl p-5 mb-4">
          <h4 class="text-cyan-400 mb-2.5 font-semibold">💼 LinkedIn</h4>
          <p>\${social?.linkedin || ''}</p>
        </div>
        <div class="bg-white/10 rounded-xl p-5 mb-4">
          <h4 class="text-cyan-400 mb-2.5 font-semibold">📸 Instagram</h4>
          <p>\${social?.instagram || ''}</p>
        </div>
        <div class="bg-white/10 rounded-xl p-5 mb-4">
          <h4 class="text-cyan-400 mb-2.5 font-semibold">🔊 Audiogram Quote</h4>
          <p class="italic">"\${social?.audiogram || ''}"</p>
        </div>
      \`;
    }
  }

  function showTab(tab) {
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
      t.classList.add('bg-white/10');
      t.classList.remove('bg-gradient-to-r', 'from-cyan-400', 'to-emerald-400', '!text-slate-900');
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    
    const tabBtn = document.querySelector(\`[onclick="showTab('\${tab}')"]\`);
    if (tabBtn) {
      tabBtn.classList.add('active', 'bg-gradient-to-r', 'from-cyan-400', 'to-emerald-400', '!text-slate-900');
      tabBtn.classList.remove('bg-white/10');
    }
    const tabContent = document.getElementById(\`\${tab}-tab\`);
    if (tabContent) tabContent.classList.remove('hidden');
  }

  function copyContent(id) {
    const el = document.getElementById(id);
    if (el) {
      navigator.clipboard.writeText(el.textContent);
      alert('Copied!');
    }
  }

  function backToCreate() {
    const results = document.getElementById('results');
    results.classList.add('hidden');
    
    const createSection = document.getElementById('create-section');
    const historySection = document.getElementById('history-section');
    if (createSection) createSection.style.display = 'block';
    if (historySection) historySection.style.display = 'block';
  }

  async function loadHistory() {
    const grid = document.getElementById('episode-grid');
    if (!grid) return;
    
    try {
      const response = await fetch('/api/list-episodes?limit=9');
      const data = await response.json();

      if (data.episodes?.length > 0) {
        grid.innerHTML = data.episodes.map(ep => \`
          <div class="bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:border-cyan-400" onclick="viewEpisode('\${ep._id}')">
            <div class="bg-gradient-to-r from-cyan-400 to-emerald-400 p-4 text-slate-900">
              <div class="font-semibold">🎙️ \${(ep.topic || '').substring(0, 40)}...</div>
            </div>
            <div class="p-4">
              <div class="text-sm text-white/70 mt-1">\${ep.duration || 30} min • \${ep.format || 'solo'}</div>
              <div class="text-sm text-white/70 mt-1">\${ep.podcastName || 'Untitled Podcast'}</div>
            </div>
          </div>
        \`).join('');
      } else {
        grid.innerHTML = '<p class="text-white/60 col-span-full text-center">No episodes yet</p>';
      }
    } catch (error) {
      grid.innerHTML = '<p class="text-white/60 col-span-full text-center">Error loading episodes</p>';
    }
  }

  async function viewEpisode(id) {
    try {
      const response = await fetch(\`/api/get-episode?id=\${id}\`);
      const data = await response.json();
      if (data.episode) {
        displayResults(data.episode);
      }
    } catch (error) {
      alert('Error loading episode');
    }
  }

  loadHistory();
<\/script>
`;
