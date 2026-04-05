/**
 * Location Driver
 * 
 * Provides location services. In server mode, this provides stub functionality.
 * In Tauri app mode, this is replaced by stubs/tauri-driver.js which uses
 * @tauri-apps/plugin-geolocation.
 */

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface Geofence {
  id: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  name?: string;
}

export interface GeofenceStatus {
  geofenceId: string;
  inside: boolean;
  distance: number; // meters from center
}

export interface WatchOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Get current position - Server stub (not available in server mode)
 */
export async function getCurrentPosition(options?: WatchOptions): Promise<Position> {
  throw new Error('Location services not available in server mode. Use Tauri app.');
}

/**
 * Start watching position - Server stub
 */
export async function watchPosition(
  options: WatchOptions,
  callback: (position: Position) => void
): Promise<string> {
  throw new Error('Location services not available in server mode. Use Tauri app.');
}

/**
 * Clear position watch - Server stub
 */
export async function clearWatch(watchId: string): Promise<void> {
  throw new Error('Location services not available in server mode. Use Tauri app.');
}

/**
 * Check location permissions - Server stub
 */
export async function checkPermissions(): Promise<{ location: string }> {
  return { location: 'denied' };
}

/**
 * Request location permissions - Server stub
 */
export async function requestPermissions(): Promise<{ location: string }> {
  throw new Error('Location services not available in server mode. Use Tauri app.');
}
