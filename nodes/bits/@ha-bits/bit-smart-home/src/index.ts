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
import { createBit, createAction, Property } from '@ha-bits/cortex-core';
import * as driver from './driver';

// Device discovery
const discoverDevices = createAction({
  name: 'discoverDevices',
  displayName: 'Discover Devices',
  description: 'Discover Matter devices on the network',
  props: {
    timeout: Property.Number({
      displayName: 'Timeout (seconds)',
      description: 'How long to search for devices',
      required: false,
      defaultValue: 10,
    }),
  },
  run: async (context) => {
    const devices = await driver.discoverDevices(context.propsValue.timeout || 10);
    return {
      devices,
      count: devices.length,
      online: devices.filter(d => d.online).length,
    };
  },
});

const getDevices = createAction({
  name: 'getDevices',
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
});

const getLights = createAction({
  name: 'getLights',
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
});

const getDeviceState = createAction({
  name: 'getDeviceState',
  displayName: 'Get Device State',
  description: 'Get the current state of a device',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the device',
      required: true,
    }),
  },
  run: async (context) => {
    const state = await driver.getDeviceState(context.propsValue.deviceId as string);
    return state;
  },
});

// Basic on/off controls
const turnOn = createAction({
  name: 'turnOn',
  displayName: 'Turn On',
  description: 'Turn a device on',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the device to turn on',
      required: true,
    }),
  },
  run: async (context) => {
    await driver.turnOn(context.propsValue.deviceId as string);
    return { success: true, deviceId: context.propsValue.deviceId, action: 'on' };
  },
});

const turnOff = createAction({
  name: 'turnOff',
  displayName: 'Turn Off',
  description: 'Turn a device off',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the device to turn off',
      required: true,
    }),
  },
  run: async (context) => {
    await driver.turnOff(context.propsValue.deviceId as string);
    return { success: true, deviceId: context.propsValue.deviceId, action: 'off' };
  },
});

const toggle = createAction({
  name: 'toggle',
  displayName: 'Toggle',
  description: 'Toggle a device on/off',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the device to toggle',
      required: true,
    }),
  },
  run: async (context) => {
    await driver.toggle(context.propsValue.deviceId as string);
    return { success: true, deviceId: context.propsValue.deviceId, action: 'toggle' };
  },
});

// Brightness control
const setBrightness = createAction({
  name: 'setBrightness',
  displayName: 'Set Brightness',
  description: 'Set the brightness level of a light',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the light',
      required: true,
    }),
    brightness: Property.Number({
      displayName: 'Brightness',
      description: 'Brightness level from 0 to 100',
      required: true,
    }),
    transitionTime: Property.Number({
      displayName: 'Transition Time (seconds)',
      description: 'Time to transition to new brightness',
      required: false,
    }),
  },
  run: async (context) => {
    const brightness = Math.max(0, Math.min(100, context.propsValue.brightness || 0));
    await driver.setLevel(
      context.propsValue.deviceId as string,
      brightness,
      context.propsValue.transitionTime as number | undefined
    );
    return { success: true, deviceId: context.propsValue.deviceId, brightness };
  },
});

// Color control
const setColor = createAction({
  name: 'setColor',
  displayName: 'Set Color',
  description: 'Set the color of a light (hue/saturation or color temperature)',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the light',
      required: true,
    }),
    hue: Property.Number({
      displayName: 'Hue',
      description: 'Color hue from 0 to 360',
      required: false,
    }),
    saturation: Property.Number({
      displayName: 'Saturation',
      description: 'Color saturation from 0 to 100',
      required: false,
    }),
    colorTemperature: Property.Number({
      displayName: 'Color Temperature (K)',
      description: 'Color temperature from 2000K to 6500K',
      required: false,
    }),
    transitionTime: Property.Number({
      displayName: 'Transition Time (seconds)',
      description: 'Time to transition to new color',
      required: false,
    }),
  },
  run: async (context) => {
    await driver.setColor(context.propsValue.deviceId as string, {
      hue: context.propsValue.hue as number | undefined,
      saturation: context.propsValue.saturation as number | undefined,
      colorTemperature: context.propsValue.colorTemperature as number | undefined,
      transitionTime: context.propsValue.transitionTime as number | undefined,
    });
    return {
      success: true,
      deviceId: context.propsValue.deviceId,
      color: {
        hue: context.propsValue.hue,
        saturation: context.propsValue.saturation,
        colorTemperature: context.propsValue.colorTemperature,
      },
    };
  },
});

// Combined light control
const setLight = createAction({
  name: 'setLight',
  displayName: 'Set Light',
  description: 'Set brightness and optionally color of a light',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the light',
      required: true,
    }),
    brightness: Property.Number({
      displayName: 'Brightness',
      description: 'Brightness level from 0 to 100',
      required: true,
    }),
    hue: Property.Number({
      displayName: 'Hue',
      description: 'Color hue from 0 to 360',
      required: false,
    }),
    saturation: Property.Number({
      displayName: 'Saturation',
      description: 'Color saturation from 0 to 100',
      required: false,
    }),
    colorTemperature: Property.Number({
      displayName: 'Color Temperature (K)',
      description: 'Color temperature from 2000K to 6500K',
      required: false,
    }),
  },
  run: async (context) => {
    const brightness = Math.max(0, Math.min(100, context.propsValue.brightness || 0));
    const hasColor = context.propsValue.hue || context.propsValue.saturation || context.propsValue.colorTemperature;
    const color = hasColor
      ? {
          hue: context.propsValue.hue as number | undefined,
          saturation: context.propsValue.saturation as number | undefined,
          colorTemperature: context.propsValue.colorTemperature as number | undefined,
        }
      : undefined;
    
    await driver.setLight(context.propsValue.deviceId as string, brightness, color);
    return {
      success: true,
      deviceId: context.propsValue.deviceId,
      brightness,
      color,
    };
  },
});

// Bulk controls
const turnAllOff = createAction({
  name: 'turnAllOff',
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
});

const turnAllOn = createAction({
  name: 'turnAllOn',
  displayName: 'Turn All Lights On',
  description: 'Turn on all lights',
  props: {
    brightness: Property.Number({
      displayName: 'Brightness',
      description: 'Brightness level (1-100)',
      required: false,
      defaultValue: 100,
    }),
  },
  run: async (context) => {
    const devices = await driver.getDevices();
    const lights = driver.getLights(devices);
    const results: any[] = [];
    const brightness = context.propsValue.brightness || 100;
    
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
});

// Scene-like controls
const setWarmLight = createAction({
  name: 'setWarmLight',
  displayName: 'Set Warm Light',
  description: 'Set a light to warm white (2700K)',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the light',
      required: true,
    }),
    brightness: Property.Number({
      displayName: 'Brightness',
      description: 'Brightness level (1-100)',
      required: false,
      defaultValue: 75,
    }),
  },
  run: async (context) => {
    await driver.setLight(
      context.propsValue.deviceId as string,
      context.propsValue.brightness || 75,
      { colorTemperature: 2700 }
    );
    return { success: true, deviceId: context.propsValue.deviceId, colorTemperature: 2700 };
  },
});

const setCoolLight = createAction({
  name: 'setCoolLight',
  displayName: 'Set Cool Light',
  description: 'Set a light to cool white (5000K)',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the light',
      required: true,
    }),
    brightness: Property.Number({
      displayName: 'Brightness',
      description: 'Brightness level (1-100)',
      required: false,
      defaultValue: 100,
    }),
  },
  run: async (context) => {
    await driver.setLight(
      context.propsValue.deviceId as string,
      context.propsValue.brightness || 100,
      { colorTemperature: 5000 }
    );
    return { success: true, deviceId: context.propsValue.deviceId, colorTemperature: 5000 };
  },
});

// Device management (commissioning)
const addDevice = createAction({
  name: 'addDevice',
  displayName: 'Add Device',
  description: 'Commission a new Matter device using pairing code',
  props: {
    pairingCode: Property.ShortText({
      displayName: 'Pairing Code',
      description: 'QR code payload or manual pairing code',
      required: true,
    }),
    name: Property.ShortText({
      displayName: 'Device Name',
      description: 'Custom name for the device',
      required: false,
    }),
  },
  run: async (context) => {
    const device = await driver.commissionDevice(
      context.propsValue.pairingCode as string,
      context.propsValue.name as string | undefined
    );
    return {
      success: true,
      device,
    };
  },
});

const removeDevice = createAction({
  name: 'removeDevice',
  displayName: 'Remove Device',
  description: 'Remove a device from the Matter fabric',
  props: {
    deviceId: Property.ShortText({
      displayName: 'Device ID',
      description: 'The ID of the device to remove',
      required: true,
    }),
  },
  run: async (context) => {
    await driver.removeDevice(context.propsValue.deviceId as string);
    return { success: true, deviceId: context.propsValue.deviceId };
  },
});

// Export the bit
export const smartHome = createBit({
  displayName: 'Smart Home',
  description: 'Control Matter-compatible smart home devices (lights, switches, outlets)',
  logoUrl: 'lucide:Home',
  actions: [
    discoverDevices,
    getDevices,
    getLights,
    getDeviceState,
    turnOn,
    turnOff,
    toggle,
    setBrightness,
    setColor,
    setLight,
    turnAllOff,
    turnAllOn,
    setWarmLight,
    setCoolLight,
    addDevice,
    removeDevice,
  ],
  triggers: [],
});

// Mark as app-only runtime
(smartHome as any).runtime = 'app';

export default smartHome;
