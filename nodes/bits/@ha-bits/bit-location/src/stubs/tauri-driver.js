/**
 * Tauri Driver Stub for bit-location
 * 
 * Replaces driver.ts in Tauri environments.
 * Uses @tauri-apps/plugin-geolocation for device location services.
 */

function tauriLog(level, message) {
  var fullMsg = '[location-driver-tauri] ' + message;
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
 * Active watch callbacks
 */
var watchCallbacks = {};
var watchIdCounter = 0;

/**
 * Get current device position
 */
async function getCurrentPosition(options) {
  var invoke = getInvoke();
  
  if (!invoke) {
    throw new Error('Tauri API not available - location services require Tauri app');
  }

  var enableHighAccuracy = options?.enableHighAccuracy !== false;
  var timeout = options?.timeout || 10000;
  var maximumAge = options?.maximumAge || 0;

  tauriLog('info', 'Getting current position (highAccuracy=' + enableHighAccuracy + ')');

  try {
    // Check permissions first
    var perms = await invoke('plugin:geolocation|check_permissions');
    
    if (perms.location !== 'granted') {
      tauriLog('info', 'Requesting location permissions...');
      perms = await invoke('plugin:geolocation|request_permissions', {
        permissions: ['location']
      });
      
      if (perms.location !== 'granted') {
        throw new Error('Location permission denied');
      }
    }

    // Get current position
    var position = await invoke('plugin:geolocation|get_current_position', {
      options: {
        enableHighAccuracy: enableHighAccuracy,
        timeout: timeout,
        maximumAge: maximumAge
      }
    });

    tauriLog('info', 'Got position: ' + position.coords.latitude + ', ' + position.coords.longitude);

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    };
  } catch (error) {
    tauriLog('error', 'Failed to get position: ' + error.message);
    throw error;
  }
}

/**
 * Start watching position changes
 */
async function watchPosition(options, callback) {
  var invoke = getInvoke();
  
  if (!invoke) {
    throw new Error('Tauri API not available - location services require Tauri app');
  }

  var enableHighAccuracy = options?.enableHighAccuracy !== false;
  var timeout = options?.timeout || 10000;
  var maximumAge = options?.maximumAge || 0;

  tauriLog('info', 'Starting position watch...');

  try {
    // Check permissions first
    var perms = await invoke('plugin:geolocation|check_permissions');
    
    if (perms.location !== 'granted') {
      perms = await invoke('plugin:geolocation|request_permissions', {
        permissions: ['location']
      });
      
      if (perms.location !== 'granted') {
        throw new Error('Location permission denied');
      }
    }

    // Generate watch ID
    var watchId = 'watch-' + (++watchIdCounter);
    
    // Store callback
    watchCallbacks[watchId] = callback;

    // Start watching
    await invoke('plugin:geolocation|watch_position', {
      options: {
        enableHighAccuracy: enableHighAccuracy,
        timeout: timeout,
        maximumAge: maximumAge
      },
      callback: function(position) {
        var cb = watchCallbacks[watchId];
        if (cb) {
          cb({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          });
        }
      }
    });

    tauriLog('info', 'Position watch started: ' + watchId);
    return watchId;
  } catch (error) {
    tauriLog('error', 'Failed to start position watch: ' + error.message);
    throw error;
  }
}

/**
 * Clear position watch
 */
async function clearWatch(watchId) {
  var invoke = getInvoke();
  
  if (!invoke) {
    throw new Error('Tauri API not available');
  }

  tauriLog('info', 'Clearing position watch: ' + watchId);

  try {
    // Remove callback
    delete watchCallbacks[watchId];

    // Clear watch in Tauri
    await invoke('plugin:geolocation|clear_watch', {
      channelId: parseInt(watchId.replace('watch-', ''), 10)
    });

    tauriLog('info', 'Position watch cleared');
  } catch (error) {
    tauriLog('error', 'Failed to clear watch: ' + error.message);
    throw error;
  }
}

/**
 * Check location permissions
 */
async function checkPermissions() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return { location: 'denied' };
  }

  try {
    var perms = await invoke('plugin:geolocation|check_permissions');
    return { location: perms.location || 'denied' };
  } catch (error) {
    tauriLog('error', 'Failed to check permissions: ' + error.message);
    return { location: 'denied' };
  }
}

/**
 * Request location permissions
 */
async function requestPermissions() {
  var invoke = getInvoke();
  
  if (!invoke) {
    throw new Error('Tauri API not available');
  }

  try {
    var perms = await invoke('plugin:geolocation|request_permissions', {
      permissions: ['location']
    });
    return { location: perms.location || 'denied' };
  } catch (error) {
    tauriLog('error', 'Failed to request permissions: ' + error.message);
    throw error;
  }
}

// Export functions
module.exports = {
  getCurrentPosition: getCurrentPosition,
  watchPosition: watchPosition,
  clearWatch: clearWatch,
  checkPermissions: checkPermissions,
  requestPermissions: requestPermissions
};
