/**
 * @ha-bits/bit-location
 * 
 * Location and geofencing bit for mobile/desktop Tauri apps.
 * Uses @tauri-apps/plugin-geolocation for device location services.
 * 
 * Features:
 * - Get current position (one-time)
 * - Watch position changes
 * - Geofence management (add/remove/list)
 * - Geofence triggers (enter/exit events)
 * 
 * Environments:
 * - Tauri App: Uses @tauri-apps/plugin-geolocation
 * - Server: Not available (location requires device)
 */

import * as driver from './driver';

// ============================================================================
// Types
// ============================================================================

interface LocationContext {
  propsValue: Record<string, any>;
  store?: GeofenceStore;
  pollingStore?: PollingStore;
  setSchedule?: (options: { cronExpression: string; timezone?: string }) => void;
}

interface GeofenceStore {
  get: (key: string) => Promise<any>;
  put: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

interface PollingStore {
  hasSeenItem: (itemId: string) => Promise<boolean>;
  markItemSeen: (itemId: string, sourceDate: string) => Promise<void>;
  getLastPolledDate: () => Promise<string | null>;
  setLastPolledDate: (date: string) => Promise<void>;
}

interface Geofence {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
}

interface GeofenceEvent {
  id: string;
  geofenceId: string;
  geofenceName?: string;
  eventType: 'enter' | 'exit';
  timestamp: string;
  position: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  distance: number;
}

// ============================================================================
// Geofencing Utilities
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a position is inside a geofence
 */
function isInsideGeofence(
  position: { latitude: number; longitude: number },
  geofence: Geofence
): { inside: boolean; distance: number } {
  const distance = calculateDistance(
    position.latitude,
    position.longitude,
    geofence.latitude,
    geofence.longitude
  );
  return {
    inside: distance <= geofence.radius,
    distance,
  };
}

// ============================================================================
// Bit Definition
// ============================================================================

const locationBit = {
  displayName: 'Location',
  description: 'Device location and geofencing for mobile/desktop apps',
  logoUrl: 'lucide:MapPin',
  runtime: 'app' as const, // App-only - requires device location services

  actions: {
    /**
     * Get current device position
     */
    getCurrentPosition: {
      name: 'getCurrentPosition',
      displayName: 'Get Current Position',
      description: 'Get the current GPS position of the device',
      props: {
        enableHighAccuracy: {
          type: 'CHECKBOX',
          displayName: 'High Accuracy',
          description: 'Use GPS for higher accuracy (may use more battery)',
          required: false,
          defaultValue: true,
        },
        timeout: {
          type: 'NUMBER',
          displayName: 'Timeout (ms)',
          description: 'Maximum time to wait for position',
          required: false,
          defaultValue: 10000,
        },
      },
      async run(context: LocationContext) {
        const { enableHighAccuracy, timeout } = context.propsValue;

        const position = await driver.getCurrentPosition({
          enableHighAccuracy: enableHighAccuracy !== false,
          timeout: timeout || 10000,
        });

        return {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          altitude: position.altitude,
          heading: position.heading,
          speed: position.speed,
          timestamp: new Date(position.timestamp).toISOString(),
        };
      },
    },

    /**
     * Add a geofence region
     */
    addGeofence: {
      name: 'addGeofence',
      displayName: 'Add Geofence',
      description: 'Register a circular geofence region to monitor',
      props: {
        geofenceId: {
          type: 'SHORT_TEXT',
          displayName: 'Geofence ID',
          description: 'Unique identifier for this geofence',
          required: true,
        },
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Name',
          description: 'Human-readable name for this geofence',
          required: false,
        },
        latitude: {
          type: 'NUMBER',
          displayName: 'Latitude',
          description: 'Center latitude of the geofence',
          required: true,
        },
        longitude: {
          type: 'NUMBER',
          displayName: 'Longitude',
          description: 'Center longitude of the geofence',
          required: true,
        },
        radius: {
          type: 'NUMBER',
          displayName: 'Radius (meters)',
          description: 'Radius of the geofence in meters (recommended: 100+)',
          required: true,
          defaultValue: 100,
        },
      },
      async run(context: LocationContext) {
        const { geofenceId, name, latitude, longitude, radius } = context.propsValue;

        if (!context.store) {
          throw new Error('Store not available for geofence persistence');
        }

        const geofence: Geofence = {
          id: geofenceId,
          name: name || geofenceId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseFloat(radius),
        };

        // Get existing geofences
        const geofences: Geofence[] = (await context.store.get('geofences')) || [];

        // Remove existing geofence with same ID
        const filtered = geofences.filter((g) => g.id !== geofenceId);
        filtered.push(geofence);

        // Save updated geofences
        await context.store.put('geofences', filtered);

        return {
          success: true,
          geofence,
          totalGeofences: filtered.length,
        };
      },
    },

    /**
     * Remove a geofence
     */
    removeGeofence: {
      name: 'removeGeofence',
      displayName: 'Remove Geofence',
      description: 'Remove a registered geofence',
      props: {
        geofenceId: {
          type: 'SHORT_TEXT',
          displayName: 'Geofence ID',
          description: 'ID of the geofence to remove',
          required: true,
        },
      },
      async run(context: LocationContext) {
        const { geofenceId } = context.propsValue;

        if (!context.store) {
          throw new Error('Store not available for geofence persistence');
        }

        const geofences: Geofence[] = (await context.store.get('geofences')) || [];
        const filtered = geofences.filter((g) => g.id !== geofenceId);

        await context.store.put('geofences', filtered);

        return {
          success: true,
          removed: geofences.length !== filtered.length,
          totalGeofences: filtered.length,
        };
      },
    },

    /**
     * List all registered geofences
     */
    listGeofences: {
      name: 'listGeofences',
      displayName: 'List Geofences',
      description: 'Get all registered geofences',
      props: {},
      async run(context: LocationContext) {
        if (!context.store) {
          throw new Error('Store not available for geofence persistence');
        }

        const geofences: Geofence[] = (await context.store.get('geofences')) || [];

        return {
          geofences,
          count: geofences.length,
        };
      },
    },

    /**
     * Check if current position is inside any geofences
     */
    checkGeofenceStatus: {
      name: 'checkGeofenceStatus',
      displayName: 'Check Geofence Status',
      description: 'Check current position against all registered geofences',
      props: {
        enableHighAccuracy: {
          type: 'CHECKBOX',
          displayName: 'High Accuracy',
          description: 'Use GPS for higher accuracy',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: LocationContext) {
        if (!context.store) {
          throw new Error('Store not available for geofence persistence');
        }

        const position = await driver.getCurrentPosition({
          enableHighAccuracy: context.propsValue.enableHighAccuracy !== false,
        });

        const geofences: Geofence[] = (await context.store.get('geofences')) || [];

        const results = geofences.map((geofence) => {
          const { inside, distance } = isInsideGeofence(
            { latitude: position.latitude, longitude: position.longitude },
            geofence
          );
          return {
            geofenceId: geofence.id,
            geofenceName: geofence.name,
            inside,
            distance: Math.round(distance),
            radius: geofence.radius,
          };
        });

        return {
          position: {
            latitude: position.latitude,
            longitude: position.longitude,
            accuracy: position.accuracy,
          },
          geofences: results,
          insideAny: results.some((r) => r.inside),
          insideGeofences: results.filter((r) => r.inside).map((r) => r.geofenceId),
        };
      },
    },

    /**
     * Calculate distance between two coordinates
     */
    calculateDistance: {
      name: 'calculateDistance',
      displayName: 'Calculate Distance',
      description: 'Calculate distance between two GPS coordinates in meters',
      props: {
        lat1: {
          type: 'NUMBER',
          displayName: 'Latitude 1',
          description: 'First point latitude',
          required: true,
        },
        lon1: {
          type: 'NUMBER',
          displayName: 'Longitude 1',
          description: 'First point longitude',
          required: true,
        },
        lat2: {
          type: 'NUMBER',
          displayName: 'Latitude 2',
          description: 'Second point latitude',
          required: true,
        },
        lon2: {
          type: 'NUMBER',
          displayName: 'Longitude 2',
          description: 'Second point longitude',
          required: true,
        },
      },
      async run(context: LocationContext) {
        const { lat1, lon1, lat2, lon2 } = context.propsValue;
        const distance = calculateDistance(
          parseFloat(lat1),
          parseFloat(lon1),
          parseFloat(lat2),
          parseFloat(lon2)
        );

        return {
          distance: Math.round(distance),
          distanceKm: (distance / 1000).toFixed(2),
          distanceMiles: (distance / 1609.344).toFixed(2),
        };
      },
    },
  },

  triggers: {
    /**
     * Trigger when entering a geofence
     */
    onGeofenceEnter: {
      name: 'onGeofenceEnter',
      displayName: 'On Geofence Enter',
      description: 'Triggered when device enters a registered geofence',
      type: 'POLLING',
      props: {
        geofenceId: {
          type: 'SHORT_TEXT',
          displayName: 'Geofence ID',
          description: 'Specific geofence to monitor (leave empty for all)',
          required: false,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Check Interval',
          description: 'How often to check location (cron expression)',
          required: false,
          defaultValue: '*/30 * * * * *', // Every 30 seconds
        },
      },
      async run(context: LocationContext): Promise<GeofenceEvent[]> {
        const { geofenceId, cronExpression } = context.propsValue;

        // Set polling schedule
        if (context.setSchedule && cronExpression) {
          context.setSchedule({ cronExpression });
        }

        if (!context.store || !context.pollingStore) {
          return [];
        }

        // Get current position
        let position;
        try {
          position = await driver.getCurrentPosition({ enableHighAccuracy: true });
        } catch (error) {
          console.warn('[bit-location] Could not get position:', error);
          return [];
        }

        // Get geofences
        const geofences: Geofence[] = (await context.store.get('geofences')) || [];
        const targetGeofences = geofenceId
          ? geofences.filter((g) => g.id === geofenceId)
          : geofences;

        // Get previous states
        const previousStates: Record<string, boolean> =
          (await context.store.get('geofenceStates')) || {};

        const events: GeofenceEvent[] = [];
        const newStates: Record<string, boolean> = {};

        for (const geofence of targetGeofences) {
          const { inside, distance } = isInsideGeofence(
            { latitude: position.latitude, longitude: position.longitude },
            geofence
          );

          newStates[geofence.id] = inside;

          // Check for enter event (was outside, now inside)
          const wasInside = previousStates[geofence.id] ?? false;
          if (inside && !wasInside) {
            const eventId = `enter-${geofence.id}-${Date.now()}`;

            // Check if we've already processed this event
            if (!(await context.pollingStore.hasSeenItem(eventId))) {
              events.push({
                id: eventId,
                geofenceId: geofence.id,
                geofenceName: geofence.name,
                eventType: 'enter',
                timestamp: new Date().toISOString(),
                position: {
                  latitude: position.latitude,
                  longitude: position.longitude,
                  accuracy: position.accuracy,
                },
                distance: Math.round(distance),
              });

              await context.pollingStore.markItemSeen(eventId, new Date().toISOString());
            }
          }
        }

        // Save new states
        await context.store.put('geofenceStates', newStates);

        return events;
      },
    },

    /**
     * Trigger when exiting a geofence
     */
    onGeofenceExit: {
      name: 'onGeofenceExit',
      displayName: 'On Geofence Exit',
      description: 'Triggered when device exits a registered geofence',
      type: 'POLLING',
      props: {
        geofenceId: {
          type: 'SHORT_TEXT',
          displayName: 'Geofence ID',
          description: 'Specific geofence to monitor (leave empty for all)',
          required: false,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Check Interval',
          description: 'How often to check location (cron expression)',
          required: false,
          defaultValue: '*/30 * * * * *', // Every 30 seconds
        },
      },
      async run(context: LocationContext): Promise<GeofenceEvent[]> {
        const { geofenceId, cronExpression } = context.propsValue;

        // Set polling schedule
        if (context.setSchedule && cronExpression) {
          context.setSchedule({ cronExpression });
        }

        if (!context.store || !context.pollingStore) {
          return [];
        }

        // Get current position
        let position;
        try {
          position = await driver.getCurrentPosition({ enableHighAccuracy: true });
        } catch (error) {
          console.warn('[bit-location] Could not get position:', error);
          return [];
        }

        // Get geofences
        const geofences: Geofence[] = (await context.store.get('geofences')) || [];
        const targetGeofences = geofenceId
          ? geofences.filter((g) => g.id === geofenceId)
          : geofences;

        // Get previous states
        const previousStates: Record<string, boolean> =
          (await context.store.get('geofenceStates')) || {};

        const events: GeofenceEvent[] = [];
        const newStates: Record<string, boolean> = {};

        for (const geofence of targetGeofences) {
          const { inside, distance } = isInsideGeofence(
            { latitude: position.latitude, longitude: position.longitude },
            geofence
          );

          newStates[geofence.id] = inside;

          // Check for exit event (was inside, now outside)
          const wasInside = previousStates[geofence.id] ?? true; // Default to true to avoid false exit on first check
          if (!inside && wasInside) {
            const eventId = `exit-${geofence.id}-${Date.now()}`;

            // Check if we've already processed this event
            if (!(await context.pollingStore.hasSeenItem(eventId))) {
              events.push({
                id: eventId,
                geofenceId: geofence.id,
                geofenceName: geofence.name,
                eventType: 'exit',
                timestamp: new Date().toISOString(),
                position: {
                  latitude: position.latitude,
                  longitude: position.longitude,
                  accuracy: position.accuracy,
                },
                distance: Math.round(distance),
              });

              await context.pollingStore.markItemSeen(eventId, new Date().toISOString());
            }
          }
        }

        // Save new states
        await context.store.put('geofenceStates', newStates);

        return events;
      },
    },

    /**
     * Trigger on significant location change
     */
    onLocationChange: {
      name: 'onLocationChange',
      displayName: 'On Location Change',
      description: 'Triggered when device location changes significantly',
      type: 'POLLING',
      props: {
        minDistanceMeters: {
          type: 'NUMBER',
          displayName: 'Minimum Distance (meters)',
          description: 'Minimum distance change to trigger (default: 50m)',
          required: false,
          defaultValue: 50,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Check Interval',
          description: 'How often to check location (cron expression)',
          required: false,
          defaultValue: '*/60 * * * * *', // Every 60 seconds
        },
      },
      async run(context: LocationContext): Promise<any[]> {
        const { minDistanceMeters, cronExpression } = context.propsValue;
        const minDistance = minDistanceMeters || 50;

        // Set polling schedule
        if (context.setSchedule && cronExpression) {
          context.setSchedule({ cronExpression });
        }

        if (!context.store || !context.pollingStore) {
          return [];
        }

        // Get current position
        let position;
        try {
          position = await driver.getCurrentPosition({ enableHighAccuracy: true });
        } catch (error) {
          console.warn('[bit-location] Could not get position:', error);
          return [];
        }

        // Get last known position
        const lastPosition: { latitude: number; longitude: number; timestamp: string } | null =
          await context.store.get('lastPosition');

        // If no previous position, just save current and return empty
        if (!lastPosition) {
          await context.store.put('lastPosition', {
            latitude: position.latitude,
            longitude: position.longitude,
            timestamp: new Date().toISOString(),
          });
          return [];
        }

        // Calculate distance from last position
        const distance = calculateDistance(
          lastPosition.latitude,
          lastPosition.longitude,
          position.latitude,
          position.longitude
        );

        // Check if significant change
        if (distance >= minDistance) {
          const eventId = `location-change-${Date.now()}`;

          // Save new position
          await context.store.put('lastPosition', {
            latitude: position.latitude,
            longitude: position.longitude,
            timestamp: new Date().toISOString(),
          });

          // Mark event as seen
          await context.pollingStore.markItemSeen(eventId, new Date().toISOString());

          return [
            {
              id: eventId,
              previousPosition: lastPosition,
              currentPosition: {
                latitude: position.latitude,
                longitude: position.longitude,
                accuracy: position.accuracy,
              },
              distance: Math.round(distance),
              timestamp: new Date().toISOString(),
            },
          ];
        }

        return [];
      },
    },
  },
};

export default locationBit;
