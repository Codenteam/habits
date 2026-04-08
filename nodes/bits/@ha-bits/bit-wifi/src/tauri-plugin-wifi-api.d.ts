// Type declarations for tauri-plugin-wifi-api
// This plugin is only available at runtime in the Tauri app context

declare module 'tauri-plugin-wifi-api' {
  export interface WifiNetwork {
    ssid: string;
    bssid?: string;
    signalStrength?: number;
    frequency?: number;
    isSecure?: boolean;
  }

  export interface WifiStatus {
    isEnabled: boolean;
    isConnected: boolean;
    currentNetwork?: WifiNetwork;
  }

  export interface WifiPermissions {
    location: 'granted' | 'denied' | 'prompt';
    wifi: 'granted' | 'denied' | 'prompt';
  }

  export function getCurrentNetwork(): Promise<WifiNetwork | null>;
  export function getWifiStatus(): Promise<WifiStatus>;
  export function getSavedNetworks(): Promise<WifiNetwork[]>;
  export function checkPermissions(): Promise<WifiPermissions>;
  export function requestPermissions(): Promise<WifiPermissions>;
}
