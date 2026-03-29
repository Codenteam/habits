/**
 * Cortex - Main Application Logic
 * Handles habit import, storage, and execution
 */

// ============================================================================
// State Management
// ============================================================================

const state = {
  habits: [],
  currentHabit: null,
  appDataPath: null,
  keyringReady: false,
  activeDropdown: null,
};

// Keyring constants - service name for storing secrets
const KEYRING_SERVICE = 'habits';

// Showcase URL - detect dev vs prod environment
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SHOWCASE_BASE_URL = isDev 
  ? 'http://localhost:5173/intersect/habits'
  : 'https://codenteam.com/intersect/habits';
const SHOWCASE_INDEX_URL = `${SHOWCASE_BASE_URL}/showcase/index.json`;

// ============================================================================
// Tauri API Wrappers (using global __TAURI__ API)
// ============================================================================

// Wait for Tauri APIs to be available
function waitForTauri() {
  return new Promise((resolve) => {
    if (window.__TAURI__) {
      resolve(window.__TAURI__);
    } else {
      // Poll until available
      const interval = setInterval(() => {
        if (window.__TAURI__) {
          clearInterval(interval);
          resolve(window.__TAURI__);
        }
      }, 50);
    }
  });
}

async function openFolderDialog() {
  const tauri = await waitForTauri();
  return tauri.dialog.open({
    directory: true,
    multiple: false,
    title: 'Select Habit Folder',
  });
}

/**
 * Fetch using Tauri HTTP plugin (bypasses CORS restrictions)
 */
async function tauriFetch(url, options = {}) {
  const tauri = await waitForTauri();
  if (!tauri || !tauri.http || !tauri.http.fetch) {
    // Fallback to window.fetch if Tauri HTTP plugin not available
    console.log('[HTTP] Tauri HTTP plugin not available, using window.fetch');
    return window.fetch(url, options);
  }
  
  console.log('[HTTP] Using Tauri HTTP plugin for:', url);
  return tauri.http.fetch(url, options);
}


async function openHabitFileDialog() {
  const tauri = await waitForTauri();
  return tauri.dialog.open({
    directory: false,
    multiple: false,
    title: 'Open Habit File',
    filters: [{ name: 'Habit Files', extensions: ['habit'] }],
  });
}

async function openFileDialog() {
  const tauri = await waitForTauri();
  return tauri.dialog.open({
    directory: false,
    multiple: false,
    title: 'Select Habit Zip File',
    filters: [{ name: 'Zip Files', extensions: ['zip'] }],
  });
}

async function openYamlFileDialog() {
  const tauri = await waitForTauri();
  return tauri.dialog.open({
    directory: false,
    multiple: false,
    title: 'Select YAML File',
    filters: [{ name: 'YAML Files', extensions: ['yaml', 'yml'] }],
  });
}

async function readTextFile(path) {
  const tauri = await waitForTauri();
  return tauri.fs.readTextFile(path);
}

async function readDir(path) {
  const tauri = await waitForTauri();
  return tauri.fs.readDir(path);
}

async function exists(path) {
  const tauri = await waitForTauri();
  return tauri.fs.exists(path);
}

async function createDir(path) {
  const tauri = await waitForTauri();
  return tauri.fs.mkdir(path, { recursive: true });
}

async function writeTextFile(path, content) {
  const tauri = await waitForTauri();
  return tauri.fs.writeTextFile(path, content);
}

async function copyFile(src, dest) {
  const tauri = await waitForTauri();
  return tauri.fs.copyFile(src, dest);
}

async function writeBinaryFile(path, bytes) {
  const tauri = await waitForTauri();
  // Tauri 2.x uses writeFile for both text and binary
  return tauri.fs.writeFile(path, bytes);
}

async function readBinaryFile(path) {
  const tauri = await waitForTauri();
  return tauri.fs.readFile(path);
}

async function getAppDataDir() {
  const tauri = await waitForTauri();
  return tauri.path.appDataDir();
}

// ============================================================================
// Keyring (Secure Storage via System Keychain)
// ============================================================================

async function initKeyring() {
  const tauri = await waitForTauri();
  if (!tauri) {
    console.log('[Keyring] Not in Tauri environment');
    return false;
  }
  
  // Keyring uses invoke - just check if we're in Tauri
  console.log('[Keyring] Ready - using system keychain via invoke');
  return true;
}

async function getSecretFromKeyring(key) {
  try {
    const tauri = await waitForTauri();
    if (!tauri || !tauri.core || !tauri.core.invoke) {
      console.log('[Keyring] Not available - no invoke');
      return null;
    }
    const value = await tauri.core.invoke('plugin:keyring|get_password', {
      service: KEYRING_SERVICE,
      user: key
    });
    return value || null;
  } catch (err) {
    // Key doesn't exist or error
    console.log('[Keyring] Get error for', key, ':', err.message || err);
    return null;
  }
}

async function setSecretInKeyring(key, value) {
  try {
    const tauri = await waitForTauri();
    if (!tauri || !tauri.core || !tauri.core.invoke) {
      console.error('[Keyring] Not available - no invoke');
      return false;
    }
    await tauri.core.invoke('plugin:keyring|set_password', {
      service: KEYRING_SERVICE,
      user: key,
      password: value
    });
    return true;
  } catch (err) {
    console.error('[Keyring] Failed to store secret:', err);
    return false;
  }
}

async function deleteSecretFromKeyring(key) {
  try {
    const tauri = await waitForTauri();
    if (!tauri || !tauri.core || !tauri.core.invoke) {
      console.error('[Keyring] Not available - no invoke');
      return false;
    }
    await tauri.core.invoke('plugin:keyring|delete_password', {
      service: KEYRING_SERVICE,
      name: key
    });
    return true;
  } catch (err) {
    console.error('[Keyring] Failed to delete secret:', err);
    return false;
  }
}

// ============================================================================
// Habit Storage
// ============================================================================

async function getHabitsDir() {
  if (!state.appDataPath) {
    state.appDataPath = await getAppDataDir();
  }
  return state.appDataPath + 'habits/';
}

async function getManifestPath() {
  const habitsDir = await getHabitsDir();
  return habitsDir + 'manifest.json';
}

async function loadManifest() {
  try {
    const manifestPath = await getManifestPath();
    if (await exists(manifestPath)) {
      const content = await readTextFile(manifestPath);
      const manifest = JSON.parse(content);
      state.habits = manifest.habits || [];
      console.log('[Habits] Loaded manifest with', state.habits.length, 'habits');
      for (const habit of state.habits) {
        console.log('[Habits] Habit:', habit.name, '- cachedFiles:', habit.cachedFiles ? Object.keys(habit.cachedFiles).length : 'none');
      }
      return manifest;
    }
  } catch (err) {
    console.error('Failed to load manifest:', err);
  }
  return { habits: [] };
}

async function saveManifest() {
  try {
    const habitsDir = await getHabitsDir();
    await createDir(habitsDir);
    const manifestPath = await getManifestPath();
    const manifest = { habits: state.habits };
    await writeTextFile(manifestPath, JSON.stringify(manifest, null, 2));
  } catch (err) {
    console.error('Failed to save manifest:', err);
  }
}

// ============================================================================
// Habit File Extraction (.habit files)
// ============================================================================

async function extractHabitFile(filePath) {
  console.log('[Habits] Extracting habit file:', filePath);
  
  try {
    // Read the .habit file as binary
    const fileData = await readBinaryFile(filePath);
    
    // Load JSZip and extract
    if (!window.JSZip) {
      throw new Error('JSZip library not loaded');
    }
    
    const zip = await window.JSZip.loadAsync(fileData);
    
    // Check for required files
    let indexFile = zip.file('index.html');

    if(!indexFile){
      // Try in frontend
      indexFile = zip.file('frontend/index.html');
    }
    
    if (!indexFile) {
      return {
        valid: false,
        error: {
          title: 'Invalid Habit File',
          message: 'The .habit file is missing index.html'
        }
      };
    }
    
    // Extract content
    const indexHtml = await indexFile.async('string');
    
    // Get cortex-bundle.js (required as separate file)
    const bundleFile = zip.file('cortex-bundle.js');
    if (!bundleFile) {
      return {
        valid: false,
        error: {
          title: 'Invalid Habit File',
          message: 'The .habit file is missing cortex-bundle.js'
        }
      };
    }
    const bundleJs = await bundleFile.async('string');
    
    // Try to get habit name from filename
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown';
    const habitName = fileName.replace(/\.habit$/, '');
    
    console.log('[Habits] Extracted habit:', habitName);
    console.log('[Habits] Index HTML size:', indexHtml.length, 'bytes');
    console.log('[Habits] Bundle JS size:', bundleJs.length, 'bytes');
    
    // Extract all files for asset handling
    const files = {};
    for (const [name, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        files[name] = await file.async('string');
      }
    }
    
    return {
      valid: true,
      habitName,
      indexHtml,
      bundleJs,
      files,
      filePath,
    };
  } catch (err) {
    console.error('[Habits] Failed to extract habit file:', err);
    return {
      valid: false,
      error: {
        title: 'Extraction Failed',
        message: 'Failed to extract .habit file'
      }
    };
  }
}

// ============================================================================
// Habit Import
// ============================================================================

async function importHabitFile(filePath) {
  console.log('[Habits] Importing habit file:', filePath);
  
  const extraction = await extractHabitFile(filePath);
  
  if (!extraction.valid) {
    showError(extraction.error.title, extraction.error.message);
    return false;
  }
  
  // Generate unique ID
  const habitId = 'habit-' + Date.now();
  
  // Create habit entry with cached content
  const habit = {
    id: habitId,
    name: extraction.habitName,
    filePath: extraction.filePath,
    // Cache the extracted content so we don't need to re-extract
    cachedIndexHtml: extraction.indexHtml,
    cachedBundleJs: extraction.bundleJs,
    cachedFiles: extraction.files,
    installedAt: new Date().toISOString(),
  };
  
  // Add to state and save
  state.habits.push(habit);
  await saveManifest();
  
  // Update UI
  renderHabitsList();
  
  console.log('[Habits] Habit imported successfully:', habit.name);
  return true;
}

// ============================================================================
// Habit Execution
// ============================================================================

/**
 * Check if all required secrets for a habit are set
 */
async function checkRequiredSecrets(habit) {
  const requiredVars = extractRequiredEnvVars(habit);
  if (requiredVars.length === 0) return { allSet: true, missing: [] };
  
  if (!state.keyringReady) {
    state.keyringReady = await initKeyring();
  }
  
  if (!state.keyringReady) {
    return { allSet: false, missing: requiredVars };
  }
  
  const storedKeys = await getSecretsIndex();
  const missing = requiredVars.filter(v => !storedKeys.includes(v));
  
  return { allSet: missing.length === 0, missing };
}

async function runHabit(habitId) {
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) {
    showError('Error', 'Habit not found');
    return;
  }
  
  // Check if all required secrets are set
  const { allSet, missing } = await checkRequiredSecrets(habit);
  if (!allSet) {
    showSecretsModal(habit);
    return;
  }
  
  state.currentHabit = habit;
  
  try {
    let indexHtml, bundleJs;
    
    // Check if we have cached content
    if (habit.cachedIndexHtml && habit.cachedBundleJs) {
      indexHtml = habit.cachedIndexHtml;
      bundleJs = habit.cachedBundleJs;
      console.log('[Habits] Using cached content for:', habit.name);
    } else if (habit.filePath) {
      // Re-extract from file
      console.log('[Habits] Re-extracting from file:', habit.filePath);
      const extraction = await extractHabitFile(habit.filePath);
      if (!extraction.valid) {
        showError(extraction.error.title, extraction.error.message);
        goBackToList();
        return;
      }
      indexHtml = extraction.indexHtml;
      bundleJs = extraction.bundleJs;
      // Update cache
      habit.cachedIndexHtml = indexHtml;
      habit.cachedBundleJs = bundleJs;
      habit.cachedFiles = extraction.files;
    } else {
      // Legacy support for folder-based habits
      indexHtml = await readTextFile(habit.indexPath);
      bundleJs = await readTextFile(habit.bundlePath);
    }
    
    console.log('[Habits] Loading habit:', habit.name);
    
    // Inject cortex-bundle.js into HTML at runtime (before </head>)
    // The bundle is NOT inlined at pack time - Tauri apps inject it dynamically
    let htmlContent = indexHtml;
    if (bundleJs && !htmlContent.includes('id="cortex-bundle"')) {
      const bundleScript = `<script id="cortex-bundle">\n${bundleJs}\n</script>`;
      if (htmlContent.includes('</head>')) {
        htmlContent = htmlContent.replace('</head>', bundleScript + '\n</head>');
      } else if (htmlContent.includes('<body')) {
        htmlContent = htmlContent.replace(/<body([^>]*)>/i, bundleScript + '\n<body$1>');
      } else {
        htmlContent = bundleScript + '\n' + htmlContent;
      }
      console.log('[Habits] Injected cortex-bundle.js at runtime');
    }
    
    console.log('[Habits] HTML prepared, size:', htmlContent.length, 'bytes');
    
    // Show habit view
    document.getElementById('habit-view').classList.add('active');
    
    // Use an iframe to properly load the HTML with scripts
    const contentContainer = document.getElementById('habit-content');
    contentContainer.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: transparent;';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
    contentContainer.appendChild(iframe);
    
    // Write the HTML content to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
    
    console.log('[Habits] Habit loaded in iframe');
    
  } catch (err) {
    console.error('Failed to run habit:', err);
    showError('Error', 'Failed to load habit: ' + err.message);
    goBackToList();
  }
}

// ============================================================================
// UI Functions
// ============================================================================

function renderHabitsList() {
  const listContainer = document.getElementById('habits-list');
  const emptyState = document.getElementById('empty-state');
  const habitsCount = document.getElementById('habits-count');
  const clearAllBtn = document.getElementById('btn-clear-all-habits');
  
  // Clear existing items (except empty state)
  const existingItems = listContainer.querySelectorAll('.habit-card');
  existingItems.forEach(item => item.remove());
  
  if (state.habits.length === 0) {
    emptyState.style.display = 'flex';
    habitsCount.classList.add('hidden');
    if (clearAllBtn) clearAllBtn.classList.add('hidden');
    return;
  }
  
  emptyState.style.display = 'none';
  habitsCount.textContent = state.habits.length;
  habitsCount.classList.remove('hidden');
  if (clearAllBtn) clearAllBtn.classList.remove('hidden');
  
  for (const habit of state.habits) {
    const item = document.createElement('div');
    item.className = 'habit-card';
    item.onclick = (e) => {
      // Only run if clicking on card itself, not menu button
      if (!e.target.closest('.habit-menu-btn')) {
        runHabit(habit.id);
      }
    };
    
    // Get display path - use filePath for .habit files, sourcePath for legacy
    const displayPath = habit.filePath || habit.sourcePath || '';
    const pathParts = displayPath.split('/');
    const shortPath = pathParts.slice(-1).join('/');
    
    item.innerHTML = `
      <div class="habit-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
      </div>
      <div class="habit-info">
        <div class="habit-name">${escapeHtml(habit.name)}</div>
        <div class="habit-path">${escapeHtml(shortPath)}</div>
      </div>
      <div class="habit-menu-btn" data-habit-id="${habit.id}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
        </svg>
        <div class="habit-dropdown" data-habit-id="${habit.id}">
          <div class="dropdown-item habit-view-files" data-habit-id="${habit.id}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            View Files
          </div>
          <div class="dropdown-item habit-secrets" data-habit-id="${habit.id}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
            Secrets
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item danger habit-delete" data-habit-id="${habit.id}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Delete
          </div>
        </div>
      </div>
    `;
    
    // Add menu button click handler
    const menuBtn = item.querySelector('.habit-menu-btn');
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      toggleDropdown(habit.id);
    };
    
    // Add view files click handler
    const viewFilesBtn = item.querySelector('.habit-view-files');
    viewFilesBtn.onclick = (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      showHabitFiles(habit);
    };
    
    // Add secrets click handler
    const secretsBtn = item.querySelector('.habit-secrets');
    secretsBtn.onclick = (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      showSecretsModal(habit);
    };
    
    // Add delete button click handler
    const deleteBtn = item.querySelector('.habit-delete');
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      deleteHabit(habit.id, habit.name);
    };
    
    listContainer.appendChild(item);
  }
}

function toggleDropdown(habitId) {
  const dropdown = document.querySelector(`.habit-dropdown[data-habit-id="${habitId}"]`);
  
  if (state.activeDropdown === habitId) {
    dropdown.classList.remove('active');
    state.activeDropdown = null;
  } else {
    closeAllDropdowns();
    dropdown.classList.add('active');
    state.activeDropdown = habitId;
  }
}

function closeAllDropdowns() {
  document.querySelectorAll('.habit-dropdown.active').forEach(dropdown => {
    dropdown.classList.remove('active');
  });
  state.activeDropdown = null;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function goBackToList() {
  state.currentHabit = null;
  
  // Clear habit content
  document.getElementById('habit-content').innerHTML = '';
  
  // Hide habit view
  document.getElementById('habit-view').classList.remove('active');
}

function showError(title, message) {
  document.getElementById('error-title').textContent = title;
  document.getElementById('error-message').textContent = message;
  document.getElementById('error-modal').classList.add('active');
}

function hideError() {
  document.getElementById('error-modal').classList.remove('active');
}

// ============================================================================
// Open Habit Modal (Upload or Browse Showcase)
// ============================================================================

function showOpenHabitModal() {
  document.getElementById('open-habit-modal').classList.add('active');
}

function hideOpenHabitModal() {
  document.getElementById('open-habit-modal').classList.remove('active');
}

// ============================================================================
// Showcase Browser
// ============================================================================

let showcaseCache = null;

function showShowcaseModal() {
  document.getElementById('showcase-modal').classList.add('active');
}

function hideShowcaseModal() {
  document.getElementById('showcase-modal').classList.remove('active');
}

async function loadShowcase() {
  const listEl = document.getElementById('showcase-list');
  const loadingEl = document.getElementById('showcase-loading');
  const errorEl = document.getElementById('showcase-error');
  
  // Show loading
  listEl.innerHTML = '';
  loadingEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
  
  try {
    // Use cache if available
    if (!showcaseCache) {
      const response = await fetch(SHOWCASE_INDEX_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showcaseCache = await response.json();
    }
    
    loadingEl.classList.add('hidden');
    renderShowcaseList(showcaseCache);
  } catch (err) {
    console.error('Failed to load showcase:', err);
    loadingEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorEl.textContent = 'Failed to load showcase. Check your internet connection.';
  }
}

function renderShowcaseList(habits) {
  const listEl = document.getElementById('showcase-list');
  listEl.innerHTML = '';
  
  if (habits.length === 0) {
    listEl.innerHTML = '<div class="showcase-loading">No habits available</div>';
    return;
  }
  
  habits.forEach(habit => {
    const item = document.createElement('div');
    item.className = 'showcase-item';
    item.innerHTML = `
      <img class="showcase-thumb" src="${SHOWCASE_BASE_URL}${habit.thumbnail}" alt="${habit.name}" onerror="this.style.display='none'">
      <div class="showcase-info">
        <div class="showcase-name">${habit.name}</div>
        <div class="showcase-desc">${habit.description}</div>
        <div class="showcase-tags">
          ${habit.tags.slice(0, 3).map(tag => `<span class="showcase-tag">${tag}</span>`).join('')}
        </div>
      </div>
    `;
    item.addEventListener('click', () => downloadAndImportShowcaseHabit(habit));
    listEl.appendChild(item);
  });
}

async function downloadAndImportShowcaseHabit(habit) {
  const listEl = document.getElementById('showcase-list');
  listEl.innerHTML = '<div class="showcase-loading">Downloading ' + habit.name + '...</div>';
  
  try {
    const habitUrl = SHOWCASE_BASE_URL + habit.habitUrl;
    const response = await fetch(habitUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Save to app data directory
    const tauri = await waitForTauri();
    const appDataDir = await tauri.path.appDataDir();
    const habitsDir = `${appDataDir}habits`;
    
    // Ensure habits directory exists
    if (!(await exists(habitsDir))) {
      await createDir(habitsDir);
    }
    
    const filename = habit.slug + '.habit';
    const filePath = `${habitsDir}/${filename}`;
    
    // Write file using wrapper (Tauri 2.x API)
    await writeBinaryFile(filePath, bytes);
    
    // Import the habit
    await importHabitFile(filePath);
    
    // Close modal
    hideShowcaseModal();
    
    console.log('[Showcase] Downloaded and imported:', habit.name);
  } catch (err) {
    console.error('Failed to download habit:', err);
    showError('Download Error', 'Failed to download habit: ' + err.message);
    hideShowcaseModal();
  }
}

async function deleteHabit(habitId, habitName) {
  // Remove from state
  state.habits = state.habits.filter(h => h.id !== habitId);
  
  // Save manifest
  await saveManifest();
  
  // Update UI
  renderHabitsList();
  
  console.log('[Habits] Deleted habit:', habitName);
}

async function clearAllHabits() {
  if (state.habits.length === 0) return;
  
  const count = state.habits.length;
  
  // Clear all habits from state
  state.habits = [];
  
  // Save manifest
  await saveManifest();
  
  // Update UI
  renderHabitsList();
  
  console.log('[Habits] Cleared all habits:', count, 'habit(s) removed');
}

// ============================================================================
// Event Handlers
// ============================================================================

function handleOpenHabitFile() {
  // Show options modal (upload from device or browse showcase)
  showOpenHabitModal();
}

async function handleUploadFromDevice() {
  hideOpenHabitModal();
  try {
    const filePath = await openHabitFileDialog();
    if (filePath) {
      await importHabitFile(filePath);
    }
  } catch (err) {
    console.error('Failed to open habit file:', err);
    showError('Error', 'Failed to open habit file: ' + err.message);
  }
}

async function handleBrowseShowcase() {
  hideOpenHabitModal();
  showShowcaseModal();
  await loadShowcase();
}

async function handleVisualizeYaml() {
  try {
    const filePath = await openYamlFileDialog();
    
    if (filePath) {
      const yamlContent = await readTextFile(filePath);
      openHabitViewer(yamlContent);
    }
  } catch (err) {
    console.error('Failed to visualize YAML:', err);
    showError('Error', 'Failed to visualize YAML: ' + err.message);
  }
}

// ============================================================================
// View Habit Files Feature
// ============================================================================

function getViewableFiles(habit) {
  if (!habit.cachedFiles) {
    console.log('[Habits] No cachedFiles for habit:', habit.name);
    return [];
  }
  
  const allFiles = Object.keys(habit.cachedFiles);
  console.log('[Habits] All files in habit:', allFiles);
  
  const viewableFiles = allFiles
    .filter(name => {
      const lowerName = name.toLowerCase();
      // Include all yaml files except stack.yaml
      return (lowerName.endsWith('.yaml') || lowerName.endsWith('.yml')) && 
             lowerName !== 'stack.yaml' && 
             lowerName !== 'stack.yml';
    })
    .sort();
  
  console.log('[Habits] Viewable files:', viewableFiles);
  return viewableFiles;
}

async function showHabitFiles(habit) {
  console.log('[Habits] showHabitFiles called for:', habit.name);
  console.log('[Habits] habit.cachedFiles exists:', !!habit.cachedFiles);
  console.log('[Habits] habit.filePath:', habit.filePath);
  
  // If no cached files, try to re-extract
  if (!habit.cachedFiles && habit.filePath) {
    console.log('[Habits] Re-extracting files for:', habit.name);
    const extraction = await extractHabitFile(habit.filePath);
    if (extraction.valid) {
      habit.cachedFiles = extraction.files;
      console.log('[Habits] Re-extracted files:', Object.keys(extraction.files));
      await saveManifest();
    } else {
      showError('Error', 'Could not load habit files');
      return;
    }
  }
  
  const files = getViewableFiles(habit);
  
  const modalTitle = document.getElementById('file-select-title');
  const modalEmpty = document.getElementById('file-select-empty');
  const modalList = document.getElementById('file-select-list');
  
  modalTitle.textContent = habit.name;
  modalList.innerHTML = '';
  
  if (files.length === 0) {
    // Update empty message to be more helpful
    modalEmpty.innerHTML = '<p>No viewable YAML files found.<br>This habit may need to be re-exported.</p>';
    modalEmpty.classList.add('active');
    modalList.style.display = 'none';
  } else {
    modalEmpty.classList.remove('active');
    modalList.style.display = 'block';
    
    for (const fileName of files) {
      const item = document.createElement('div');
      item.className = 'picker-item';
      item.onclick = () => openFileInViewer(habit, fileName);
      
      // Get short display name (just the filename without path)
      const displayName = fileName.split('/').pop();
      
      item.innerHTML = `
        <div class="picker-item-icon file-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <div class="picker-item-info">
          <div class="picker-item-name">${escapeHtml(displayName)}</div>
          <div class="picker-item-desc">${escapeHtml(fileName)}</div>
        </div>
        <svg class="picker-item-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `;
      
      modalList.appendChild(item);
    }
  }
  
  document.getElementById('file-select-modal').classList.add('active');
}

function openFileInViewer(habit, fileName) {
  const fileContent = habit.cachedFiles[fileName];
  
  if (!fileContent) {
    showError('Error', 'File content not found');
    return;
  }
  
  // Close the modal
  document.getElementById('file-select-modal').classList.remove('active');
  
  // Open in habit viewer
  openHabitViewer(fileContent);
}

function openHabitViewer(yamlContent) {
  // URL-encode the YAML content for the habit parameter
  const encodedContent = encodeURIComponent(yamlContent);
  const habitViewerUrl = `./habit-viewer/index.html?habit=${encodedContent}&hideMinimap=true`;
  
  // Create fullscreen iframe with small close button
  const viewerHtml = `
    <style>
      .viewer-container {
        position: fixed;
        inset: 0;
        background: #0a0a0f;
        z-index: 9999;
      }
      .viewer-close {
        position: fixed;
        top: 32px;
        left: 32px;
        z-index: 10000;
        width: 32px;
        height: 32px;
        background: rgba(0,0,0,0.6);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .viewer-close:hover {
        background: rgba(239,68,68,0.8);
        border-color: rgba(239,68,68,0.8);
      }
      .viewer-close svg {
        width: 16px;
        height: 16px;
        color: white;
      }
      .viewer-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
    </style>
    <div class="viewer-container">
      <button class="viewer-close" onclick="closeYamlViewer()">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <iframe 
        src="${habitViewerUrl}" 
        class="viewer-iframe"
        title="Habit Viewer"
      ></iframe>
    </div>
  `;
  
  // Replace the current view with the habit viewer iframe
  document.body.innerHTML = viewerHtml;
  
  // Add close function to window
  window.closeYamlViewer = function() {
    location.reload();
  };
}

function closeFileSelectModal() {
  document.getElementById('file-select-modal').classList.remove('active');
}

// ============================================================================
// Secrets Management
// ============================================================================

// Track known secret names (since keyring doesn't enumerate keys)
const SECRETS_INDEX_KEY = '__secrets_index__';

/**
 * Extract all {{habits.env.*}} references from habit's bundle
 */
function extractRequiredEnvVars(habit) {
  const envVarPattern = /\{\{habits\.env\.([^}]+)\}\}/g;
  const requiredVars = new Set();
  
  // Scan the bundle JS content
  const content = habit.cachedBundleJs || '';
  let match;
  while ((match = envVarPattern.exec(content)) !== null) {
    requiredVars.add(match[1]);
  }
  
  return Array.from(requiredVars).sort();
}

async function getSecretsIndex() {
  try {
    const indexData = await getSecretFromKeyring(SECRETS_INDEX_KEY);
    if (indexData) {
      return JSON.parse(indexData);
    }
  } catch (err) {
    console.log('[Secrets] No index found');
  }
  return [];
}

async function saveSecretsIndex(keys) {
  await setSecretInKeyring(SECRETS_INDEX_KEY, JSON.stringify(keys));
}

// Store reference to current habit for secrets modal
let secretsModalHabit = null;

async function showSecretsModal(habit) {
  secretsModalHabit = habit;
  
  // Initialize keyring if not already done
  if (!state.keyringReady) {
    state.keyringReady = await initKeyring();
  }
  
  const modal = document.getElementById('secrets-modal');
  const listContainer = document.getElementById('secrets-list');
  const emptyState = document.getElementById('secrets-empty');
  
  // Extract required env vars from this habit
  const requiredVars = extractRequiredEnvVars(habit);
  console.log('[Secrets] Required vars for', habit.name, ':', requiredVars);
  
  // Load and display secrets
  listContainer.innerHTML = '';
  
  if (!state.keyringReady) {
    emptyState.innerHTML = 'Secure storage not available.';
    emptyState.classList.remove('hidden');
    modal.classList.add('active');
    return;
  }
  
  // Get all stored secrets
  const storedKeys = await getSecretsIndex();
  
  if (requiredVars.length === 0 && storedKeys.length === 0) {
    emptyState.innerHTML = 'This habit doesn\'t require any secrets.';
    emptyState.classList.remove('hidden');
    modal.classList.add('active');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  // Show required variables first
  for (const varName of requiredVars) {
    const isSet = storedKeys.includes(varName);
    const secretItem = document.createElement('div');
    secretItem.className = 'secret-item';
    secretItem.innerHTML = `
      <div class="secret-item-header">
        <div class="secret-item-info">
          <div class="secret-item-name">${escapeHtml(varName)}</div>
        </div>
        <div class="secret-item-actions">
            <button class="secret-delete-btn" data-key="${escapeHtml(varName)}" title="Delete">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
        </div>
      </div>
      <div class="secret-item-input-row">
        <input type="password" class="secret-input-inline" data-key="${escapeHtml(varName)}" placeholder="Enter secret value to replace...">
      </div>
    `;
    
    listContainer.appendChild(secretItem);
  }
  
  // Show other stored secrets that aren't required by this habit
  const otherSecrets = storedKeys.filter(k => !requiredVars.includes(k));
  if (otherSecrets.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'secrets-divider';
    divider.innerHTML = '<span>Other stored secrets</span>';
    listContainer.appendChild(divider);
    
    for (const key of otherSecrets) {
      const secretItem = document.createElement('div');
      secretItem.className = 'secret-item';
      secretItem.innerHTML = `
        <div class="secret-item-header">
          <div class="secret-item-info">
            <div class="secret-item-name">${escapeHtml(key)}</div>
            <div class="secret-item-status set">Set</div>
          </div>
          <div class="secret-item-actions">
            <button class="secret-delete-btn" data-key="${escapeHtml(key)}" title="Delete">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      `;
      listContainer.appendChild(secretItem);
    }
  }
  
  // Add single save button at the bottom if there are any inputs
  if (requiredVars.length > 0) {
    const saveAllContainer = document.createElement('div');
    saveAllContainer.className = 'secrets-save-all-container';
    saveAllContainer.innerHTML = `
      <button id="secrets-save-all-btn" class="secrets-save-all-btn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        Save Secrets
      </button>
    `;
    listContainer.appendChild(saveAllContainer);
    
    // Add save all handler
    const saveAllBtn = saveAllContainer.querySelector('#secrets-save-all-btn');
    saveAllBtn.onclick = async () => {
      const inputs = listContainer.querySelectorAll('.secret-input-inline');
      const secretsToSave = [];
      
      // Collect all non-empty secrets
      inputs.forEach(input => {
        const key = input.dataset.key;
        const value = input.value.trim();
        if (value) {
          secretsToSave.push({ key, value });
        }
      });
      
      if (secretsToSave.length === 0) {
        return;
      }
      
      // Show saving state
      saveAllBtn.disabled = true;
      saveAllBtn.innerHTML = `
        <svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10"/></svg>
        Saving...
      `;
      inputs.forEach(input => input.disabled = true);
      
      // Save all secrets
      for (const { key, value } of secretsToSave) {
        await saveSecret(key, value);
      }
      
      closeSecretsModal();
    };
  }
  
  listContainer.querySelectorAll('.secret-delete-btn').forEach(btn => {
    btn.onclick = async () => {
      const key = btn.dataset.key;
      await deleteSecret(key);
      showSecretsModal(habit); // Refresh
    };
  });
  
  modal.classList.add('active');
}

function promptEditSecret(key, habit) {
  const parentItem = document.querySelector(`.secret-edit-btn[data-key="${key}"]`)?.closest('.secret-item');
  
  if (parentItem) {
    // Replace the item content with an input
    parentItem.innerHTML = `
      <div class="secret-item-header">
        <div class="secret-item-info">
          <div class="secret-item-name">${escapeHtml(key)}</div>
          <div class="secret-item-status" style="color: var(--accent)">Editing</div>
        </div>
        <div class="secret-item-actions">
          <button class="secret-cancel-btn" title="Cancel">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="secret-item-input-row">
        <input type="password" class="secret-input-inline" data-key="${escapeHtml(key)}" placeholder="Enter new value...">
        <button class="secret-save-btn" data-key="${escapeHtml(key)}" title="Save">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </button>
      </div>
    `;
    
    const input = parentItem.querySelector('.secret-input-inline');
    const saveBtn = parentItem.querySelector('.secret-save-btn');
    input.focus();
    
    const doSave = async () => {
      const value = input.value;
      if (value) {
        // Show spinner
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<svg class="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10"/></svg>`;
        input.disabled = true;
        
        await saveSecret(key, value);
        showSecretsModal(habit);
      }
    };
    
    saveBtn.onclick = doSave;
    
    parentItem.querySelector('.secret-cancel-btn').onclick = () => {
      showSecretsModal(habit);
    };
    
    input.onkeypress = async (e) => {
      if (e.key === 'Enter') {
        await doSave();
      }
    };
  }
}

function closeSecretsModal() {
  document.getElementById('secrets-modal').classList.remove('active');
  secretsModalHabit = null;
}

async function saveSecret(name, value) {
  if (!state.keyringReady) {
    state.keyringReady = await initKeyring();
  }
  
  if (!state.keyringReady) {
    showError('Error', 'Secure storage not available.');
    return false;
  }
  
  // Store the secret
  const success = await setSecretInKeyring(name, value);
  
  if (success) {
    // Update index
    const secretKeys = await getSecretsIndex();
    if (!secretKeys.includes(name)) {
      secretKeys.push(name);
      await saveSecretsIndex(secretKeys);
    }
    console.log('[Secrets] Saved:', name);
    return true;
  } else {
    showError('Error', 'Failed to save secret.');
    return false;
  }
}

async function deleteSecret(key) {
  if (!state.keyringReady) {
    return;
  }
  
  // Delete from store
  await deleteSecretFromKeyring(key);
  
  // Update index
  const secretKeys = await getSecretsIndex();
  const updatedKeys = secretKeys.filter(k => k !== key);
  await saveSecretsIndex(updatedKeys);
  
  console.log('[Secrets] Deleted:', key);
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
  console.log('Habits initializing...');
  
  // Load saved habits
  await loadManifest();
  renderHabitsList();
  
  // Set up event listeners
  document.getElementById('btn-open-habit').addEventListener('click', handleOpenHabitFile);
  document.getElementById('btn-visualize-yaml').addEventListener('click', handleVisualizeYaml);
  document.getElementById('btn-back').addEventListener('click', goBackToList);
  document.getElementById('error-ok').addEventListener('click', hideError);
  document.getElementById('btn-clear-all-habits').addEventListener('click', clearAllHabits);
  
  // Open habit modal listeners
  document.getElementById('open-habit-close').addEventListener('click', hideOpenHabitModal);
  document.getElementById('option-upload').addEventListener('click', handleUploadFromDevice);
  document.getElementById('option-browse').addEventListener('click', handleBrowseShowcase);
  
  // Showcase modal listeners
  document.getElementById('showcase-close').addEventListener('click', hideShowcaseModal);
  document.getElementById('showcase-back').addEventListener('click', () => {
    hideShowcaseModal();
    showOpenHabitModal();
  });
  
  // File selection modal listeners
  document.getElementById('file-select-close').addEventListener('click', closeFileSelectModal);
  
  // Secrets modal listeners
  document.getElementById('secrets-close').addEventListener('click', closeSecretsModal);
  
  // Handle keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('showcase-modal').classList.contains('active')) {
        hideShowcaseModal();
      } else if (document.getElementById('open-habit-modal').classList.contains('active')) {
        hideOpenHabitModal();
      } else if (document.getElementById('secrets-modal').classList.contains('active')) {
        closeSecretsModal();
      } else if (document.getElementById('file-select-modal').classList.contains('active')) {
        closeFileSelectModal();
      } else if (document.getElementById('error-modal').classList.contains('active')) {
        hideError();
      } else if (state.currentHabit) {
        goBackToList();
      }
      closeAllDropdowns();
    }
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.habit-menu-btn')) {
      closeAllDropdowns();
    }
  });
  
  // Close modals when clicking outside
  document.getElementById('open-habit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'open-habit-modal') {
      hideOpenHabitModal();
    }
  });
  
  document.getElementById('showcase-modal').addEventListener('click', (e) => {
    if (e.target.id === 'showcase-modal') {
      hideShowcaseModal();
    }
  });
  
  document.getElementById('file-select-modal').addEventListener('click', (e) => {
    if (e.target.id === 'file-select-modal') {
      closeFileSelectModal();
    }
  });
  
  document.getElementById('secrets-modal').addEventListener('click', (e) => {
    if (e.target.id === 'secrets-modal') {
      closeSecretsModal();
    }
  });
  
  console.log('Habits ready');
  
  // Check for CLI arguments (for testing/automation)
  await checkCliArgs();
}

/**
 * Check for CLI arguments passed from Rust backend
 * Supports: --habit <path> --test --workflow <name> --input <json>
 */
async function checkCliArgs() {
  try {
    const tauri = await waitForTauri();
    if (!tauri || !tauri.core || !tauri.core.invoke) {
      return;
    }
    
    const cliArgs = await tauri.core.invoke('get_cli_args');
    if (!cliArgs) {
      console.log('[CLI] No CLI arguments provided');
      return;
    }
    
    console.log('[CLI] Arguments:', JSON.stringify(cliArgs));
    
    // If --habit provided, load the habit file
    if (cliArgs.habit) {
      console.log('[CLI] Loading habit file:', cliArgs.habit);
      const imported = await importHabitFile(cliArgs.habit);
      
      if (!imported) {
        if (cliArgs.test) {
          await tauri.core.invoke('test_complete', { 
            result: JSON.stringify({ success: false, error: 'Failed to import habit file' }) 
          });
        }
        return;
      }
      
      // If in test mode with workflow specified, execute it
      if (cliArgs.test && cliArgs.workflow) {
        console.log('[CLI] Test mode: executing workflow', cliArgs.workflow);
        
        // Find the habit we just imported (most recent)
        const habit = state.habits[state.habits.length - 1];
        if (!habit) {
          await tauri.core.invoke('test_complete', { 
            result: JSON.stringify({ success: false, error: 'No habit found after import' }) 
          });
          return;
        }
        
        // Parse input
        let input = {};
        if (cliArgs.input) {
          try {
            input = JSON.parse(cliArgs.input);
          } catch (e) {
            input = cliArgs.input; // Use as string if not valid JSON
          }
        }
        
        // Execute workflow in test mode
        await executeWorkflowForTest(habit, cliArgs.workflow, input);
      } else if (!cliArgs.test) {
        // Not in test mode, just run the habit UI
        const habit = state.habits[state.habits.length - 1];
        if (habit) {
          runHabit(habit.id);
        }
      }
    }
  } catch (err) {
    console.error('[CLI] Error checking CLI args:', err);
  }
}

/**
 * Execute a workflow in test mode and output result
 */
async function executeWorkflowForTest(habit, workflowName, input) {
  try {
    const tauri = await waitForTauri();
    
    // Load the bundle JS
    let bundleJs = habit.cachedBundleJs;
    if (!bundleJs && habit.filePath) {
      const extraction = await extractHabitFile(habit.filePath);
      if (!extraction.valid) {
        await tauri.core.invoke('test_complete', { 
          result: JSON.stringify({ success: false, error: 'Failed to extract habit file' }) 
        });
        return;
      }
      bundleJs = extraction.bundleJs;
    }
    
    // Create a minimal execution context
    // The bundle exposes HabitsBundle global with executeWorkflow
    if (!bundleJs) {
      await tauri.core.invoke('test_complete', { 
        result: JSON.stringify({ success: false, error: 'Bundle JS is null or undefined' }) 
      });
      return;
    }
    
    // Execute bundle via eval (script injection can have timing issues)
    try {
      eval(bundleJs);
    } catch (evalErr) {
      console.error('[CLI] Bundle eval error:', evalErr);
      await tauri.core.invoke('test_complete', { 
        result: JSON.stringify({ success: false, error: 'Bundle eval error: ' + (evalErr.message || String(evalErr)) }) 
      });
      return;
    }
    
    // Wait for HabitsBundle to be defined (should be immediate after eval)
    let attempts = 0;
    while (!window.HabitsBundle && attempts < 30) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    
    if (!window.HabitsBundle) {
      await tauri.core.invoke('test_complete', { 
        result: JSON.stringify({ success: false, error: 'HabitsBundle not loaded after ' + attempts + ' attempts' }) 
      });
      return;
    }
    
    // Get secrets for the workflow
    const secretsIndex = await getSecretsIndex();
    const secrets = {};
    for (const key of secretsIndex) {
      secrets[key] = await getSecretFromKeyring(key);
    }
    
    console.log('[CLI] Executing workflow:', workflowName, 'with input:', JSON.stringify(input));
    
    // Execute the workflow
    const result = await window.HabitsBundle.executeWorkflow(workflowName, input, { env: secrets });
    
    console.log('[CLI] Workflow result:', JSON.stringify(result));
    
    // Output result and exit
    await tauri.core.invoke('test_complete', { 
      result: JSON.stringify({ success: true, result }) 
    });
    
  } catch (err) {
    console.error('[CLI] Error executing workflow:', err);
    const tauri = await waitForTauri();
    await tauri.core.invoke('test_complete', { 
      result: JSON.stringify({ success: false, error: err.message || String(err) }) 
    });
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
