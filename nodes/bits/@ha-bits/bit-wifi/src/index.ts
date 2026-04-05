/**
 * Wi-Fi Network Monitoring Bit
 *
 * A mobile-only bit for monitoring Wi-Fi network connections.
 * Provides actions to check current network and triggers for network changes.
 */
import type { Bit } from '@ha-bits/cortex-core';
import * as driver from './driver';

// Store for active network monitors
const networkMonitors = new Map<string, { stop: () => void }>();

export const wifi: Bit = {
  displayName: 'Wi-Fi Network',
  runtime: 'app',
  logoUrl: 'https://cdn-icons-png.flaticon.com/512/93/93158.png',

  actions: {
    getCurrentNetwork: {
      displayName: 'Get Current Network',
      description: 'Get information about the currently connected Wi-Fi network',
      props: {},
      run: async () => {
        const network = await driver.getCurrentNetwork();
        return {
          network,
          connected: network !== null,
          ssid: network?.ssid ?? null,
        };
      },
    },

    isConnected: {
      displayName: 'Is Connected',
      description: 'Check if device is connected to Wi-Fi',
      props: {},
      run: async () => {
        const connected = await driver.isConnected();
        return { connected };
      },
    },

    isConnectedTo: {
      displayName: 'Is Connected To Network',
      description: 'Check if device is connected to a specific Wi-Fi network',
      props: {
        ssid: {
          type: 'string',
          displayName: 'Network Name (SSID)',
          description: 'The SSID of the network to check',
          required: true,
        },
      },
      run: async ({ props }) => {
        const connected = await driver.isConnectedTo(props.ssid);
        return { connected, ssid: props.ssid };
      },
    },

    listSavedNetworks: {
      displayName: 'List Saved Networks',
      description: 'Get a list of saved Wi-Fi network names',
      props: {},
      run: async () => {
        const networks = await driver.listSavedNetworks();
        return { networks, count: networks.length };
      },
    },

    checkPermissions: {
      displayName: 'Check Permissions',
      description: 'Check Wi-Fi related permissions status',
      props: {},
      run: async () => {
        const permissions = await driver.checkPermissions();
        return permissions;
      },
    },

    requestPermissions: {
      displayName: 'Request Permissions',
      description: 'Request Wi-Fi related permissions',
      props: {},
      run: async () => {
        const permissions = await driver.requestPermissions();
        return permissions;
      },
    },
  },

  triggers: {
    onNetworkChange: {
      displayName: 'On Network Change',
      description: 'Triggered when the Wi-Fi network changes',
      props: {
        pollingInterval: {
          type: 'number',
          displayName: 'Polling Interval (ms)',
          description: 'How often to check for network changes',
          required: false,
          default: 5000,
        },
      },
      run: async ({ props, onTrigger, context }) => {
        const triggerId = context.triggerId || `wifi-${Date.now()}`;
        const interval = props.pollingInterval || 5000;

        // Stop any existing monitor for this trigger
        const existing = networkMonitors.get(triggerId);
        if (existing) {
          existing.stop();
        }

        // Start new monitor
        const monitor = driver.createNetworkMonitor((network) => {
          onTrigger({
            event: 'networkChange',
            network,
            ssid: network?.ssid ?? null,
            connected: network !== null,
            timestamp: new Date().toISOString(),
          });
        }, interval);

        networkMonitors.set(triggerId, monitor);

        // Return cleanup function
        return () => {
          monitor.stop();
          networkMonitors.delete(triggerId);
        };
      },
    },

    onConnectTo: {
      displayName: 'On Connect To Network',
      description: 'Triggered when connecting to a specific Wi-Fi network',
      props: {
        ssid: {
          type: 'string',
          displayName: 'Network Name (SSID)',
          description: 'The SSID of the network to monitor',
          required: true,
        },
        pollingInterval: {
          type: 'number',
          displayName: 'Polling Interval (ms)',
          description: 'How often to check for connection',
          required: false,
          default: 5000,
        },
      },
      run: async ({ props, onTrigger, context }) => {
        const triggerId = context.triggerId || `wifi-connect-${props.ssid}-${Date.now()}`;
        const interval = props.pollingInterval || 5000;
        let wasConnected = false;

        // Stop any existing monitor for this trigger
        const existing = networkMonitors.get(triggerId);
        if (existing) {
          existing.stop();
        }

        // Start monitor
        const monitor = driver.createNetworkMonitor((network) => {
          const isConnected = network?.ssid === props.ssid;
          
          // Only trigger on transition from disconnected to connected
          if (isConnected && !wasConnected) {
            onTrigger({
              event: 'connectedTo',
              ssid: props.ssid,
              network,
              timestamp: new Date().toISOString(),
            });
          }
          
          wasConnected = isConnected;
        }, interval);

        networkMonitors.set(triggerId, monitor);

        return () => {
          monitor.stop();
          networkMonitors.delete(triggerId);
        };
      },
    },

    onDisconnectFrom: {
      displayName: 'On Disconnect From Network',
      description: 'Triggered when disconnecting from a specific Wi-Fi network',
      props: {
        ssid: {
          type: 'string',
          displayName: 'Network Name (SSID)',
          description: 'The SSID of the network to monitor',
          required: true,
        },
        pollingInterval: {
          type: 'number',
          displayName: 'Polling Interval (ms)',
          description: 'How often to check for disconnection',
          required: false,
          default: 5000,
        },
      },
      run: async ({ props, onTrigger, context }) => {
        const triggerId = context.triggerId || `wifi-disconnect-${props.ssid}-${Date.now()}`;
        const interval = props.pollingInterval || 5000;
        let wasConnected = true; // Assume connected initially

        // Check initial state
        const initialNetwork = await driver.getCurrentNetwork();
        wasConnected = initialNetwork?.ssid === props.ssid;

        // Stop any existing monitor for this trigger
        const existing = networkMonitors.get(triggerId);
        if (existing) {
          existing.stop();
        }

        // Start monitor
        const monitor = driver.createNetworkMonitor((network) => {
          const isConnected = network?.ssid === props.ssid;
          
          // Only trigger on transition from connected to disconnected
          if (!isConnected && wasConnected) {
            onTrigger({
              event: 'disconnectedFrom',
              ssid: props.ssid,
              network,
              timestamp: new Date().toISOString(),
            });
          }
          
          wasConnected = isConnected;
        }, interval);

        networkMonitors.set(triggerId, monitor);

        return () => {
          monitor.stop();
          networkMonitors.delete(triggerId);
        };
      },
    },
  },
};

export default wifi;
