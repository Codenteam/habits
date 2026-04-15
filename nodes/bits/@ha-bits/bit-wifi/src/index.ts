/**
 * Wi-Fi Network Monitoring Bit
 *
 * A mobile-only bit for monitoring Wi-Fi network connections.
 * Provides actions to check current network and triggers for network changes.
 */
import {
  createBit,
  createAction,
  createTrigger,
  Property,
  TriggerStrategy,
} from '@ha-bits/cortex-core';
import * as driver from './driver';

// Store for active network monitors
const networkMonitors = new Map<string, { stop: () => void }>();

// Actions
const getCurrentNetwork = createAction({
  name: 'getCurrentNetwork',
  displayName: 'Get Current Network',
  description: 'Get information about the currently connected Wi-Fi network',
  props: {},
  async run() {
    const network = await driver.getCurrentNetwork();
    return {
      network,
      connected: network !== null,
      ssid: network?.ssid ?? null,
    };
  },
});

const isConnected = createAction({
  name: 'isConnected',
  displayName: 'Is Connected',
  description: 'Check if device is connected to Wi-Fi',
  props: {},
  async run() {
    const connected = await driver.isConnected();
    return { connected };
  },
});

const isConnectedTo = createAction({
  name: 'isConnectedTo',
  displayName: 'Is Connected To Network',
  description: 'Check if device is connected to a specific Wi-Fi network',
  props: {
    ssid: Property.ShortText({
      displayName: 'Network Name (SSID)',
      description: 'The SSID of the network to check',
      required: true,
    }),
  },
  async run({ propsValue }) {
    const connected = await driver.isConnectedTo(propsValue.ssid);
    return { connected, ssid: propsValue.ssid };
  },
});

const listSavedNetworks = createAction({
  name: 'listSavedNetworks',
  displayName: 'List Saved Networks',
  description: 'Get a list of saved Wi-Fi network names',
  props: {},
  async run() {
    const networks = await driver.listSavedNetworks();
    return { networks, count: networks.length };
  },
});

const checkPermissions = createAction({
  name: 'checkPermissions',
  displayName: 'Check Permissions',
  description: 'Check Wi-Fi related permissions status',
  props: {},
  async run() {
    const permissions = await driver.checkPermissions();
    return permissions;
  },
});

const requestPermissions = createAction({
  name: 'requestPermissions',
  displayName: 'Request Permissions',
  description: 'Request Wi-Fi related permissions',
  props: {},
  async run() {
    const permissions = await driver.requestPermissions();
    return permissions;
  },
});

// Triggers
const onNetworkChange = createTrigger({
  name: 'onNetworkChange',
  displayName: 'On Network Change',
  description: 'Triggered when the Wi-Fi network changes',
  type: TriggerStrategy.POLLING,
  props: {
    pollingInterval: Property.Number({
      displayName: 'Polling Interval (ms)',
      description: 'How often to check for network changes',
      required: false,
      defaultValue: 5000,
    }),
  },
  async run({ propsValue, store }) {
    // Get stored network
    const lastNetwork = await store.get('lastNetwork');
    const currentNetwork = await driver.getCurrentNetwork();
    const currentSsid = currentNetwork?.ssid ?? null;
    
    // Check for change
    if (lastNetwork !== currentSsid) {
      await store.put('lastNetwork', currentSsid);
      
      // Skip initial run
      if (lastNetwork !== undefined) {
        return [{
          event: 'networkChange',
          network: currentNetwork,
          ssid: currentSsid,
          previousSsid: lastNetwork,
          connected: currentNetwork !== null,
          timestamp: new Date().toISOString(),
        }];
      }
    }
    
    return [];
  },
});

const onConnectTo = createTrigger({
  name: 'onConnectTo',
  displayName: 'On Connect To Network',
  description: 'Triggered when connecting to a specific Wi-Fi network',
  type: TriggerStrategy.POLLING,
  props: {
    ssid: Property.ShortText({
      displayName: 'Network Name (SSID)',
      description: 'The SSID of the network to monitor',
      required: true,
    }),
    pollingInterval: Property.Number({
      displayName: 'Polling Interval (ms)',
      description: 'How often to check for connection',
      required: false,
      defaultValue: 5000,
    }),
  },
  async run({ propsValue, store }) {
    const wasConnected = await store.get('wasConnected') ?? false;
    const currentNetwork = await driver.getCurrentNetwork();
    const isConnected = currentNetwork?.ssid === propsValue.ssid;
    
    await store.put('wasConnected', isConnected);
    
    // Trigger on transition from disconnected to connected
    if (isConnected && !wasConnected) {
      return [{
        event: 'connectedTo',
        ssid: propsValue.ssid,
        network: currentNetwork,
        timestamp: new Date().toISOString(),
      }];
    }
    
    return [];
  },
});

const onDisconnectFrom = createTrigger({
  name: 'onDisconnectFrom',
  displayName: 'On Disconnect From Network',
  description: 'Triggered when disconnecting from a specific Wi-Fi network',
  type: TriggerStrategy.POLLING,
  props: {
    ssid: Property.ShortText({
      displayName: 'Network Name (SSID)',
      description: 'The SSID of the network to monitor',
      required: true,
    }),
    pollingInterval: Property.Number({
      displayName: 'Polling Interval (ms)',
      description: 'How often to check for disconnection',
      required: false,
      defaultValue: 5000,
    }),
  },
  async run({ propsValue, store }) {
    const wasConnected = await store.get('wasConnected');
    const currentNetwork = await driver.getCurrentNetwork();
    const isConnected = currentNetwork?.ssid === propsValue.ssid;
    
    // Initialize on first run
    if (wasConnected === undefined) {
      await store.put('wasConnected', isConnected);
      return [];
    }
    
    await store.put('wasConnected', isConnected);
    
    // Trigger on transition from connected to disconnected
    if (!isConnected && wasConnected) {
      return [{
        event: 'disconnectedFrom',
        ssid: propsValue.ssid,
        network: currentNetwork,
        timestamp: new Date().toISOString(),
      }];
    }
    
    return [];
  },
});

// Export the bit
export const wifi = createBit({
  displayName: 'Wi-Fi Network',
  description: 'Monitor Wi-Fi network connections and trigger actions on network changes',
  logoUrl: 'lucide:Wifi',
  actions: [
    getCurrentNetwork,
    isConnected,
    isConnectedTo,
    listSavedNetworks,
    checkPermissions,
    requestPermissions,
  ],
  triggers: [
    onNetworkChange,
    onConnectTo,
    onDisconnectFrom,
  ],
});

// Mark as app-only runtime (added to the exported bit object)
(wifi as any).runtime = 'app';

export default wifi;
