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

import { createBit, createAction, createTrigger, Property, TriggerStrategy } from '@ha-bits/cortex-core';
import * as driver from './driver';

// ============================================================================
// Types
// ============================================================================

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
// Actions
// ============================================================================

const getCurrentPosition = createAction({
  name: 'getCurrentPosition',
  displayName: 'Get Current Position',
  description: 'Get the current GPS position of the device',
  props: {
    enableHighAccuracy: Property.Checkbox({
      displayName: 'High Accuracy',
      description: 'Use GPS for higher accuracy (may use more battery)',
      required: false,
      defaultValue: true,
    }),
    timeout: Property.Number({
      displayName: 'Timeout (ms)',
      description: 'Maximum time to wait for position',
      required: false,
      defaultValue: 10000,
    }),
  },
  run: async (context) => {
    const enableHighAccuracy = context.propsValue.enableHighAccuracy !== false;
    const timeout = (context.propsValue.timeout as number) || 10000;

    const position = await driver.getCurrentPosition({
      enableHighAccuracy,
      timeout,
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
});

const addGeofence = createAction({
  name: 'addGeofence',
  displayName: 'Add Geofence',
  description: 'Register a circular geofence region to monitor',
  props: {
    geofenceId: Property.ShortText({
      displayName: 'Geofence ID',
      description: 'Unique identifier for this geofence',
      required: true,
    }),
    name: Property.ShortText({
      displayName: 'Name',
      description: 'Human-readable name for this geofence',
      required: false,
    }),
    latitude: Property.Number({
      displayName: 'Latitude',
      description: 'Center latitude of the geofence',
      required: true,
    }),
    longitude: Property.Number({
      displayName: 'Longitude',
      description: 'Center longitude of the geofence',
      required: true,
    }),
    radius: Property.Number({
      displayName: 'Radius (meters)',
      description: 'Radius of the geofence in meters (recommended: 100+)',
      required: true,
      defaultValue: 100,
    }),
  },
  run: async (context) => {
    const store = (context as any).store;
    if (!store) {
      throw new Error('Store not available for geofence persistence');
    }

    const geofence: Geofence = {
      id: context.propsValue.geofenceId as string,
      name: (context.propsValue.name as string) || (context.propsValue.geofenceId as string),
      latitude: parseFloat(String(context.propsValue.latitude)),
      longitude: parseFloat(String(context.propsValue.longitude)),
      radius: parseFloat(String(context.propsValue.radius)),
    };

    // Get existing geofences
    const geofences: Geofence[] = (await store.get('geofences')) || [];

    // Remove existing geofence with same ID
    const filtered = geofences.filter((g: Geofence) => g.id !== geofence.id);
    filtered.push(geofence);

    // Save updated geofences
    await store.put('geofences', filtered);

    return {
      success: true,
      geofence,
      totalGeofences: filtered.length,
    };
  },
});

const removeGeofence = createAction({
  name: 'removeGeofence',
  displayName: 'Remove Geofence',
  description: 'Remove a registered geofence',
  props: {
    geofenceId: Property.ShortText({
      displayName: 'Geofence ID',
      description: 'ID of the geofence to remove',
      required: true,
    }),
  },
  run: async (context) => {
    const store = (context as any).store;
    if (!store) {
      throw new Error('Store not available for geofence persistence');
    }

    const geofenceId = context.propsValue.geofenceId as string;
    const geofences: Geofence[] = (await store.get('geofences')) || [];
    const filtered = geofences.filter((g: Geofence) => g.id !== geofenceId);

    await store.put('geofences', filtered);

    return {
      success: true,
      removed: geofences.length !== filtered.length,
      totalGeofences: filtered.length,
    };
  },
});

const listGeofences = createAction({
  name: 'listGeofences',
  displayName: 'List Geofences',
  description: 'Get all registered geofences',
  props: {},
  run: async (context) => {
    const store = (context as any).store;
    if (!store) {
      throw new Error('Store not available for geofence persistence');
    }

    const geofences: Geofence[] = (await store.get('geofences')) || [];

    return {
      geofences,
      count: geofences.length,
    };
  },
});

const checkGeofenceStatus = createAction({
  name: 'checkGeofenceStatus',
  displayName: 'Check Geofence Status',
  description: 'Check current position against all registered geofences',
  props: {
    enableHighAccuracy: Property.Checkbox({
      displayName: 'High Accuracy',
      description: 'Use GPS for higher accuracy',
      required: false,
      defaultValue: true,
    }),
  },
  run: async (context) => {
    const store = (context as any).store;
    if (!store) {
      throw new Error('Store not available for geofence persistence');
    }

    const position = await driver.getCurrentPosition({
      enableHighAccuracy: context.propsValue.enableHighAccuracy !== false,
    });

    const geofences: Geofence[] = (await store.get('geofences')) || [];

    const results = geofences.map((geofence: Geofence) => {
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
});

const calculateDistanceAction = createAction({
  name: 'calculateDistance',
  displayName: 'Calculate Distance',
  description: 'Calculate distance between two GPS coordinates in meters',
  props: {
    lat1: Property.Number({
      displayName: 'Latitude 1',
      description: 'First point latitude',
      required: true,
    }),
    lon1: Property.Number({
      displayName: 'Longitude 1',
      description: 'First point longitude',
      required: true,
    }),
    lat2: Property.Number({
      displayName: 'Latitude 2',
      description: 'Second point latitude',
      required: true,
    }),
    lon2: Property.Number({
      displayName: 'Longitude 2',
      description: 'Second point longitude',
      required: true,
    }),
  },
  run: async (context) => {
    const lat1 = parseFloat(String(context.propsValue.lat1));
    const lon1 = parseFloat(String(context.propsValue.lon1));
    const lat2 = parseFloat(String(context.propsValue.lat2));
    const lon2 = parseFloat(String(context.propsValue.lon2));
    
    const distance = calculateDistance(lat1, lon1, lat2, lon2);

    return {
      distance: Math.round(distance),
      distanceKm: (distance / 1000).toFixed(2),
      distanceMiles: (distance / 1609.344).toFixed(2),
    };
  },
});

// ============================================================================
// Triggers
// ============================================================================

const onGeofenceEnter = createTrigger({
  name: 'onGeofenceEnter',
  displayName: 'On Geofence Enter',
  description: 'Triggered when device enters a registered geofence',
  type: TriggerStrategy.POLLING,
  props: {
    geofenceId: Property.ShortText({
      displayName: 'Geofence ID',
      description: 'Specific geofence to monitor (leave empty for all)',
      required: false,
    }),
  },
  run: async (context): Promise<GeofenceEvent[]> => {
    const store = (context as any).store;
    const pollingStore = (context as any).pollingStore;
    const geofenceId = context.propsValue.geofenceId as string | undefined;

    if (!store || !pollingStore) {
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
    const geofences: Geofence[] = (await store.get('geofences')) || [];
    const targetGeofences = geofenceId
      ? geofences.filter((g: Geofence) => g.id === geofenceId)
      : geofences;

    // Get previous states
    const previousStates: Record<string, boolean> =
      (await store.get('geofenceStates')) || {};

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
        if (!(await pollingStore.hasSeenItem(eventId))) {
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

          await pollingStore.markItemSeen(eventId, new Date().toISOString());
        }
      }
    }

    // Save new states
    await store.put('geofenceStates', newStates);

    return events;
  },
});

const onGeofenceExit = createTrigger({
  name: 'onGeofenceExit',
  displayName: 'On Geofence Exit',
  description: 'Triggered when device exits a registered geofence',
  type: TriggerStrategy.POLLING,
  props: {
    geofenceId: Property.ShortText({
      displayName: 'Geofence ID',
      description: 'Specific geofence to monitor (leave empty for all)',
      required: false,
    }),
  },
  run: async (context): Promise<GeofenceEvent[]> => {
    const store = (context as any).store;
    const pollingStore = (context as any).pollingStore;
    const geofenceId = context.propsValue.geofenceId as string | undefined;

    if (!store || !pollingStore) {
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
    const geofences: Geofence[] = (await store.get('geofences')) || [];
    const targetGeofences = geofenceId
      ? geofences.filter((g: Geofence) => g.id === geofenceId)
      : geofences;

    // Get previous states
    const previousStates: Record<string, boolean> =
      (await store.get('geofenceStates')) || {};

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
        if (!(await pollingStore.hasSeenItem(eventId))) {
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

          await pollingStore.markItemSeen(eventId, new Date().toISOString());
        }
      }
    }

    // Save new states
    await store.put('geofenceStates', newStates);

    return events;
  },
});

const onLocationChange = createTrigger({
  name: 'onLocationChange',
  displayName: 'On Location Change',
  description: 'Triggered when device location changes significantly',
  type: TriggerStrategy.POLLING,
  props: {
    minDistanceMeters: Property.Number({
      displayName: 'Minimum Distance (meters)',
      description: 'Minimum distance change to trigger (default: 50m)',
      required: false,
      defaultValue: 50,
    }),
  },
  run: async (context): Promise<any[]> => {
    const store = (context as any).store;
    const pollingStore = (context as any).pollingStore;
    const minDistance = (context.propsValue.minDistanceMeters as number) || 50;

    if (!store || !pollingStore) {
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
      await store.get('lastPosition');

    // If no previous position, just save current and return empty
    if (!lastPosition) {
      await store.put('lastPosition', {
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
      await store.put('lastPosition', {
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: new Date().toISOString(),
      });

      // Mark event as seen
      await pollingStore.markItemSeen(eventId, new Date().toISOString());

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
});

// ============================================================================
// Bit Definition
// ============================================================================

export const location = createBit({
  displayName: 'Location',
  description: 'Device location and geofencing for mobile/desktop apps',
  logoUrl: 'lucide:MapPin',
  actions: [
    getCurrentPosition,
    addGeofence,
    removeGeofence,
    listGeofences,
    checkGeofenceStatus,
    calculateDistanceAction,
  ],
  triggers: [
    onGeofenceEnter,
    onGeofenceExit,
    onLocationChange,
  ],
});

// Mark as app-only runtime
(location as any).runtime = 'app';

export default location;
