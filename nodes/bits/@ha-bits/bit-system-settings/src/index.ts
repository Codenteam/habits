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
import type { Bit } from '@ha-bits/cortex-core';
import * as driver from './driver';

export const systemSettings: Bit = {
  displayName: 'System Settings',
  runtime: 'app',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/3953/3953226.png',

  actions: {
    // Volume actions
    getVolume: {
      displayName: 'Get Volume',
      description: 'Get the current volume level for a stream',
      props: {
        stream: {
          type: 'string',
          displayName: 'Audio Stream',
          description: 'The audio stream to query',
          required: false,
          default: 'media',
          enum: ['media', 'ring', 'alarm', 'notification', 'voice', 'system'],
        },
      },
      run: async ({ props }) => {
        const stream = (props.stream || 'media') as driver.VolumeStream;
        const volume = await driver.getVolume(stream);
        return {
          ...volume,
          stream,
          percentage: Math.round(volume.level * 100),
        };
      },
    },

    setVolume: {
      displayName: 'Set Volume',
      description: 'Set the volume level for a stream (Android only)',
      props: {
        level: {
          type: 'number',
          displayName: 'Volume Level',
          description: 'Volume level from 0 to 100',
          required: true,
        },
        stream: {
          type: 'string',
          displayName: 'Audio Stream',
          description: 'The audio stream to control',
          required: false,
          default: 'media',
          enum: ['media', 'ring', 'alarm', 'notification', 'voice', 'system'],
        },
        showUi: {
          type: 'boolean',
          displayName: 'Show Volume UI',
          description: 'Whether to show the volume slider UI',
          required: false,
          default: false,
        },
      },
      run: async ({ props }) => {
        const stream = (props.stream || 'media') as driver.VolumeStream;
        const level = Math.max(0, Math.min(100, props.level)) / 100;
        await driver.setVolume(level, stream, props.showUi || false);
        return { success: true, stream, level: props.level };
      },
    },

    mute: {
      displayName: 'Mute',
      description: 'Mute an audio stream (Android only)',
      props: {
        stream: {
          type: 'string',
          displayName: 'Audio Stream',
          description: 'The audio stream to mute',
          required: false,
          default: 'media',
          enum: ['media', 'ring', 'alarm', 'notification', 'voice', 'system'],
        },
      },
      run: async ({ props }) => {
        const stream = (props.stream || 'media') as driver.VolumeStream;
        await driver.setMute(true, stream);
        return { success: true, stream, muted: true };
      },
    },

    unmute: {
      displayName: 'Unmute',
      description: 'Unmute an audio stream (Android only)',
      props: {
        stream: {
          type: 'string',
          displayName: 'Audio Stream',
          description: 'The audio stream to unmute',
          required: false,
          default: 'media',
          enum: ['media', 'ring', 'alarm', 'notification', 'voice', 'system'],
        },
      },
      run: async ({ props }) => {
        const stream = (props.stream || 'media') as driver.VolumeStream;
        await driver.setMute(false, stream);
        return { success: true, stream, muted: false };
      },
    },

    // Ringer mode actions
    getRingerMode: {
      displayName: 'Get Ringer Mode',
      description: 'Get the current ringer mode',
      props: {},
      run: async () => {
        const mode = await driver.getRingerMode();
        return mode;
      },
    },

    setRingerMode: {
      displayName: 'Set Ringer Mode',
      description: 'Set the ringer mode (Android only)',
      props: {
        mode: {
          type: 'string',
          displayName: 'Ringer Mode',
          description: 'The ringer mode to set',
          required: true,
          enum: ['normal', 'vibrate', 'silent'],
        },
      },
      run: async ({ props }) => {
        await driver.setRingerMode(props.mode as driver.RingerMode);
        return { success: true, mode: props.mode };
      },
    },

    setSilent: {
      displayName: 'Set Silent Mode',
      description: 'Enable silent mode (no sound or vibration)',
      props: {},
      run: async () => {
        await driver.setRingerMode('silent');
        return { success: true, mode: 'silent' };
      },
    },

    setVibrate: {
      displayName: 'Set Vibrate Mode',
      description: 'Enable vibrate mode (vibration only)',
      props: {},
      run: async () => {
        await driver.setRingerMode('vibrate');
        return { success: true, mode: 'vibrate' };
      },
    },

    setNormal: {
      displayName: 'Set Normal Mode',
      description: 'Enable normal ringer mode (sounds enabled)',
      props: {},
      run: async () => {
        await driver.setRingerMode('normal');
        return { success: true, mode: 'normal' };
      },
    },

    // Bluetooth actions
    getBluetoothState: {
      displayName: 'Get Bluetooth State',
      description: 'Get the current Bluetooth state',
      props: {},
      run: async () => {
        const state = await driver.getBluetoothState();
        return state;
      },
    },

    enableBluetooth: {
      displayName: 'Enable Bluetooth',
      description: 'Enable Bluetooth (opens settings on newer Android/iOS)',
      props: {},
      run: async () => {
        await driver.setBluetooth(true);
        return { success: true, action: 'enable' };
      },
    },

    disableBluetooth: {
      displayName: 'Disable Bluetooth',
      description: 'Disable Bluetooth (opens settings on newer Android/iOS)',
      props: {},
      run: async () => {
        await driver.setBluetooth(false);
        return { success: true, action: 'disable' };
      },
    },

    // Do Not Disturb actions
    getDndState: {
      displayName: 'Get Do Not Disturb State',
      description: 'Get the current Do Not Disturb state (Android only)',
      props: {},
      run: async () => {
        const state = await driver.getDndState();
        return state;
      },
    },

    enableDnd: {
      displayName: 'Enable Do Not Disturb',
      description: 'Enable Do Not Disturb mode (Android only)',
      props: {},
      run: async () => {
        await driver.setDnd(true);
        return { success: true, enabled: true };
      },
    },

    disableDnd: {
      displayName: 'Disable Do Not Disturb',
      description: 'Disable Do Not Disturb mode (Android only)',
      props: {},
      run: async () => {
        await driver.setDnd(false);
        return { success: true, enabled: false };
      },
    },

    // Convenience composite actions
    setFocusMode: {
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
    },

    clearFocusMode: {
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
    },
  },

  triggers: {
    // System settings typically don't have triggers since we can't
    // listen for changes without background services, which require
    // native platform integration beyond what Tauri provides out of the box.
    // Polling could be implemented similar to the wifi bit if needed.
  },
};

export default systemSettings;
