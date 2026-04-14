/**
 * Cortex - Main Application Logic
 * Handles habit import, storage, and execution
 */

// Module load marker for testing
window.__habitsModuleLoaded__ = true;
window.__habitsModuleVersion__ = '2026-04-11-v3';  // Version marker for cache debugging
console.log('[Habits] Module loaded, version:', window.__habitsModuleVersion__);

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
const SHOWCASE_BASE_URL = 'https://codenteam.com/intersect/habits';
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

/**
 * Fetch app version and build type from Tauri, display in header badge
 */
async function displayAppVersion() {
  const badge = document.getElementById('app-version-badge');
  if (!badge) return;

  try {
    const tauri = await waitForTauri();

    // Get version from Tauri app API
    let version = '1.0.0';
    if (tauri.app && tauri.app.getVersion) {
      version = await tauri.app.getVersion();
    }

    // Determine build type
    // Dev: running on localhost or with dev server
    // Debug: Tauri build with debug mode (devtools enabled)
    // Release: production build
    let buildType = 'release';
    if (isDev) {
      buildType = 'dev';
    } else if (tauri.app && tauri.app.getTauriVersion) {
      // In debug builds, devtools are typically enabled
      // We check by looking for dev indicators
      try {
        const tauriVer = await tauri.app.getTauriVersion();
        // Check if running from file:// or using debug tauri
        if (window.location.protocol === 'tauri:' && window.__TAURI_DEBUG__) {
          buildType = 'debug';
        }
      } catch (e) {
        // Ignore errors
      }
    }

    badge.textContent = `v${version} ${buildType}`;
    badge.className = buildType;
  } catch (e) {
    console.log('[Habits] Could not get app version:', e);
    badge.textContent = isDev ? 'dev' : '';
    badge.className = isDev ? 'dev' : '';
  }
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

async function getHomeDir() {
  const tauri = await waitForTauri();
  return tauri.path.homeDir();
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
  const tauri = await waitForTauri();
  if (!state.appDataPath) {
    state.appDataPath = await getAppDataDir();
  }
  // Use path.join for cross-platform compatibility (Android, iOS, desktop)
  return tauri.path.join(state.appDataPath, 'habits');
}

async function getManifestPath() {
  const tauri = await waitForTauri();
  const habitsDir = await getHabitsDir();
  return tauri.path.join(habitsDir, 'manifest.json');
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
    
    // Check for auto-ui marker (no frontend, UI generated from schema)
    const autoUiFile = zip.file('_auto-ui');
    const useAutoUi = !!autoUiFile;
    
    // Check for index.html (optional if auto-ui is enabled)
    let indexFile = zip.file('index.html');
    let indexHtml = null;

    if(!indexFile){
      // Try in frontend
      indexFile = zip.file('frontend/index.html');
    }
    
    if (indexFile) {
      indexHtml = await indexFile.async('string');
    } else if (!useAutoUi) {
      // No index.html and no auto-ui marker = invalid
      return {
        valid: false,
        error: {
          title: 'Invalid Habit File',
          message: 'The .habit file is missing index.html'
        }
      };
    }
    
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
    
    // Try to get habit name from stack.yaml inside zip (more reliable than file path)
    // File paths on Android are content:// URIs which don't contain the actual filename
    let habitName = 'Unknown';
    const stackFile = zip.file('stack.yaml') || zip.file('stack.yml');
    if (stackFile) {
      try {
        const stackContent = await stackFile.async('string');
        
        // 1. First try: explicit name field
        const nameMatch = stackContent.match(/^\s*"?name"?\s*:\s*['"]([^'"\n]+)['"]|^name:\s*['"]?([^'"\n]+)['"]?/m);
        if (nameMatch && (nameMatch[1] || nameMatch[2])) {
          habitName = (nameMatch[1] || nameMatch[2]).trim();
        }
        
        // 2. Second try: first workflow id (more reliable than filename on Android)
        if (habitName === 'Unknown') {
          const workflowIdMatch = stackContent.match(/^\s*-\s*id:\s*['"]?([^'"\n]+)['"]?/m);
          if (workflowIdMatch && workflowIdMatch[1]) {
            // Convert workflow-id to readable name: "hello-world" -> "Hello World"
            habitName = workflowIdMatch[1].trim()
              .split(/[-_]/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        }
      } catch (e) {
        console.log('[Habits] Could not parse stack.yaml for name:', e);
      }
    }
    
    // 3. Fallback: try to extract from filename (works on desktop, may fail on mobile)
    if (habitName === 'Unknown') {
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
      // On Android, content URIs may end with document IDs like "raw:12345" or just numbers
      // Check if it looks like a valid filename (contains .habit extension)
      if (fileName.endsWith('.habit')) {
        habitName = fileName.replace(/\.habit$/, '');
        // Convert filename to readable: "hello-world" -> "Hello World"
        habitName = habitName
          .split(/[-_]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
    
    console.log('[Habits] Extracted habit:', habitName);
    console.log('[Habits] Auto-UI mode:', useAutoUi);
    console.log('[Habits] Index HTML size:', indexHtml ? indexHtml.length : 0, 'bytes');
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
      useAutoUi,
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
    useAutoUi: extraction.useAutoUi || false,
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

/**
 * Extract habit from base64 data (identical to extractHabitFile but takes base64)
 * @param {string} base64Data - Base64 encoded .habit file content
 * @param {string} habitNameHint - Optional name hint for the habit
 */
async function extractHabitFromBase64(base64Data, habitNameHint = null) {
  console.log('[Habits] Extracting habit from base64, length:', base64Data.length);
  
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Load JSZip and extract
    if (!window.JSZip) {
      throw new Error('JSZip library not loaded');
    }
    
    const zip = await window.JSZip.loadAsync(bytes);
    
    // Check for auto-ui marker (no frontend, UI generated from schema)
    const autoUiFile = zip.file('_auto-ui');
    const useAutoUi = !!autoUiFile;
    
    // Check for index.html (optional if auto-ui is enabled)
    let indexFile = zip.file('index.html');
    let indexHtml = null;

    if (!indexFile) {
      indexFile = zip.file('frontend/index.html');
    }
    
    if (indexFile) {
      indexHtml = await indexFile.async('string');
    } else if (!useAutoUi) {
      return {
        valid: false,
        error: {
          title: 'Invalid Habit File',
          message: 'The .habit file is missing index.html'
        }
      };
    }
    
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
    
    // Try to get habit name from stack.yaml inside zip
    let habitName = habitNameHint || 'Unknown';
    const stackFile = zip.file('stack.yaml') || zip.file('stack.yml');
    if (stackFile && habitName === 'Unknown') {
      try {
        const stackContent = await stackFile.async('string');
        const nameMatch = stackContent.match(/^\s*"?name"?\s*:\s*['"]([^'"\n]+)['"]|^name:\s*['"]?([^'"\n]+)['"]?/m);
        if (nameMatch && (nameMatch[1] || nameMatch[2])) {
          habitName = (nameMatch[1] || nameMatch[2]).trim();
        }
        if (habitName === 'Unknown') {
          const workflowIdMatch = stackContent.match(/^\s*-\s*id:\s*['"]?([^'"\n]+)['"]?/m);
          if (workflowIdMatch && workflowIdMatch[1]) {
            habitName = workflowIdMatch[1].trim()
              .split(/[-_]/)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        }
      } catch (e) {
        console.log('[Habits] Could not parse stack.yaml for name:', e);
      }
    }
    
    console.log('[Habits] Extracted habit from base64:', habitName);
    console.log('[Habits] Auto-UI mode:', useAutoUi);
    console.log('[Habits] Index HTML size:', indexHtml ? indexHtml.length : 0, 'bytes');
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
      filePath: null,
      useAutoUi,
    };
  } catch (err) {
    console.error('[Habits] Failed to extract habit from base64:', err);
    return {
      valid: false,
      error: {
        title: 'Extraction Failed',
        message: 'Failed to extract habit from base64: ' + err.message
      }
    };
  }
}

/**
 * Import habit from base64 data (identical to importHabitFile but takes base64)
 * @param {string} base64Data - Base64 encoded .habit file content
 * @param {string} habitNameHint - Optional name hint for the habit
 * @returns {Promise<{success: boolean, habitId?: string, error?: string}>}
 */
async function importHabitFromBase64(base64Data, habitNameHint = null) {
  console.log('[Habits] Importing habit from base64');
  
  const extraction = await extractHabitFromBase64(base64Data, habitNameHint);
  
  if (!extraction.valid) {
    return { success: false, error: extraction.error.message };
  }
  
  // Generate unique ID
  const habitId = 'habit-' + Date.now();
  
  // Create habit entry with cached content
  const habit = {
    id: habitId,
    name: extraction.habitName,
    filePath: null, // No file path for base64 imports
    cachedIndexHtml: extraction.indexHtml,
    cachedBundleJs: extraction.bundleJs,
    cachedFiles: extraction.files,
    useAutoUi: extraction.useAutoUi || false,
    installedAt: new Date().toISOString(),
  };
  
  // Add to state and save
  state.habits.push(habit);
  await saveManifest();
  
  // Update UI
  renderHabitsList();
  
  console.log('[Habits] Habit imported from base64 successfully:', habit.name, 'id:', habitId);
  return { success: true, habitId, habitName: habit.name };
}

// Expose to window for testing
window.importHabitFromBase64 = importHabitFromBase64;

/**
 * Write a file to the app data directory from base64 content.
 * Uses native Tauri command for reliable cross-platform file writing.
 * @param {string} base64Content - Base64 encoded file content
 * @param {string} relativePath - Path relative to app data dir (e.g., "models/text-gen/qwen2-0.5b/model.gguf")
 * @param {boolean} append - If true, append to existing file (for chunked transfer)
 * @returns {Promise<{success: boolean, path?: string, bytesWritten?: number, error?: string}>}
 */
async function writeAppDataFile(base64Content, relativePath, append = false) {
  try {
    const tauri = await waitForTauri();
    if (!tauri || !tauri.core || !tauri.core.invoke) {
      return { success: false, error: 'Tauri invoke not available' };
    }

    const result = await tauri.core.invoke('write_app_data_file', {
      base64Content,
      relativePath,
      append,
    });

    console.log('[writeAppDataFile] Result:', result);
    return result;
  } catch (err) {
    console.error('[writeAppDataFile] Error:', err);
    return { success: false, error: err.message || String(err) };
  }
}

// Expose to window for testing/MCP
window.writeAppDataFile = writeAppDataFile;

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
  
  // If auto-UI mode, use form-based execution
  if (habit.useAutoUi) {
    console.log('[Habits] Using auto-UI mode for:', habit.name);
    return runHabitWithForm(habitId);
  }
  
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
      
      // Check if the re-extracted file now has auto-UI mode
      if (extraction.useAutoUi) {
        habit.useAutoUi = true;
        habit.cachedBundleJs = extraction.bundleJs;
        habit.cachedFiles = extraction.files;
        console.log('[Habits] Switching to auto-UI mode');
        return runHabitWithForm(habitId);
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
    
    // Push history state for back gesture support
    history.pushState({ habitView: true }, '', '#habit');
    
    // Use an iframe to properly load the HTML with scripts
    const contentContainer = document.getElementById('habit-content');
    contentContainer.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; background: transparent;';
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals';
    contentContainer.appendChild(iframe);
    
    // Bridge Tauri API to iframe - required for native plugin access from workflows
    // The iframe has allow-same-origin so we can access its contentWindow
    if (window.__TAURI__) {
      iframe.contentWindow.__TAURI__ = window.__TAURI__;
      iframe.contentWindow.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__;
      console.log('[Habits] Bridged __TAURI__ API to iframe');
    }
    
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
// Schema-Based Form Execution (Mobile UI)
// ============================================================================

/**
 * Parse habit YAML files to extract workflow schema
 * @param {object} habit - Habit object with cachedFiles
 * @returns {object} Schema information { workflows: [...], inputs: [...], env: [...] }
 */
function parseHabitWorkflows(habit) {
  const result = {
    workflows: [],
    inputs: [],
    outputs: [],
    env: [],
  };

  if (!habit.cachedFiles) {
    console.log('[Schema] No cached files for habit');
    return result;
  }

  // Find all workflow YAML files (habit.yaml, *.yaml in workflows folder, or listed in stack.yaml)
  const stackContent = habit.cachedFiles['stack.yaml'] || habit.cachedFiles['stack.yml'];
  
  if (stackContent) {
    try {
      // Parse stack.yaml workflows section to find workflow files
      // Format: 
      //   workflows:
      //     - id: hello-world
      //       path: ./habit.yaml
      const lines = stackContent.split('\n');
      let inWorkflows = false;
      let currentWorkflow = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const indent = line.search(/\S/);
        
        // Check for workflows section
        if (trimmed.startsWith('workflows:')) {
          inWorkflows = true;
          continue;
        }
        
        // Exit workflows section when hitting another top-level key
        if (indent === 0 && !trimmed.startsWith('-')) {
          // Process last workflow before exiting
          if (inWorkflows && currentWorkflow && currentWorkflow.id) {
            processWorkflowEntry(currentWorkflow, habit, result);
          }
          inWorkflows = false;
          currentWorkflow = null;
          continue;
        }
        
        if (!inWorkflows) continue;
        
        // New workflow item
        if (trimmed.startsWith('- id:') || trimmed.startsWith('-id:')) {
          // Save previous workflow
          if (currentWorkflow && currentWorkflow.id) {
            processWorkflowEntry(currentWorkflow, habit, result);
          }
          const idMatch = trimmed.match(/^-\s*id:\s*['"]?([^'"\n]+)['"]?/);
          currentWorkflow = { id: idMatch ? idMatch[1].trim() : null, path: null };
        } else if (trimmed.startsWith('id:') && currentWorkflow) {
          const idMatch = trimmed.match(/^id:\s*['"]?([^'"\n]+)['"]?/);
          if (idMatch) currentWorkflow.id = idMatch[1].trim();
        } else if (trimmed.startsWith('path:') && currentWorkflow) {
          const pathMatch = trimmed.match(/^path:\s*['"]?([^'"\n]+)['"]?/);
          if (pathMatch) currentWorkflow.path = pathMatch[1].trim().replace(/^\.\//, '');
        }
      }
      
      // Process last workflow
      if (currentWorkflow && currentWorkflow.id) {
        processWorkflowEntry(currentWorkflow, habit, result);
      }
    } catch (e) {
      console.error('[Schema] Failed to parse workflows:', e instanceof Error ? e.message : JSON.stringify(e), e instanceof Error ? e.stack : '');
    }
  }

  // Deduplicate env vars
  const envMap = new Map();
  for (const env of result.env) {
    if (!envMap.has(env.id)) {
      envMap.set(env.id, env);
    }
  }
  result.env = Array.from(envMap.values());

  console.log('[Schema] Parsed workflows:', result.workflows.length, 'inputs:', result.inputs.length, 'env:', result.env.length);
  return result;
}

/**
 * Process a workflow entry from stack.yaml
 */
function processWorkflowEntry(workflow, habit, result) {
  const workflowId = workflow.id;
  const workflowPath = workflow.path;
  
  // Try to find the habit file using path or fallback patterns
  const habitFile = (workflowPath && habit.cachedFiles[workflowPath])
    || habit.cachedFiles[`${workflowId}/habit.yaml`] 
    || habit.cachedFiles[`${workflowId}/habit.yml`]
    || habit.cachedFiles[`${workflowId}.yaml`]
    || habit.cachedFiles[`${workflowId}.yml`]
    || habit.cachedFiles['habit.yaml']
    || habit.cachedFiles['habit.yml'];
  
  console.log('[Schema] Processing workflow:', workflowId, 'path:', workflowPath, 'found:', !!habitFile);
  
  if (habitFile) {
    const schema = parseHabitYaml(habitFile, workflowId);
    result.workflows.push({
      id: workflowId,
      name: schema.name || workflowId,
      description: schema.description || '',
      schema,
    });
    // Merge inputs/outputs/env
    result.inputs.push(...schema.inputs);
    result.outputs.push(...schema.outputs);
    result.env.push(...schema.env);
  } else {
    // Add workflow with no schema
    result.workflows.push({
      id: workflowId,
      name: workflowId,
      description: '',
      schema: { inputs: [], outputs: [], env: [], hasExplicitSchema: false },
    });
  }
}

/**
 * Parse a single habit.yaml file content
 */
function parseHabitYaml(yamlContent, defaultId) {
  // Use SchemaForm parser if available
  if (window.SchemaForm) {
    // Simple YAML parsing (basic key: value extraction)
    const habitObj = simpleYamlParse(yamlContent);
    return window.SchemaForm.parseHabitSchema(habitObj);
  }
  
  // Fallback: basic parsing
  return {
    id: defaultId,
    name: defaultId,
    inputs: [],
    outputs: [],
    env: [],
    hasExplicitSchema: false,
  };
}

/**
 * Simple YAML parser for basic habit.yaml structure
 * Handles: id, name, description, input (array), output (object/array), env (array), nodes (array)
 */
function simpleYamlParse(yamlContent) {
  const result = {
    id: null,
    name: null,
    description: null,
    input: [],
    output: null,
    env: [],
    nodes: [],
  };

  const lines = yamlContent.split('\n');
  let currentKey = null;
  let currentArray = null;
  let currentArrayItem = null;
  let indentLevel = 0;
  let arrayStartIndent = 0;  // Track expected indentation for array items
  
  // For output object parsing
  let outputKey = null;
  let outputKeyIndent = 0;
  
  // For OpenAPI-style input parsing
  let inputObjectMode = false;
  let inputPropertiesSection = false;
  let currentInputProperty = null;
  let currentInputPropertyIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) continue;

    const lineIndent = line.search(/\S/);
    
    // Top-level keys
    if (lineIndent === 0) {
      // Save previous array item
      if (currentArray && currentArrayItem) {
        result[currentArray].push(currentArrayItem);
        currentArrayItem = null;
      }
      // Save previous input property if in object mode
      if (inputObjectMode && currentInputProperty) {
        result.input.push(currentInputProperty);
        currentInputProperty = null;
      }
      outputKey = null;
      inputObjectMode = false;
      inputPropertiesSection = false;
      
      const match = trimmed.match(/^([a-zA-Z_]+):\s*(.*)?$/);
      if (match) {
        currentKey = match[1];
        const value = match[2]?.trim();
        
        if (currentKey === 'input') {
          // Check if next non-empty line has "type: object" or "properties:" 
          // to determine if this is OpenAPI format
          let nextIdx = i + 1;
          while (nextIdx < lines.length) {
            const nextLine = lines[nextIdx].trim();
            if (nextLine && !nextLine.startsWith('#')) {
              if (nextLine.startsWith('type:') || nextLine.startsWith('properties:')) {
                // OpenAPI object format
                inputObjectMode = true;
                result.input = [];
                currentArray = null;
              } else if (nextLine.startsWith('- ')) {
                // Array format
                currentArray = 'input';
                arrayStartIndent = 2;
                result.input = [];
              }
              break;
            }
            nextIdx++;
          }
          if (!inputObjectMode) {
            currentArray = 'input';
            arrayStartIndent = 2;
            result.input = [];
          }
        } else if (currentKey === 'env' || currentKey === 'nodes') {
          currentArray = currentKey;
          arrayStartIndent = 2;  // Top-level array items should be at indent 2
          result[currentKey] = [];
        } else if (currentKey === 'output') {
          // Output can be object or array - check next line
          currentArray = null;
          result.output = {};
        } else if (value && !value.startsWith('|') && !value.startsWith('>')) {
          result[currentKey] = value.replace(/^['"]|['"]$/g, '');
          currentArray = null;
        }
      }
    } else if (inputObjectMode && currentKey === 'input') {
      // Handle OpenAPI-style input parsing
      const propMatch = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (propMatch) {
        const propName = propMatch[1];
        const propValue = propMatch[2]?.trim().replace(/^['"]|['"]$/g, '');
        
        if (propName === 'properties' && lineIndent === 2) {
          // Entering properties section
          inputPropertiesSection = true;
        } else if (propName === 'required' && lineIndent === 2) {
          // Required array - parse subsequent lines for required field names
          inputPropertiesSection = false;
          // Read the required array items
          let reqIdx = i + 1;
          while (reqIdx < lines.length) {
            const reqLine = lines[reqIdx].trim();
            if (reqLine.startsWith('- ')) {
              const reqField = reqLine.replace(/^-\s*/, '').replace(/^['"]|['"]$/g, '');
              // Mark the field as required
              const field = result.input.find(f => f.id === reqField);
              if (field) field.required = true;
            } else if (reqLine && !reqLine.startsWith('#')) {
              break; // Exit on non-array line
            }
            reqIdx++;
          }
        } else if (inputPropertiesSection && lineIndent === 4 && !propValue) {
          // New property in properties section (e.g., "prompt:")
          if (currentInputProperty) {
            result.input.push(currentInputProperty);
          }
          currentInputProperty = { id: propName, type: 'string' };
          currentInputPropertyIndent = lineIndent;
        } else if (currentInputProperty && lineIndent > currentInputPropertyIndent) {
          // Property details (e.g., "type: string", "description: ...")
          let value = propValue;
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          currentInputProperty[propName] = value;
        }
      }
    } else if (currentArray && trimmed.startsWith('- ') && lineIndent === arrayStartIndent) {
      // Array item - only at expected indentation level
      if (currentArrayItem) {
        result[currentArray].push(currentArrayItem);
      }
      
      // Check if it's inline: - id: value
      const inlineMatch = trimmed.match(/^-\s*([a-zA-Z_]+):\s*(.+)$/);
      if (inlineMatch) {
        currentArrayItem = { [inlineMatch[1]]: inlineMatch[2].replace(/^['"]|['"]$/g, '') };
      } else {
        currentArrayItem = {};
      }
      indentLevel = lineIndent;
    } else if (currentArrayItem && lineIndent > indentLevel) {
      // Property of current array item
      const propMatch = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (propMatch) {
        let value = propMatch[2]?.trim().replace(/^['"]|['"]$/g, '');
        // Handle booleans
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        currentArrayItem[propMatch[1]] = value;
      }
    } else if (currentKey === 'output' && !currentArray) {
      // Output object properties - support nested objects
      const propMatch = trimmed.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (propMatch) {
        const propName = propMatch[1];
        const propValue = propMatch[2]?.trim().replace(/^['"]|['"]$/g, '');
        
        // Check if this is a top-level output key (e.g., "greeting:") or a nested property
        if (lineIndent === 2 && !propValue) {
          // This is a top-level output key with nested properties
          outputKey = propName;
          outputKeyIndent = lineIndent;
          result.output[outputKey] = {};
        } else if (lineIndent === 2 && propValue) {
          // Simple output value (e.g., "result: {{node}}")
          result.output[propName] = propValue;
          outputKey = null;
        } else if (outputKey && lineIndent > outputKeyIndent) {
          // Nested property of output key
          let value = propValue;
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          result.output[outputKey][propName] = value;
        }
      }
    }
  }

  // Don't forget last item
  if (currentArray && currentArrayItem) {
    result[currentArray].push(currentArrayItem);
  }
  
  // Don't forget last input property if in object mode
  if (inputObjectMode && currentInputProperty) {
    result.input.push(currentInputProperty);
  }

  return result;
}

/**
 * Run a habit with auto-generated form UI
 * @param {string} habitId - Habit ID
 * @param {string} workflowId - Optional specific workflow to run
 */
async function runHabitWithForm(habitId, workflowId = null) {
  const habit = state.habits.find(h => h.id === habitId);
  if (!habit) {
    showError('Error', 'Habit not found');
    return;
  }

  // Check secrets
  const { allSet, missing } = await checkRequiredSecrets(habit);
  if (!allSet) {
    showSecretsModal(habit);
    return;
  }

  state.currentHabit = habit;

  try {
    // Ensure we have cached files
    if (!habit.cachedFiles && habit.filePath) {
      const extraction = await extractHabitFile(habit.filePath);
      if (!extraction.valid) {
        showError(extraction.error.title, extraction.error.message);
        goBackToList();
        return;
      }
      habit.cachedIndexHtml = extraction.indexHtml;
      habit.cachedBundleJs = extraction.bundleJs;
      habit.cachedFiles = extraction.files;
    }

    // Parse workflows and schema
    const workflowInfo = parseHabitWorkflows(habit);
    
    if (workflowInfo.workflows.length === 0) {
      showError('No Workflows', 'This habit has no runnable workflows');
      goBackToList();
      return;
    }

    // Select workflow
    let targetWorkflow = workflowInfo.workflows[0];
    if (workflowId) {
      targetWorkflow = workflowInfo.workflows.find(w => w.id === workflowId) || targetWorkflow;
    }

    console.log('[Form] Running workflow:', targetWorkflow.id, 'with schema:', targetWorkflow.schema);

    // Show form view
    document.getElementById('habit-view').classList.add('active');
    
    // Push history state for back gesture support
    history.pushState({ habitView: true }, '', '#habit');
    
    const contentContainer = document.getElementById('habit-content');
    contentContainer.innerHTML = '';

    // Inject schema form styles
    if (window.SchemaForm) {
      window.SchemaForm.injectFormStyles();
    }

    // Generate form HTML
    const formHtml = window.SchemaForm 
      ? window.SchemaForm.generateFormHtml(targetWorkflow.schema, targetWorkflow.id)
      : generateFallbackFormHtml(targetWorkflow);

    // Create form container
    const formContainer = document.createElement('div');
    formContainer.className = 'schema-form-wrapper';
    formContainer.innerHTML = `
      <div class="form-header">
        <h2 class="form-title">${escapeHtml(targetWorkflow.name || targetWorkflow.id)}</h2>
        ${targetWorkflow.description ? `<p class="form-description">${escapeHtml(targetWorkflow.description)}</p>` : ''}
      </div>
      ${formHtml}
      ${workflowInfo.workflows.length > 1 ? generateWorkflowTabs(workflowInfo.workflows, targetWorkflow.id, habitId) : ''}
    `;
    contentContainer.appendChild(formContainer);

    // Setup form submission handler
    const form = formContainer.querySelector('form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await executeWorkflowFromForm(habit, targetWorkflow, form, formContainer);
      });
    }

    // Setup workflow tab click handlers
    const workflowTabs = formContainer.querySelectorAll('.workflow-tab');
    workflowTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const workflowId = tab.dataset.workflowId;
        if (workflowId && workflowId !== targetWorkflow.id) {
          runHabitWithForm(habitId, workflowId);
        }
      });
    });

    // Setup file picker buttons
    const fileButtons = formContainer.querySelectorAll('.form-file-btn');
    fileButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const fieldId = btn.dataset.field;
        const input = formContainer.querySelector(`#field-${fieldId}`);
        if (input) {
          const tauri = await waitForTauri();
          const selected = await tauri.dialog.open({
            multiple: false,
            title: 'Select File',
          });
          if (selected) {
            input.value = selected;
          }
        }
      });
    });

    console.log('[Form] Form UI rendered');

  } catch (err) {
    console.error('Failed to run habit with form:', err);
    showError('Error', 'Failed to load habit: ' + err.message);
    goBackToList();
  }
}

/**
 * Generate workflow tabs at bottom of form
 */
function generateWorkflowTabs(workflows, selectedId, habitId) {
  const tabs = workflows.map(w => {
    const displayName = w.name || w.id;
    const isActive = w.id === selectedId;
    return `<button type="button" class="workflow-tab${isActive ? ' active' : ''}" data-workflow-id="${escapeHtml(w.id)}">${escapeHtml(displayName)}</button>`;
  }).join('');
  
  return `
    <div class="workflow-tabs-container">
      ${tabs}
    </div>
  `;
}

/**
 * Generate fallback form HTML when SchemaForm is not available
 */
function generateFallbackFormHtml(workflow) {
  return `
    <div class="fallback-form">
      <p>Schema form library not loaded. Please run with bundled UI instead.</p>
      <button type="button" onclick="runHabit('${workflow.id}')" class="form-submit-btn">
        Run with Bundled UI
      </button>
    </div>
  `;
}

/**
 * Execute workflow from form submission
 */
async function executeWorkflowFromForm(habit, workflow, form, formContainer) {
  const submitBtn = form.querySelector('.form-submit-btn');
  const outputContainer = formContainer.querySelector(`#workflow-form-${workflow.id}-output`);

  // Disable button and show loading
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<span>Running...</span>';
  }

  try {
    // Collect form data
    const inputData = window.SchemaForm 
      ? window.SchemaForm.collectFormData(form, workflow.schema.inputs)
      : collectBasicFormData(form);

    // Validate
    if (window.SchemaForm) {
      const validation = window.SchemaForm.validateFormData(inputData, workflow.schema.inputs);
      if (!validation.valid) {
        showFormErrors(form, validation.errors);
        return;
      }
    }

    console.log('[Form] Executing workflow:', workflow.id, 'with input:', inputData);

    // Always load the per-habit bundle if available — the global cortex-bundle-all.js
    // may not contain this habit's specific workflow definitions.
    if (habit.cachedBundleJs) {
      console.log('[Form] Loading per-habit bundle...');
      eval(habit.cachedBundleJs);
      
      // Wait for HabitsBundle to be defined
      let attempts = 0;
      while (!window.HabitsBundle && attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
    }

    if (!window.HabitsBundle) {
      throw new Error('Workflow executor not loaded');
    }

    // Get secrets
    const secretsIndex = await getSecretsIndex();
    const secrets = {};
    for (const key of secretsIndex) {
      secrets[key] = await getSecretFromKeyring(key);
    }
    
    // Inject LOCAL_AI_MODELS_PATH pointing to app data models directory
    try {
      const appDataDir = await getAppDataDir();
      const tauri = await waitForTauri();
      secrets.LOCAL_AI_MODELS_PATH = await tauri.path.join(appDataDir, 'models');
      console.log('[Form] LOCAL_AI_MODELS_PATH:', secrets.LOCAL_AI_MODELS_PATH);
    } catch (e) {
      console.warn('[Form] Could not set models path:', e);
    }

    // Execute workflow
    const result = await window.HabitsBundle.executeWorkflow(workflow.id, inputData, { env: secrets });

    console.log('[Form] Workflow result:', result);

    // Render output based on status
    if (outputContainer) {
      outputContainer.classList.remove('hidden');
      
      // Check if workflow failed
      if (result.status === 'failed') {
        // Collect error messages from failed nodes
        const errors = (result.results || [])
          .filter(r => !r.success && r.error)
          .map(r => `${r.nodeId}: ${r.error}`)
          .join('\n');
        
        outputContainer.innerHTML = `
          <div class="output-header">
            <span class="output-error-badge">✗ Failed</span>
          </div>
          <div class="output-error">
            <strong>Workflow execution failed:</strong>
            <pre class="error-details">${escapeHtml(errors || 'Unknown error')}</pre>
          </div>
        `;
      } else {
        // Success - render output
        outputContainer.innerHTML = `
          <div class="output-header">
            <span class="output-success">✓ Completed</span>
          </div>
          ${window.SchemaForm 
            ? window.SchemaForm.generateOutputHtml(workflow.schema, result)
            : `<pre class="output-json">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`
          }
        `;
      }
    }

  } catch (err) {
    console.error('[Form] Workflow execution failed:', err);
    
    if (outputContainer) {
      outputContainer.classList.remove('hidden');
      outputContainer.innerHTML = `
        <div class="output-error">
          <strong>Error:</strong> ${escapeHtml(err.message || String(err))}
        </div>
      `;
    }
  } finally {
    // Re-enable button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitBtn.innerHTML = `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        Run Again
      `;
    }
  }
}

/**
 * Collect basic form data when SchemaForm is not available
 */
function collectBasicFormData(form) {
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

/**
 * Show validation errors on form fields
 */
function showFormErrors(form, errors) {
  // Clear previous errors
  form.querySelectorAll('.form-field').forEach(field => {
    field.classList.remove('has-error');
    const errorEl = field.querySelector('.form-error');
    if (errorEl) errorEl.remove();
  });

  // Show new errors
  for (const [fieldId, message] of Object.entries(errors)) {
    const fieldContainer = form.querySelector(`[data-field-id="${fieldId}"]`);
    if (fieldContainer) {
      fieldContainer.classList.add('has-error');
      const errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      errorEl.textContent = message;
      fieldContainer.appendChild(errorEl);
    }
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
          <div class="dropdown-item habit-run-form" data-habit-id="${habit.id}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Run with Form
          </div>
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
    
    // Add run with form click handler
    const runFormBtn = item.querySelector('.habit-run-form');
    runFormBtn.onclick = (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      runHabitWithForm(habit.id);
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

function goBackToList(fromPopState = false) {
  if (!state.currentHabit) return;
  
  state.currentHabit = null;
  
  // Clear habit content
  document.getElementById('habit-content').innerHTML = '';
  
  // Hide habit view
  document.getElementById('habit-view').classList.remove('active');
  
  // Clean up history if not triggered by back gesture
  if (!fromPopState && location.hash === '#habit') {
    history.back();
  }
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
      const response = await tauriFetch(SHOWCASE_INDEX_URL);
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
    const response = await tauriFetch(habitUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Save to app data directory (use path.join for Android/iOS compatibility)
    const tauri = await waitForTauri();
    const appDataDir = await tauri.path.appDataDir();
    const habitsDir = await tauri.path.join(appDataDir, 'habits');
    
    // Ensure habits directory exists
    if (!(await exists(habitsDir))) {
      await createDir(habitsDir);
    }
    
    const filename = habit.slug + '.habit';
    const filePath = await tauri.path.join(habitsDir, filename);
    
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

function openHabitViewer(yamlContentOrHabitId) {
  let yamlContent = yamlContentOrHabitId;
  
  // If a habit ID was passed (e.g., "habit-1234567890"), look up the habit's YAML content
  if (typeof yamlContentOrHabitId === 'string' && yamlContentOrHabitId.startsWith('habit-')) {
    const habit = state.habits.find(h => h.id === yamlContentOrHabitId);
    if (!habit) {
      showError('Error', `Habit not found: ${yamlContentOrHabitId}`);
      return;
    }
    
    // Try to find a workflow YAML file (habit.yaml, stack.yaml, or any .yaml file)
    const cachedFiles = habit.cachedFiles || {};
    const yamlFiles = ['stack.yaml', 'habit.yaml'];
    let foundYaml = null;
    
    for (const fileName of yamlFiles) {
      if (cachedFiles[fileName]) {
        foundYaml = cachedFiles[fileName];
        break;
      }
    }
    
    // Fallback: find any .yaml file that's not in frontend/
    if (!foundYaml) {
      for (const [fileName, content] of Object.entries(cachedFiles)) {
        if (fileName.endsWith('.yaml') && !fileName.startsWith('frontend')) {
          foundYaml = content;
          break;
        }
      }
    }
    
    if (!foundYaml) {
      showError('Error', `No YAML content found in habit: ${habit.name}`);
      return;
    }
    
    yamlContent = foundYaml;
  }
  
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
      .viewer-fallback {
        display: none;
        width: 100%;
        height: 100%;
        overflow: auto;
        padding: 32px;
        box-sizing: border-box;
      }
      .viewer-fallback pre {
        background: #1a1a24;
        color: #e2e8f0;
        padding: 20px;
        border-radius: 8px;
        font-family: 'SF Mono', Monaco, Consolas, monospace;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
        margin: 0;
      }
      .viewer-fallback-title {
        color: #8b8b9e;
        font-size: 14px;
        margin-bottom: 16px;
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
        onload="checkViewerFrame(this)"
      ></iframe>
      <div class="viewer-fallback" id="viewer-fallback">
        <div class="viewer-fallback-title">YAML Content (Visual viewer unavailable in dev mode)</div>
        <pre>${yamlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>
    </div>
  `;
  
  // Replace the current view with the habit viewer iframe
  document.body.innerHTML = viewerHtml;
  
  // Check if iframe loaded properly (React app mounted)
  window.checkViewerFrame = function(iframe) {
    try {
      setTimeout(() => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        const root = doc?.getElementById('root');
        // If root is empty after 2 seconds, show fallback
        if (!root || root.children.length === 0) {
          iframe.style.display = 'none';
          document.getElementById('viewer-fallback').style.display = 'block';
        }
      }, 2000);
    } catch (e) {
      // Cross-origin error - show fallback
      iframe.style.display = 'none';
      document.getElementById('viewer-fallback').style.display = 'block';
    }
  };
  
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

  // Display app version badge
  displayAppVersion();

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
  
  // Handle mobile back gesture (popstate event)
  window.addEventListener('popstate', (e) => {
    if (state.currentHabit) {
      goBackToList(true);
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
}




// Start when DOM is ready
// Pre-expose testing functions (sync) before init runs (async)
try {
  window.__habits__ = {
    importHabitFile,
    importHabitFromBase64,
    writeAppDataFile,
    handleOpenHabitFile,
    openHabitViewer,
    runHabitWithForm,
    sendMessage: window.sendMessage,
    getHabits: () => state.habits,
    getState: () => state,
  };
  console.log('[Habits] __habits__ pre-exposed successfully');
} catch (e) {
  console.error('[Habits] Error pre-exposing __habits__:', e);
  window.__habitsError__ = e?.message || String(e);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  console.log('[Habits] DOM already ready, calling init directly');
  init().catch(err => console.error('[Habits] Init error:', err));
}
