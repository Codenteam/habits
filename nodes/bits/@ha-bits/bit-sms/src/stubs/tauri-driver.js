/**
 * Tauri Driver Stub for bit-sms
 * 
 * Replaces driver.ts in Tauri environments.
 * Uses tauri-plugin-sms for SMS functionality on Android.
 */

function smsLog(level, message) {
  var fullMsg = '[sms-driver-tauri] ' + message;
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
 * Send an SMS message
 */
async function sendSms(phoneNumber, message) {
  var invoke = getInvoke();
  
  if (!invoke) {
    smsLog('error', 'Tauri API not available - SMS requires Tauri app');
    return { success: false, error: 'Tauri API not available' };
  }

  smsLog('info', 'Sending SMS to ' + phoneNumber);

  try {
    var result = await invoke('plugin:sms|send_sms', {
      request: {
        phoneNumber: phoneNumber,
        message: message
      }
    });
    
    smsLog('info', 'SMS sent successfully');
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    smsLog('error', 'Failed to send SMS: ' + (error.message || error));
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}

/**
 * Read SMS messages (Android only)
 */
async function readSms(options) {
  var invoke = getInvoke();
  
  if (!invoke) {
    smsLog('error', 'Tauri API not available - SMS requires Tauri app');
    return { messages: [], totalCount: 0 };
  }

  options = options || {};
  smsLog('info', 'Reading SMS messages');

  try {
    var result = await invoke('plugin:sms|read_sms', {
      request: {
        phoneNumber: options.phoneNumber,
        limit: options.limit || 100,
        folder: options.folder || 'all',
        unreadOnly: options.unreadOnly || false
      }
    });
    
    smsLog('info', 'Read ' + result.messages.length + ' messages');
    return result;
  } catch (error) {
    smsLog('error', 'Failed to read SMS: ' + (error.message || error));
    return { messages: [], totalCount: 0 };
  }
}

/**
 * Check SMS permissions
 */
async function checkPermissions() {
  var invoke = getInvoke();
  
  if (!invoke) {
    return { sendSms: 'prompt', readSms: 'prompt' };
  }

  try {
    // SMS plugin doesn't have explicit permission check, return granted on Android
    return { sendSms: 'granted', readSms: 'granted' };
  } catch (error) {
    return { sendSms: 'prompt', readSms: 'prompt' };
  }
}

/**
 * Request SMS permissions
 */
async function requestPermissions(permissions) {
  var invoke = getInvoke();
  
  if (!invoke) {
    return { sendSms: 'denied', readSms: 'denied' };
  }

  // SMS permissions are requested when needed on Android
  return { sendSms: 'granted', readSms: 'granted' };
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(number, defaultCountryCode) {
  defaultCountryCode = defaultCountryCode || '+1';
  var cleaned = number.replace(/[^\d+]/g, '');
  
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = defaultCountryCode + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = defaultCountryCode + cleaned;
    }
  }
  
  return cleaned;
}

// ES Module exports
export {
  sendSms,
  readSms,
  checkPermissions,
  requestPermissions,
  formatPhoneNumber
};
