import { invoke } from "@tauri-apps/api/core";

/** Volume stream types (primarily for Android) */
export type VolumeStream =
  | "media"
  | "ring"
  | "alarm"
  | "notification"
  | "voice"
  | "system";

/** Volume information */
export interface VolumeInfo {
  /** Volume level from 0.0 to 1.0 */
  level: number;
  /** Whether the stream is muted */
  muted: boolean;
  /** Maximum volume value (platform specific) */
  max: number;
  /** Current raw volume value */
  current: number;
}

/** Ringer mode options */
export type RingerMode = "normal" | "vibrate" | "silent";

/** Ringer mode information */
export interface RingerModeInfo {
  mode: RingerMode;
}

/** Bluetooth adapter state */
export type BluetoothAdapterState =
  | "off"
  | "turning_on"
  | "on"
  | "turning_off"
  | "unsupported"
  | "unauthorized";

/** Bluetooth state information */
export interface BluetoothState {
  state: BluetoothAdapterState;
  enabled: boolean;
}

/** Do Not Disturb state */
export interface DndState {
  /** Whether DND is enabled */
  enabled: boolean;
  /** Whether the app has permission to change DND settings */
  hasPermission: boolean;
}

/**
 * Get the current volume level for a stream.
 * On iOS, only the system output volume is available.
 *
 * @param stream The audio stream to query (default: "media")
 * @returns Volume information including level, muted state, and raw values
 */
export async function getVolume(
  stream: VolumeStream = "media"
): Promise<VolumeInfo> {
  return await invoke<VolumeInfo>("plugin:system-settings|get_volume", {
    stream,
  });
}

/**
 * Set the volume level for a stream.
 * Note: iOS does not support programmatic volume control.
 *
 * @param level Volume level from 0.0 to 1.0
 * @param stream The audio stream to control (default: "media")
 * @param showUi Whether to show the volume UI (Android only)
 */
export async function setVolume(
  level: number,
  stream: VolumeStream = "media",
  showUi: boolean = false
): Promise<void> {
  return await invoke("plugin:system-settings|set_volume", {
    level: Math.max(0, Math.min(1, level)),
    stream,
    showUi,
  });
}

/**
 * Set the mute state for a stream.
 * Note: iOS does not support programmatic mute control.
 *
 * @param mute Whether to mute (true) or unmute (false)
 * @param stream The audio stream to control (default: "media")
 */
export async function setMute(
  mute: boolean,
  stream: VolumeStream = "media"
): Promise<void> {
  return await invoke("plugin:system-settings|set_mute", { mute, stream });
}

/**
 * Get the current ringer mode.
 * Note: iOS has limited support for detecting ringer mode.
 *
 * @returns Current ringer mode information
 */
export async function getRingerMode(): Promise<RingerModeInfo> {
  return await invoke<RingerModeInfo>("plugin:system-settings|get_ringer_mode");
}

/**
 * Set the ringer mode.
 * Note: iOS does not support programmatic ringer mode control.
 * On Android, may require DND access permission for silent/vibrate modes.
 *
 * @param mode The ringer mode to set
 */
export async function setRingerMode(mode: RingerMode): Promise<void> {
  return await invoke("plugin:system-settings|set_ringer_mode", { mode });
}

/**
 * Get the current Bluetooth state.
 *
 * @returns Bluetooth state information
 */
export async function getBluetoothState(): Promise<BluetoothState> {
  return await invoke<BluetoothState>(
    "plugin:system-settings|get_bluetooth_state"
  );
}

/**
 * Enable or disable Bluetooth.
 * Note: Android 13+ and iOS do not support programmatic Bluetooth control.
 * On these platforms, this will open the Bluetooth settings instead.
 *
 * @param enabled Whether to enable (true) or disable (false) Bluetooth
 */
export async function setBluetooth(enabled: boolean): Promise<void> {
  return await invoke("plugin:system-settings|set_bluetooth", { enabled });
}

/**
 * Get the current Do Not Disturb state.
 * Note: iOS does not support reading DND state.
 *
 * @returns DND state information
 */
export async function getDndState(): Promise<DndState> {
  return await invoke<DndState>("plugin:system-settings|get_dnd_state");
}

/**
 * Enable or disable Do Not Disturb mode.
 * Note: iOS does not support programmatic DND control.
 * On Android, requires notification policy access permission.
 *
 * @param enabled Whether to enable (true) or disable (false) DND
 */
export async function setDnd(enabled: boolean): Promise<void> {
  return await invoke("plugin:system-settings|set_dnd", { enabled });
}
