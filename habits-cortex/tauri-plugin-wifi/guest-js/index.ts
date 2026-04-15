/**
 * Tauri Plugin: Wi-Fi
 * 
 * Monitor Wi-Fi network connectivity on mobile devices.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Information about a Wi-Fi network
 */
export interface NetworkInfo {
  /** Network SSID (name) */
  ssid: string;
  /** BSSID (MAC address of access point) */
  bssid?: string;
  /** Signal strength in dBm */
  signalStrength?: number;
  /** Signal level (0-4) */
  signalLevel?: number;
  /** Frequency in MHz */
  frequency?: number;
  /** Whether this is a 5GHz network */
  is5ghz?: boolean;
  /** Link speed in Mbps */
  linkSpeed?: number;
  /** IP address */
  ipAddress?: string;
}

/**
 * Response from getCurrentNetwork
 */
export interface GetCurrentNetworkResponse {
  /** Whether connected to a Wi-Fi network */
  connected: boolean;
  /** Network info (if connected) */
  network?: NetworkInfo;
  /** Error message (if any) */
  error?: string;
}

/**
 * Response from isConnected
 */
export interface IsConnectedResponse {
  /** Whether connected */
  connected: boolean;
  /** Current SSID (if connected) */
  currentSsid?: string;
  /** Whether connected to the requested SSID (if SSID was specified) */
  matchesRequested?: boolean;
  /** Error message (if any) */
  error?: string;
}

/**
 * A saved Wi-Fi network
 */
export interface SavedNetwork {
  /** Network SSID */
  ssid: string;
  /** Network ID (Android-specific) */
  networkId?: number;
}

/**
 * Response from listSavedNetworks
 */
export interface ListSavedNetworksResponse {
  /** List of saved networks */
  networks: SavedNetwork[];
}

/**
 * Permission status
 */
export interface PermissionStatus {
  /** Location permission status */
  location: 'granted' | 'denied' | 'prompt';
  /** Wi-Fi state permission (Android-specific) */
  wifiState?: string;
}

/**
 * Get information about the current Wi-Fi network
 * 
 * @returns Current network information
 * @throws If not on a mobile device or permissions denied
 */
export async function getCurrentNetwork(): Promise<GetCurrentNetworkResponse> {
  return invoke<GetCurrentNetworkResponse>('plugin:wifi|get_current_network');
}

/**
 * Check if connected to a Wi-Fi network
 * 
 * @param ssid - Optional SSID to check for specific network
 * @returns Connection status
 */
export async function isConnected(ssid?: string): Promise<IsConnectedResponse> {
  return invoke<IsConnectedResponse>('plugin:wifi|is_connected', {
    request: { ssid }
  });
}

/**
 * List saved Wi-Fi networks
 * 
 * Note: On Android 10+, this requires special permissions and may return empty.
 * On iOS, this always returns empty due to privacy restrictions.
 * 
 * @returns List of saved networks
 */
export async function listSavedNetworks(): Promise<ListSavedNetworksResponse> {
  return invoke<ListSavedNetworksResponse>('plugin:wifi|list_saved_networks');
}

/**
 * Check Wi-Fi-related permissions
 * 
 * @returns Current permission status
 */
export async function checkPermissions(): Promise<PermissionStatus> {
  return invoke<PermissionStatus>('plugin:wifi|check_permissions');
}

/**
 * Request Wi-Fi-related permissions
 * 
 * @param permissions - Permissions to request ('location', 'wifiState')
 * @returns Updated permission status
 */
export async function requestPermissions(
  permissions: string[] = ['location']
): Promise<PermissionStatus> {
  return invoke<PermissionStatus>('plugin:wifi|request_permissions', {
    request: { permissions }
  });
}

export default {
  getCurrentNetwork,
  isConnected,
  listSavedNetworks,
  checkPermissions,
  requestPermissions,
};
