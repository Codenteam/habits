// Type declarations for tauri-plugin-system-settings-api
// This plugin is only available at runtime in the Tauri app context

declare module 'tauri-plugin-system-settings-api' {
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

  export function getVolume(stream?: VolumeStream): Promise<VolumeInfo>;
  export function setVolume(level: number, stream?: VolumeStream, showUi?: boolean): Promise<void>;
  export function setMute(mute: boolean, stream?: VolumeStream): Promise<void>;
  export function getRingerMode(): Promise<RingerModeInfo>;
  export function setRingerMode(mode: RingerMode): Promise<void>;
  export function getBluetoothState(): Promise<BluetoothInfo>;
  export function setBluetooth(enabled: boolean): Promise<void>;
  export function getDndState(): Promise<DndInfo>;
  export function setDnd(enabled: boolean): Promise<void>;
}
