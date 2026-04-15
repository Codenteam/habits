import { invoke } from "@tauri-apps/api/core";

/** Device type categories */
export type DeviceType =
  | "light"
  | "switch"
  | "outlet"
  | "thermostat"
  | "door_lock"
  | "window_covering"
  | "fan"
  | "sensor"
  | "unknown";

/** Device capabilities based on Matter clusters */
export type Capability =
  | "on_off"
  | "level_control"
  | "color_control"
  | "temperature_control"
  | "door_lock"
  | "window_covering";

/** A Matter device */
export interface MatterDevice {
  /** Unique device identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Device type */
  deviceType: DeviceType;
  /** Whether the device is currently reachable */
  online: boolean;
  /** Supported capabilities */
  capabilities: Capability[];
}

/** Current state of a device */
export interface DeviceState {
  id: string;
  online: boolean;
  /** Whether the device is on (for OnOff capable devices) */
  on?: boolean;
  /** Brightness level 0-100 (for LevelControl capable devices) */
  level?: number;
  /** Hue 0-360 (for ColorControl capable devices) */
  hue?: number;
  /** Saturation 0-100 (for ColorControl capable devices) */
  saturation?: number;
  /** Color temperature in Kelvin (for ColorControl capable devices) */
  colorTemperature?: number;
}

/**
 * Discover Matter devices on the network.
 * On Android, uses Google Home Matter SDK.
 * On iOS, uses HomeKit with Matter support.
 *
 * @param timeout Discovery timeout in seconds (default: 10)
 * @returns List of discovered devices
 */
export async function discoverDevices(
  timeout: number = 10
): Promise<MatterDevice[]> {
  return await invoke<MatterDevice[]>("plugin:matter|discover_devices", {
    timeout,
  });
}

/**
 * Get all known/cached devices.
 *
 * @returns List of known devices
 */
export async function getDevices(): Promise<MatterDevice[]> {
  return await invoke<MatterDevice[]>("plugin:matter|get_devices");
}

/**
 * Get the current state of a device.
 *
 * @param deviceId The device identifier
 * @returns Current device state
 */
export async function getDeviceState(deviceId: string): Promise<DeviceState> {
  return await invoke<DeviceState>("plugin:matter|get_device_state", {
    deviceId,
  });
}

/**
 * Turn a device on or off (OnOff cluster).
 *
 * @param deviceId The device identifier
 * @param on Whether to turn the device on (true) or off (false)
 */
export async function setOnOff(deviceId: string, on: boolean): Promise<void> {
  return await invoke("plugin:matter|set_on_off", { deviceId, on });
}

/**
 * Set the brightness level of a device (LevelControl cluster).
 *
 * @param deviceId The device identifier
 * @param level Brightness level from 0-100
 * @param transitionTime Optional transition time in seconds
 */
export async function setLevel(
  deviceId: string,
  level: number,
  transitionTime?: number
): Promise<void> {
  return await invoke("plugin:matter|set_level", {
    deviceId,
    level: Math.max(0, Math.min(100, level)),
    transitionTime,
  });
}

/**
 * Set the color of a device (ColorControl cluster).
 *
 * @param deviceId The device identifier
 * @param options Color options (hue, saturation, and/or colorTemperature)
 */
export async function setColor(
  deviceId: string,
  options: {
    /** Hue 0-360 */
    hue?: number;
    /** Saturation 0-100 */
    saturation?: number;
    /** Color temperature 2000-6500K */
    colorTemperature?: number;
    /** Transition time in seconds */
    transitionTime?: number;
  }
): Promise<void> {
  return await invoke("plugin:matter|set_color", {
    deviceId,
    hue: options.hue,
    saturation: options.saturation,
    colorTemperature: options.colorTemperature,
    transitionTime: options.transitionTime,
  });
}

/**
 * Commission (pair) a new Matter device.
 * On Android, this launches the Google Home commissioning flow.
 * On iOS, this suggests opening the Home app (commissioning must be done there).
 *
 * @param pairingCode The QR code payload or manual pairing code
 * @param name Optional custom name for the device
 * @returns The commissioned device
 */
export async function commissionDevice(
  pairingCode: string,
  name?: string
): Promise<MatterDevice> {
  return await invoke<MatterDevice>("plugin:matter|commission_device", {
    pairingCode,
    name,
  });
}

/**
 * Remove a device from the Matter fabric.
 *
 * @param deviceId The device identifier to remove
 */
export async function removeDevice(deviceId: string): Promise<void> {
  return await invoke("plugin:matter|remove_device", { deviceId });
}

// Convenience functions for common operations

/**
 * Turn a light on.
 * @param deviceId The device identifier
 */
export async function turnOn(deviceId: string): Promise<void> {
  return setOnOff(deviceId, true);
}

/**
 * Turn a light off.
 * @param deviceId The device identifier
 */
export async function turnOff(deviceId: string): Promise<void> {
  return setOnOff(deviceId, false);
}

/**
 * Toggle a device on/off.
 * @param deviceId The device identifier
 */
export async function toggle(deviceId: string): Promise<void> {
  const state = await getDeviceState(deviceId);
  return setOnOff(deviceId, !state.on);
}

/**
 * Set a light to a specific brightness with optional color.
 * @param deviceId The device identifier
 * @param brightness Brightness 0-100
 * @param color Optional color settings
 */
export async function setLight(
  deviceId: string,
  brightness: number,
  color?: {
    hue?: number;
    saturation?: number;
    colorTemperature?: number;
  }
): Promise<void> {
  await setLevel(deviceId, brightness);
  if (color) {
    await setColor(deviceId, color);
  }
}
