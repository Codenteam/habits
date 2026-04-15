/**
 * Tauri Driver Stub for bit-wifi
 * 
 * Replaces driver.ts in Tauri environments.
 * Uses tauri-plugin-wifi for Wi-Fi functionality on Android.
 */

function wifiLog(level, message) {
  var fullMsg = '[wifi-driver-tauri] ' + message;
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

/**
 * Get the current Wi-Fi network information
 */
async function getCurrentNetwork() {
  var invoke = getInvoke();
  
  if (!invoke) {
    wifiLog('error', 'Tauri API not available - Wi-Fi requires Tauri app');
    return null;
  }

  wifiLog('info', 'Getting current network');

  try {
    var result = await invoke('plugin:wifi|get_current_network');
    
    if (result.network) {
      wifiLog('info', 'Connected to: ' + result.network.ssid);
      return {
        ssid: result.network.ssid,
        bssid: result.network.bssid,
        signalStrength: result.network.signalStrength,
        frequency: result.network.frequency,
        isSecure: result.network.isSecure
      };
    }
    
    wifiLog('info', 'Not connected to any network');
    return null;
  } catch (error) {
    wifiLog('error', 'Failed to get current network: ' + (error.message || error));
    return null;
  }
}

/**
 * Check if connected to Wi-Fi
 */
async function isConnected() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return false;
  }

  try {
    var result = await invoke('plugin:wifi|is_connected', {
      request: {}
    });
    return result.connected;
  } catch (error) {
    wifiLog('error', 'Failed to check connection: ' + (error.message || error));
    return false;
  }
}

/**
 * Check if connected to a specific network by SSID
 */
async function isConnectedTo(ssid) {
  var network = await getCurrentNetwork();
  return network?.ssid === ssid;
}

/**
 * List saved Wi-Fi networks
 */
async function listSavedNetworks() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return [];
  }

  try {
    var result = await invoke('plugin:wifi|list_saved_networks');
    wifiLog('info', 'Found ' + result.networks.length + ' saved networks');
    return result.networks;
  } catch (error) {
    wifiLog('error', 'Failed to list saved networks: ' + (error.message || error));
    return [];
  }
}

/**
 * Check Wi-Fi permissions
 */
async function checkPermissions() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return { location: 'unknown', wifi: 'unknown' };
  }

  try {
    var result = await invoke('plugin:wifi|check_permissions');
    return {
      location: result.location || 'unknown',
      wifi: result.wifi || 'unknown'
    };
  } catch (error) {
    return { location: 'unknown', wifi: 'unknown' };
  }
}

/**
 * Request Wi-Fi permissions
 */
async function requestPermissions() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return { location: 'denied', wifi: 'denied' };
  }

  try {
    var result = await invoke('plugin:wifi|request_permissions', {
      request: { permissions: ['location', 'wifi'] }
    });
    return {
      location: result.location || 'unknown',
      wifi: result.wifi || 'unknown'
    };
  } catch (error) {
    wifiLog('error', 'Failed to request permissions: ' + (error.message || error));
    return { location: 'denied', wifi: 'denied' };
  }
}

/**
 * Monitor Wi-Fi network changes (polling-based)
 */
function createNetworkMonitor(callback, intervalMs) {
  intervalMs = intervalMs || 5000;
  var lastSsid = null;
  var running = true;

  async function check() {
    if (!running) return;
    
    try {
      var network = await getCurrentNetwork();
      var currentSsid = network?.ssid || null;
      
      if (currentSsid !== lastSsid) {
        lastSsid = currentSsid;
        callback(network);
      }
    } catch (error) {
      wifiLog('error', 'Network monitor check failed: ' + error);
    }
    
    if (running) {
      setTimeout(check, intervalMs);
    }
  }

  // Start monitoring
  check();

  return {
    stop: function() {
      running = false;
    }
  };
}

// ES Module exports
export {
  getCurrentNetwork,
  isConnected,
  isConnectedTo,
  listSavedNetworks,
  checkPermissions,
  requestPermissions,
  createNetworkMonitor
};
