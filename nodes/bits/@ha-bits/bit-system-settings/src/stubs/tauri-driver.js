/**
 * Tauri Driver Stub for bit-system-settings
 * 
 * Replaces driver.ts in Tauri environments.
 * Uses tauri-plugin-system-settings for system control on Android.
 */

function settingsLog(level, message) {
  var fullMsg = '[system-settings-driver-tauri] ' + message;
  if (level === 'error') console.error(fullMsg);
  else if (level === 'warn') console.warn(fullMsg);
  else console.log(fullMsg);
}

/**
 * Get the Tauri invoke function
 */
function getInvoke() {
  if (typeof window === 'undefined') return null;
  if (window.__TAURI__?.core?.invoke) return window.__TAURI__.core.invoke;
  if (window.__TAURI__?.invoke) return window.__TAURI__.invoke;
  if (window.__TAURI_INTERNALS__?.invoke) return window.__TAURI_INTERNALS__.invoke;
  return null;
}

// Volume functions

/**
 * Get volume for a stream
 */
async function getVolume(stream) {
  var invoke = getInvoke();
  stream = stream || 'media';
  
  if (!invoke) {
    settingsLog('error', 'Tauri API not available');
    return { level: 0.5, muted: false, max: 100, current: 50 };
  }

  try {
    var result = await invoke('plugin:system-settings|get_volume', {
      stream: stream
    });
    return result;
  } catch (error) {
    settingsLog('error', 'Failed to get volume: ' + (error.message || error));
    return { level: 0.5, muted: false, max: 100, current: 50 };
  }
}

/**
 * Set volume for a stream
 */
async function setVolume(level, stream, showUi) {
  var invoke = getInvoke();
  stream = stream || 'media';
  showUi = showUi || false;
  
  if (!invoke) {
    settingsLog('error', 'Tauri API not available');
    return;
  }

  settingsLog('info', 'Setting volume to ' + level + ' for stream ' + stream);

  try {
    await invoke('plugin:system-settings|set_volume', {
      level: level,
      stream: stream,
      showUi: showUi
    });
  } catch (error) {
    settingsLog('error', 'Failed to set volume: ' + (error.message || error));
  }
}

/**
 * Set mute state for a stream
 */
async function setMute(mute, stream) {
  var invoke = getInvoke();
  stream = stream || 'media';
  
  if (!invoke) {
    return;
  }

  try {
    await invoke('plugin:system-settings|set_mute', {
      mute: mute,
      stream: stream
    });
  } catch (error) {
    settingsLog('error', 'Failed to set mute: ' + (error.message || error));
  }
}

// Ringer mode functions

/**
 * Get ringer mode
 */
async function getRingerMode() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return { mode: 'normal' };
  }

  try {
    var result = await invoke('plugin:system-settings|get_ringer_mode');
    return result;
  } catch (error) {
    settingsLog('error', 'Failed to get ringer mode: ' + (error.message || error));
    return { mode: 'normal' };
  }
}

/**
 * Set ringer mode
 */
async function setRingerMode(mode) {
  var invoke = getInvoke();
  
  if (!invoke) {
    return;
  }

  settingsLog('info', 'Setting ringer mode to ' + mode);

  try {
    await invoke('plugin:system-settings|set_ringer_mode', {
      mode: mode
    });
  } catch (error) {
    settingsLog('error', 'Failed to set ringer mode: ' + (error.message || error));
  }
}

// Bluetooth functions

/**
 * Get Bluetooth state
 */
async function getBluetoothState() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return { state: 'off', enabled: false };
  }

  try {
    var result = await invoke('plugin:system-settings|get_bluetooth_state');
    return result;
  } catch (error) {
    settingsLog('error', 'Failed to get Bluetooth state: ' + (error.message || error));
    return { state: 'off', enabled: false };
  }
}

/**
 * Set Bluetooth state
 */
async function setBluetooth(enabled) {
  var invoke = getInvoke();
  
  if (!invoke) {
    return;
  }

  settingsLog('info', 'Setting Bluetooth to ' + (enabled ? 'enabled' : 'disabled'));

  try {
    await invoke('plugin:system-settings|set_bluetooth', {
      enabled: enabled
    });
  } catch (error) {
    settingsLog('error', 'Failed to set Bluetooth: ' + (error.message || error));
  }
}

// Do Not Disturb functions

/**
 * Get DND state
 */
async function getDndState() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return { enabled: false, hasPermission: false };
  }

  try {
    var result = await invoke('plugin:system-settings|get_dnd_state');
    return result;
  } catch (error) {
    settingsLog('error', 'Failed to get DND state: ' + (error.message || error));
    return { enabled: false, hasPermission: false };
  }
}

/**
 * Set DND state
 */
async function setDnd(enabled) {
  var invoke = getInvoke();
  
  if (!invoke) {
    return;
  }

  settingsLog('info', 'Setting DND to ' + (enabled ? 'enabled' : 'disabled'));

  try {
    await invoke('plugin:system-settings|set_dnd', {
      enabled: enabled
    });
  } catch (error) {
    settingsLog('error', 'Failed to set DND: ' + (error.message || error));
  }
}

// ES Module exports
export {
  getVolume,
  setVolume,
  setMute,
  getRingerMode,
  setRingerMode,
  getBluetoothState,
  setBluetooth,
  getDndState,
  setDnd
};
