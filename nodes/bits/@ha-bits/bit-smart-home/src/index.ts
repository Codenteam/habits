/**
 * Smart Home Control Bit
 *
 * A mobile-only bit for controlling Matter-compatible smart home devices.
 * Uses:
 * - Android: Google Home Matter SDK
 * - iOS: HomeKit with Matter support
 *
 * Supports lights, switches, outlets, and other Matter devices.
 */
import type { Bit } from '@ha-bits/cortex-core';
import * as driver from './driver';

export const smartHome: Bit = {
  displayName: 'Smart Home',
  runtime: 'app',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/2838/2838694.png',

  actions: {
    // Device discovery
    discoverDevices: {
      displayName: 'Discover Devices',
      description: 'Discover Matter devices on the network',
      props: {
        timeout: {
          type: 'number',
          displayName: 'Timeout (seconds)',
          description: 'How long to search for devices',
          required: false,
          default: 10,
        },
      },
      run: async ({ props }) => {
        const devices = await driver.discoverDevices(props.timeout || 10);
        return {
          devices,
          count: devices.length,
          online: devices.filter(d => d.online).length,
        };
      },
    },

    getDevices: {
      displayName: 'Get All Devices',
      description: 'Get all known smart home devices',
      props: {},
      run: async () => {
        const devices = await driver.getDevices();
        return {
          devices,
          count: devices.length,
          byType: {
            lights: devices.filter(d => d.deviceType === 'light').length,
            switches: devices.filter(d => d.deviceType === 'switch').length,
            outlets: devices.filter(d => d.deviceType === 'outlet').length,
            other: devices.filter(d => !['light', 'switch', 'outlet'].includes(d.deviceType)).length,
          },
        };
      },
    },

    getLights: {
      displayName: 'Get Lights',
      description: 'Get all light devices',
      props: {},
      run: async () => {
        const devices = await driver.getDevices();
        const lights = driver.getLights(devices);
        return {
          lights,
          count: lights.length,
          online: lights.filter(d => d.online).length,
        };
      },
    },

    getDeviceState: {
      displayName: 'Get Device State',
      description: 'Get the current state of a device',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the device',
          required: true,
        },
      },
      run: async ({ props }) => {
        const state = await driver.getDeviceState(props.deviceId);
        return state;
      },
    },

    // Basic on/off controls
    turnOn: {
      displayName: 'Turn On',
      description: 'Turn a device on',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the device to turn on',
          required: true,
        },
      },
      run: async ({ props }) => {
        await driver.turnOn(props.deviceId);
        return { success: true, deviceId: props.deviceId, action: 'on' };
      },
    },

    turnOff: {
      displayName: 'Turn Off',
      description: 'Turn a device off',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the device to turn off',
          required: true,
        },
      },
      run: async ({ props }) => {
        await driver.turnOff(props.deviceId);
        return { success: true, deviceId: props.deviceId, action: 'off' };
      },
    },

    toggle: {
      displayName: 'Toggle',
      description: 'Toggle a device on/off',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the device to toggle',
          required: true,
        },
      },
      run: async ({ props }) => {
        await driver.toggle(props.deviceId);
        return { success: true, deviceId: props.deviceId, action: 'toggle' };
      },
    },

    // Brightness control
    setBrightness: {
      displayName: 'Set Brightness',
      description: 'Set the brightness level of a light',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the light',
          required: true,
        },
        brightness: {
          type: 'number',
          displayName: 'Brightness',
          description: 'Brightness level from 0 to 100',
          required: true,
        },
        transitionTime: {
          type: 'number',
          displayName: 'Transition Time (seconds)',
          description: 'Time to transition to new brightness',
          required: false,
        },
      },
      run: async ({ props }) => {
        const brightness = Math.max(0, Math.min(100, props.brightness));
        await driver.setLevel(props.deviceId, brightness, props.transitionTime);
        return { success: true, deviceId: props.deviceId, brightness };
      },
    },

    // Color control
    setColor: {
      displayName: 'Set Color',
      description: 'Set the color of a light (hue/saturation or color temperature)',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the light',
          required: true,
        },
        hue: {
          type: 'number',
          displayName: 'Hue',
          description: 'Color hue from 0 to 360',
          required: false,
        },
        saturation: {
          type: 'number',
          displayName: 'Saturation',
          description: 'Color saturation from 0 to 100',
          required: false,
        },
        colorTemperature: {
          type: 'number',
          displayName: 'Color Temperature (K)',
          description: 'Color temperature from 2000K to 6500K',
          required: false,
        },
        transitionTime: {
          type: 'number',
          displayName: 'Transition Time (seconds)',
          description: 'Time to transition to new color',
          required: false,
        },
      },
      run: async ({ props }) => {
        await driver.setColor(props.deviceId, {
          hue: props.hue,
          saturation: props.saturation,
          colorTemperature: props.colorTemperature,
          transitionTime: props.transitionTime,
        });
        return {
          success: true,
          deviceId: props.deviceId,
          color: {
            hue: props.hue,
            saturation: props.saturation,
            colorTemperature: props.colorTemperature,
          },
        };
      },
    },

    // Combined light control
    setLight: {
      displayName: 'Set Light',
      description: 'Set brightness and optionally color of a light',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the light',
          required: true,
        },
        brightness: {
          type: 'number',
          displayName: 'Brightness',
          description: 'Brightness level from 0 to 100',
          required: true,
        },
        hue: {
          type: 'number',
          displayName: 'Hue',
          description: 'Color hue from 0 to 360',
          required: false,
        },
        saturation: {
          type: 'number',
          displayName: 'Saturation',
          description: 'Color saturation from 0 to 100',
          required: false,
        },
        colorTemperature: {
          type: 'number',
          displayName: 'Color Temperature (K)',
          description: 'Color temperature from 2000K to 6500K',
          required: false,
        },
      },
      run: async ({ props }) => {
        const brightness = Math.max(0, Math.min(100, props.brightness));
        const color = props.hue || props.saturation || props.colorTemperature
          ? {
              hue: props.hue,
              saturation: props.saturation,
              colorTemperature: props.colorTemperature,
            }
          : undefined;
        
        await driver.setLight(props.deviceId, brightness, color);
        return {
          success: true,
          deviceId: props.deviceId,
          brightness,
          color,
        };
      },
    },

    // Bulk controls
    turnAllOff: {
      displayName: 'Turn All Lights Off',
      description: 'Turn off all lights',
      props: {},
      run: async () => {
        const devices = await driver.getDevices();
        const lights = driver.getLights(devices);
        const results: any[] = [];
        
        for (const light of lights) {
          try {
            await driver.turnOff(light.id);
            results.push({ deviceId: light.id, name: light.name, success: true });
          } catch (e) {
            results.push({ deviceId: light.id, name: light.name, success: false, error: String(e) });
          }
        }
        
        return {
          totalDevices: lights.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results,
        };
      },
    },

    turnAllOn: {
      displayName: 'Turn All Lights On',
      description: 'Turn on all lights',
      props: {
        brightness: {
          type: 'number',
          displayName: 'Brightness',
          description: 'Brightness level (1-100)',
          required: false,
          default: 100,
        },
      },
      run: async ({ props }) => {
        const devices = await driver.getDevices();
        const lights = driver.getLights(devices);
        const results: any[] = [];
        const brightness = props.brightness || 100;
        
        for (const light of lights) {
          try {
            await driver.setLevel(light.id, brightness);
            results.push({ deviceId: light.id, name: light.name, success: true });
          } catch (e) {
            results.push({ deviceId: light.id, name: light.name, success: false, error: String(e) });
          }
        }
        
        return {
          totalDevices: lights.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          brightness,
          results,
        };
      },
    },

    // Scene-like controls
    setWarmLight: {
      displayName: 'Set Warm Light',
      description: 'Set a light to warm white (2700K)',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the light',
          required: true,
        },
        brightness: {
          type: 'number',
          displayName: 'Brightness',
          description: 'Brightness level (1-100)',
          required: false,
          default: 75,
        },
      },
      run: async ({ props }) => {
        await driver.setLight(props.deviceId, props.brightness || 75, { colorTemperature: 2700 });
        return { success: true, deviceId: props.deviceId, colorTemperature: 2700 };
      },
    },

    setCoolLight: {
      displayName: 'Set Cool Light',
      description: 'Set a light to cool white (5000K)',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the light',
          required: true,
        },
        brightness: {
          type: 'number',
          displayName: 'Brightness',
          description: 'Brightness level (1-100)',
          required: false,
          default: 100,
        },
      },
      run: async ({ props }) => {
        await driver.setLight(props.deviceId, props.brightness || 100, { colorTemperature: 5000 });
        return { success: true, deviceId: props.deviceId, colorTemperature: 5000 };
      },
    },

    // Device management (commissioning)
    addDevice: {
      displayName: 'Add Device',
      description: 'Commission a new Matter device using pairing code',
      props: {
        pairingCode: {
          type: 'string',
          displayName: 'Pairing Code',
          description: 'QR code payload or manual pairing code',
          required: true,
        },
        name: {
          type: 'string',
          displayName: 'Device Name',
          description: 'Custom name for the device',
          required: false,
        },
      },
      run: async ({ props }) => {
        const device = await driver.commissionDevice(props.pairingCode, props.name);
        return {
          success: true,
          device,
        };
      },
    },

    removeDevice: {
      displayName: 'Remove Device',
      description: 'Remove a device from the Matter fabric',
      props: {
        deviceId: {
          type: 'string',
          displayName: 'Device ID',
          description: 'The ID of the device to remove',
          required: true,
        },
      },
      run: async ({ props }) => {
        await driver.removeDevice(props.deviceId);
        return { success: true, deviceId: props.deviceId };
      },
    },
  },

  triggers: {
    // Smart home triggers would require persistent background monitoring
    // which is complex on mobile platforms. For now, workflows can use
    // polling via the location bit's geofence triggers combined with
    // smart home actions.
  },
};

export default smartHome;
