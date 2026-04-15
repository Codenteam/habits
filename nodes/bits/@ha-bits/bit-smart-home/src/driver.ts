/**
 * Smart home driver for mobile apps using tauri-plugin-matter
 */

// Dynamic import for Tauri environment
let matterApi: any = null;

async function loadMatterApi() {
  if (matterApi) return matterApi;
  
  try {
    // In Tauri environment, import the plugin API
    matterApi = await import('tauri-plugin-matter-api');
    return matterApi;
  } catch (error) {
    // Fallback stub for non-Tauri environments
    return {
      discoverDevices: async () => [],
      getDevices: async () => [],
      getDeviceState: async () => ({ id: '', online: false }),
      setOnOff: async () => {},
      setLevel: async () => {},
      setColor: async () => {},
      commissionDevice: async () => { throw new Error('Not supported'); },
      removeDevice: async () => {},
      turnOn: async () => {},
      turnOff: async () => {},
      toggle: async () => {},
      setLight: async () => {},
    };
  }
}

export type DeviceType = 'light' | 'switch' | 'outlet' | 'thermostat' | 'door_lock' | 'window_covering' | 'fan' | 'sensor' | 'unknown';
export type Capability = 'on_off' | 'level_control' | 'color_control' | 'temperature_control' | 'door_lock' | 'window_covering';

export interface MatterDevice {
  id: string;
  name: string;
  deviceType: DeviceType;
  online: boolean;
  capabilities: Capability[];
}

export interface DeviceState {
  id: string;
  online: boolean;
  on?: boolean;
  level?: number;
  hue?: number;
  saturation?: number;
  colorTemperature?: number;
}

export interface ColorOptions {
  hue?: number;
  saturation?: number;
  colorTemperature?: number;
  transitionTime?: number;
}

// Device discovery
export async function discoverDevices(timeout: number = 10): Promise<MatterDevice[]> {
  const api = await loadMatterApi();
  return api.discoverDevices(timeout);
}

export async function getDevices(): Promise<MatterDevice[]> {
  const api = await loadMatterApi();
  return api.getDevices();
}

export async function getDeviceState(deviceId: string): Promise<DeviceState> {
  const api = await loadMatterApi();
  return api.getDeviceState(deviceId);
}

// Basic controls
export async function turnOn(deviceId: string): Promise<void> {
  const api = await loadMatterApi();
  return api.turnOn(deviceId);
}

export async function turnOff(deviceId: string): Promise<void> {
  const api = await loadMatterApi();
  return api.turnOff(deviceId);
}

export async function toggle(deviceId: string): Promise<void> {
  const api = await loadMatterApi();
  return api.toggle(deviceId);
}

export async function setOnOff(deviceId: string, on: boolean): Promise<void> {
  const api = await loadMatterApi();
  return api.setOnOff(deviceId, on);
}

// Level control
export async function setLevel(deviceId: string, level: number, transitionTime?: number): Promise<void> {
  const api = await loadMatterApi();
  return api.setLevel(deviceId, level, transitionTime);
}

// Color control
export async function setColor(deviceId: string, options: ColorOptions): Promise<void> {
  const api = await loadMatterApi();
  return api.setColor(deviceId, options);
}

// Combined light control
export async function setLight(deviceId: string, brightness: number, color?: ColorOptions): Promise<void> {
  const api = await loadMatterApi();
  return api.setLight(deviceId, brightness, color);
}

// Device management
export async function commissionDevice(pairingCode: string, name?: string): Promise<MatterDevice> {
  const api = await loadMatterApi();
  return api.commissionDevice(pairingCode, name);
}

export async function removeDevice(deviceId: string): Promise<void> {
  const api = await loadMatterApi();
  return api.removeDevice(deviceId);
}

// Helper functions
export function filterByType(devices: MatterDevice[], type: DeviceType): MatterDevice[] {
  return devices.filter(d => d.deviceType === type);
}

export function filterByCapability(devices: MatterDevice[], capability: Capability): MatterDevice[] {
  return devices.filter(d => d.capabilities.includes(capability));
}

export function getOnlineDevices(devices: MatterDevice[]): MatterDevice[] {
  return devices.filter(d => d.online);
}

export function getLights(devices: MatterDevice[]): MatterDevice[] {
  return devices.filter(d => d.deviceType === 'light' || d.capabilities.includes('level_control'));
}
