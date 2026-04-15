// Type declarations for tauri-plugin-matter-api
// This plugin is only available at runtime in the Tauri app context

declare module 'tauri-plugin-matter-api' {
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

  export function discoverDevices(timeout?: number): Promise<MatterDevice[]>;
  export function getDevices(): Promise<MatterDevice[]>;
  export function getDeviceState(deviceId: string): Promise<DeviceState>;
  export function setOnOff(deviceId: string, on: boolean): Promise<void>;
  export function setLevel(deviceId: string, level: number, transitionTime?: number): Promise<void>;
  export function setColor(deviceId: string, options: ColorOptions): Promise<void>;
  export function commissionDevice(pairingCode: string, name?: string): Promise<MatterDevice>;
  export function removeDevice(deviceId: string): Promise<void>;
  export function turnOn(deviceId: string): Promise<void>;
  export function turnOff(deviceId: string): Promise<void>;
  export function toggle(deviceId: string): Promise<void>;
  export function setLight(deviceId: string, brightness: number, color?: ColorOptions): Promise<void>;
}
