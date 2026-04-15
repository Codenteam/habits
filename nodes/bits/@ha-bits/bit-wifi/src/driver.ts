/**
 * Wi-Fi driver for mobile apps using tauri-plugin-wifi
 */

// Dynamic import for Tauri environment
let wifiApi: any = null;

async function loadWifiApi() {
  if (wifiApi) return wifiApi;
  
  try {
    // In Tauri environment, import the plugin API
    wifiApi = await import('tauri-plugin-wifi-api');
    return wifiApi;
  } catch (error) {
    // Fallback stub for non-Tauri environments
    return {
      getCurrentNetwork: async () => null,
      isConnected: async () => false,
      listSavedNetworks: async () => [],
      checkPermissions: async () => ({ location: 'unknown', wifi: 'unknown' }),
      requestPermissions: async () => ({ location: 'unknown', wifi: 'unknown' }),
    };
  }
}

export interface WifiNetwork {
  ssid: string;
  bssid?: string;
  signalStrength?: number;
  frequency?: number;
  isSecure?: boolean;
}

export interface WifiPermissions {
  location: 'granted' | 'denied' | 'prompt' | 'unknown';
  wifi: 'granted' | 'denied' | 'prompt' | 'unknown';
}

/**
 * Get the current Wi-Fi network information
 */
export async function getCurrentNetwork(): Promise<WifiNetwork | null> {
  const api = await loadWifiApi();
  return api.getCurrentNetwork();
}

/**
 * Check if connected to Wi-Fi
 */
export async function isConnected(): Promise<boolean> {
  const api = await loadWifiApi();
  return api.isConnected();
}

/**
 * Check if connected to a specific network by SSID
 */
export async function isConnectedTo(ssid: string): Promise<boolean> {
  const network = await getCurrentNetwork();
  return network?.ssid === ssid;
}

/**
 * List saved Wi-Fi networks
 */
export async function listSavedNetworks(): Promise<string[]> {
  const api = await loadWifiApi();
  return api.listSavedNetworks();
}

/**
 * Check Wi-Fi permissions
 */
export async function checkPermissions(): Promise<WifiPermissions> {
  const api = await loadWifiApi();
  return api.checkPermissions();
}

/**
 * Request Wi-Fi permissions
 */
export async function requestPermissions(): Promise<WifiPermissions> {
  const api = await loadWifiApi();
  return api.requestPermissions();
}

/**
 * Monitor Wi-Fi network changes (polling-based)
 */
export function createNetworkMonitor(
  callback: (network: WifiNetwork | null) => void,
  intervalMs: number = 5000
): { stop: () => void } {
  let lastSsid: string | null = null;
  let running = true;

  const check = async () => {
    if (!running) return;
    
    const network = await getCurrentNetwork();
    const currentSsid = network?.ssid ?? null;
    
    if (currentSsid !== lastSsid) {
      lastSsid = currentSsid;
      callback(network);
    }
  };

  // Initial check
  check();
  
  // Set up polling
  const interval = setInterval(check, intervalMs);

  return {
    stop: () => {
      running = false;
      clearInterval(interval);
    }
  };
}
