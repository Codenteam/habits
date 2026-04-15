/**
 * System settings driver for mobile apps using tauri-plugin-system-settings
 */

// Dynamic import for Tauri environment
let settingsApi: any = null;

async function loadSettingsApi() {
  if (settingsApi) return settingsApi;
  
  try {
    // In Tauri environment, import the plugin API
    settingsApi = await import('tauri-plugin-system-settings-api');
    return settingsApi;
  } catch (error) {
    // Fallback stub for non-Tauri environments
    return {
      getVolume: async () => ({ level: 0.5, muted: false, max: 100, current: 50 }),
      setVolume: async () => {},
      setMute: async () => {},
      getRingerMode: async () => ({ mode: 'normal' }),
      setRingerMode: async () => {},
      getBluetoothState: async () => ({ state: 'off', enabled: false }),
      setBluetooth: async () => {},
      getDndState: async () => ({ enabled: false, hasPermission: false }),
      setDnd: async () => {},
    };
  }
}

export type VolumeStream = 'media' | 'ring' | 'alarm' | 'notification' | 'voice' | 'system';
export type RingerMode = 'normal' | 'vibrate' | 'silent';
export type BluetoothState = 'off' | 'turning_on' | 'on' | 'turning_off' | 'unsupported' | 'unauthorized';

export interface VolumeInfo {
  level: number;
  muted: boolean;
  max: number;
  current: number;
}

export interface RingerModeInfo {
  mode: RingerMode;
}

export interface BluetoothInfo {
  state: BluetoothState;
  enabled: boolean;
}

export interface DndInfo {
  enabled: boolean;
  hasPermission: boolean;
}

// Volume functions
export async function getVolume(stream: VolumeStream = 'media'): Promise<VolumeInfo> {
  const api = await loadSettingsApi();
  return api.getVolume(stream);
}

export async function setVolume(level: number, stream: VolumeStream = 'media', showUi: boolean = false): Promise<void> {
  const api = await loadSettingsApi();
  return api.setVolume(level, stream, showUi);
}

export async function setMute(mute: boolean, stream: VolumeStream = 'media'): Promise<void> {
  const api = await loadSettingsApi();
  return api.setMute(mute, stream);
}

// Ringer mode functions
export async function getRingerMode(): Promise<RingerModeInfo> {
  const api = await loadSettingsApi();
  return api.getRingerMode();
}

export async function setRingerMode(mode: RingerMode): Promise<void> {
  const api = await loadSettingsApi();
  return api.setRingerMode(mode);
}

// Bluetooth functions
export async function getBluetoothState(): Promise<BluetoothInfo> {
  const api = await loadSettingsApi();
  return api.getBluetoothState();
}

export async function setBluetooth(enabled: boolean): Promise<void> {
  const api = await loadSettingsApi();
  return api.setBluetooth(enabled);
}

// Do Not Disturb functions
export async function getDndState(): Promise<DndInfo> {
  const api = await loadSettingsApi();
  return api.getDndState();
}

export async function setDnd(enabled: boolean): Promise<void> {
  const api = await loadSettingsApi();
  return api.setDnd(enabled);
}
