/**
 * System Settings Control Bit
 *
 * A mobile-only bit for controlling device system settings:
 * - Volume (media, ring, alarm, notification, voice, system)
 * - Ringer mode (normal, vibrate, silent)
 * - Bluetooth on/off
 * - Do Not Disturb mode
 *
 * Note: iOS has significant limitations on programmatic control of system settings.
 */
import { createBit, createAction, Property } from '@ha-bits/cortex-core';
import * as driver from './driver';

// Volume actions
const getVolume = createAction({
  name: 'getVolume',
  displayName: 'Get Volume',
  description: 'Get the current volume level for a stream',
  props: {
    stream: Property.StaticDropdown({
      displayName: 'Audio Stream',
      description: 'The audio stream to query',
      required: false,
      defaultValue: 'media',
      options: {
        options: [
          { value: 'media', label: 'Media' },
          { value: 'ring', label: 'Ring' },
          { value: 'alarm', label: 'Alarm' },
          { value: 'notification', label: 'Notification' },
          { value: 'voice', label: 'Voice' },
          { value: 'system', label: 'System' },
        ],
      },
    }),
  },
  run: async (context) => {
    const stream = (context.propsValue.stream || 'media') as driver.VolumeStream;
    const volume = await driver.getVolume(stream);
    return {
      ...volume,
      stream,
      percentage: Math.round(volume.level * 100),
    };
  },
});

const setVolume = createAction({
  name: 'setVolume',
  displayName: 'Set Volume',
  description: 'Set the volume level for a stream (Android only)',
  props: {
    level: Property.Number({
      displayName: 'Volume Level',
      description: 'Volume level from 0 to 100',
      required: true,
    }),
    stream: Property.StaticDropdown({
      displayName: 'Audio Stream',
      description: 'The audio stream to control',
      required: false,
      defaultValue: 'media',
      options: {
        options: [
          { value: 'media', label: 'Media' },
          { value: 'ring', label: 'Ring' },
          { value: 'alarm', label: 'Alarm' },
          { value: 'notification', label: 'Notification' },
          { value: 'voice', label: 'Voice' },
          { value: 'system', label: 'System' },
        ],
      },
    }),
    showUi: Property.Checkbox({
      displayName: 'Show Volume UI',
      description: 'Whether to show the volume slider UI',
      required: false,
      defaultValue: false,
    }),
  },
  run: async (context) => {
    const stream = (context.propsValue.stream || 'media') as driver.VolumeStream;
    const level = Math.max(0, Math.min(100, context.propsValue.level || 0)) / 100;
    await driver.setVolume(level, stream, context.propsValue.showUi || false);
    return { success: true, stream, level: context.propsValue.level };
  },
});

const mute = createAction({
  name: 'mute',
  displayName: 'Mute',
  description: 'Mute an audio stream (Android only)',
  props: {
    stream: Property.StaticDropdown({
      displayName: 'Audio Stream',
      description: 'The audio stream to mute',
      required: false,
      defaultValue: 'media',
      options: {
        options: [
          { value: 'media', label: 'Media' },
          { value: 'ring', label: 'Ring' },
          { value: 'alarm', label: 'Alarm' },
          { value: 'notification', label: 'Notification' },
          { value: 'voice', label: 'Voice' },
          { value: 'system', label: 'System' },
        ],
      },
    }),
  },
  run: async (context) => {
    const stream = (context.propsValue.stream || 'media') as driver.VolumeStream;
    await driver.setMute(true, stream);
    return { success: true, stream, muted: true };
  },
});

const unmute = createAction({
  name: 'unmute',
  displayName: 'Unmute',
  description: 'Unmute an audio stream (Android only)',
  props: {
    stream: Property.StaticDropdown({
      displayName: 'Audio Stream',
      description: 'The audio stream to unmute',
      required: false,
      defaultValue: 'media',
      options: {
        options: [
          { value: 'media', label: 'Media' },
          { value: 'ring', label: 'Ring' },
          { value: 'alarm', label: 'Alarm' },
          { value: 'notification', label: 'Notification' },
          { value: 'voice', label: 'Voice' },
          { value: 'system', label: 'System' },
        ],
      },
    }),
  },
  run: async (context) => {
    const stream = (context.propsValue.stream || 'media') as driver.VolumeStream;
    await driver.setMute(false, stream);
    return { success: true, stream, muted: false };
  },
});

// Ringer mode actions
const getRingerMode = createAction({
  name: 'getRingerMode',
  displayName: 'Get Ringer Mode',
  description: 'Get the current ringer mode',
  props: {},
  run: async () => {
    const mode = await driver.getRingerMode();
    return mode;
  },
});

const setRingerMode = createAction({
  name: 'setRingerMode',
  displayName: 'Set Ringer Mode',
  description: 'Set the ringer mode (Android only)',
  props: {
    mode: Property.StaticDropdown({
      displayName: 'Ringer Mode',
      description: 'The ringer mode to set',
      required: true,
      options: {
        options: [
          { value: 'normal', label: 'Normal' },
          { value: 'vibrate', label: 'Vibrate' },
          { value: 'silent', label: 'Silent' },
        ],
      },
    }),
  },
  run: async (context) => {
    await driver.setRingerMode(context.propsValue.mode as driver.RingerMode);
    return { success: true, mode: context.propsValue.mode };
  },
});

const setSilent = createAction({
  name: 'setSilent',
  displayName: 'Set Silent Mode',
  description: 'Enable silent mode (no sound or vibration)',
  props: {},
  run: async () => {
    await driver.setRingerMode('silent');
    return { success: true, mode: 'silent' };
  },
});

const setVibrate = createAction({
  name: 'setVibrate',
  displayName: 'Set Vibrate Mode',
  description: 'Enable vibrate mode (vibration only)',
  props: {},
  run: async () => {
    await driver.setRingerMode('vibrate');
    return { success: true, mode: 'vibrate' };
  },
});

const setNormal = createAction({
  name: 'setNormal',
  displayName: 'Set Normal Mode',
  description: 'Enable normal ringer mode (sounds enabled)',
  props: {},
  run: async () => {
    await driver.setRingerMode('normal');
    return { success: true, mode: 'normal' };
  },
});

// Bluetooth actions
const getBluetoothState = createAction({
  name: 'getBluetoothState',
  displayName: 'Get Bluetooth State',
  description: 'Get the current Bluetooth state',
  props: {},
  run: async () => {
    const state = await driver.getBluetoothState();
    return state;
  },
});

const enableBluetooth = createAction({
  name: 'enableBluetooth',
  displayName: 'Enable Bluetooth',
  description: 'Enable Bluetooth (opens settings on newer Android/iOS)',
  props: {},
  run: async () => {
    await driver.setBluetooth(true);
    return { success: true, action: 'enable' };
  },
});

const disableBluetooth = createAction({
  name: 'disableBluetooth',
  displayName: 'Disable Bluetooth',
  description: 'Disable Bluetooth (opens settings on newer Android/iOS)',
  props: {},
  run: async () => {
    await driver.setBluetooth(false);
    return { success: true, action: 'disable' };
  },
});

// Do Not Disturb actions
const getDndState = createAction({
  name: 'getDndState',
  displayName: 'Get Do Not Disturb State',
  description: 'Get the current Do Not Disturb state (Android only)',
  props: {},
  run: async () => {
    const state = await driver.getDndState();
    return state;
  },
});

const enableDnd = createAction({
  name: 'enableDnd',
  displayName: 'Enable Do Not Disturb',
  description: 'Enable Do Not Disturb mode (Android only)',
  props: {},
  run: async () => {
    await driver.setDnd(true);
    return { success: true, enabled: true };
  },
});

const disableDnd = createAction({
  name: 'disableDnd',
  displayName: 'Disable Do Not Disturb',
  description: 'Disable Do Not Disturb mode (Android only)',
  props: {},
  run: async () => {
    await driver.setDnd(false);
    return { success: true, enabled: false };
  },
});

// Convenience composite actions
const setFocusMode = createAction({
  name: 'setFocusMode',
  displayName: 'Set Focus Mode',
  description: 'Enable focus mode (mute media, enable DND, set vibrate)',
  props: {},
  run: async () => {
    const results: any = { actions: [] };
    
    try {
      await driver.setMute(true, 'media');
      results.actions.push({ action: 'mute_media', success: true });
    } catch (e) {
      results.actions.push({ action: 'mute_media', success: false, error: String(e) });
    }
    
    try {
      await driver.setRingerMode('vibrate');
      results.actions.push({ action: 'set_vibrate', success: true });
    } catch (e) {
      results.actions.push({ action: 'set_vibrate', success: false, error: String(e) });
    }
    
    try {
      await driver.setDnd(true);
      results.actions.push({ action: 'enable_dnd', success: true });
    } catch (e) {
      results.actions.push({ action: 'enable_dnd', success: false, error: String(e) });
    }
    
    return results;
  },
});

const clearFocusMode = createAction({
  name: 'clearFocusMode',
  displayName: 'Clear Focus Mode',
  description: 'Disable focus mode (unmute, disable DND, set normal)',
  props: {},
  run: async () => {
    const results: any = { actions: [] };
    
    try {
      await driver.setMute(false, 'media');
      results.actions.push({ action: 'unmute_media', success: true });
    } catch (e) {
      results.actions.push({ action: 'unmute_media', success: false, error: String(e) });
    }
    
    try {
      await driver.setRingerMode('normal');
      results.actions.push({ action: 'set_normal', success: true });
    } catch (e) {
      results.actions.push({ action: 'set_normal', success: false, error: String(e) });
    }
    
    try {
      await driver.setDnd(false);
      results.actions.push({ action: 'disable_dnd', success: true });
    } catch (e) {
      results.actions.push({ action: 'disable_dnd', success: false, error: String(e) });
    }
    
    return results;
  },
});

// Export the bit
export const systemSettings = createBit({
  displayName: 'System Settings',
  description: 'Control device system settings like volume, ringer mode, Bluetooth, and DND',
  logoUrl: 'lucide:Settings',
  actions: [
    getVolume,
    setVolume,
    mute,
    unmute,
    getRingerMode,
    setRingerMode,
    setSilent,
    setVibrate,
    setNormal,
    getBluetoothState,
    enableBluetooth,
    disableBluetooth,
    getDndState,
    enableDnd,
    disableDnd,
    setFocusMode,
    clearFocusMode,
  ],
  triggers: [],
});

// Mark as app-only runtime
(systemSettings as any).runtime = 'app';

export default systemSettings;
