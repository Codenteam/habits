# tauri-plugin-matter

A Tauri v2 plugin for controlling Matter smart home devices on mobile platforms.

## Overview

This plugin provides a unified API for controlling Matter-compatible smart home devices:
- **Android**: Uses Google Play Services Home API with Matter support
- **iOS**: Uses HomeKit which includes native Matter support (iOS 15+)

## Features

- **Device Discovery**: Find Matter devices on the local network
- **OnOff Control**: Turn devices on/off
- **Level Control**: Adjust brightness/intensity
- **Color Control**: Set hue, saturation, and color temperature
- **Device Commissioning**: Add new devices to your Matter fabric
- **Device Removal**: Remove devices from the fabric

## Platform Support

| Feature | Android | iOS |
|---------|---------|-----|
| Discover Devices | ✅ | ✅ (via HomeKit) |
| On/Off Control | ✅ | ✅ |
| Level Control | ✅ | ✅ |
| Color Control | ✅ | ✅ |
| Commission Device | ✅ (via Google Home) | ⚠️ (opens Home app) |
| Remove Device | ✅ | ✅ |

## Requirements

### Android
- Android 8.1 (API 27) or higher
- Google Play Services
- Google Home app installed and configured

### iOS
- iOS 15 or higher (iOS 16+ for enhanced Matter support)
- Home app configured with a home

## Installation

### Rust

Add to your `Cargo.toml`:

```toml
[dependencies]
tauri-plugin-matter = { path = "../tauri-plugin-matter" }
```

### JavaScript/TypeScript

```bash
npm install tauri-plugin-matter-api
```

## Setup

### Tauri Configuration

Add the plugin to `tauri.conf.json`:

```json
{
  "plugins": {
    "matter": {}
  }
}
```

Add permissions in `capabilities/default.json`:

```json
{
  "permissions": [
    "matter:default"
  ]
}
```

### Rust (main.rs)

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_matter::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### iOS Configuration

Add to `Info.plist`:

```xml
<key>NSHomeKitUsageDescription</key>
<string>This app needs access to HomeKit to control your smart home devices.</string>
```

## Usage

### TypeScript

```typescript
import {
  discoverDevices,
  getDevices,
  getDeviceState,
  setOnOff,
  setLevel,
  setColor,
  turnOn,
  turnOff,
  toggle,
  setLight,
} from 'tauri-plugin-matter-api';

// Discover devices
const devices = await discoverDevices(10); // 10 second timeout
console.log('Found devices:', devices);

// Get all known devices
const knownDevices = await getDevices();

// Get device state
const state = await getDeviceState('device-id');
console.log(`Device is ${state.on ? 'on' : 'off'}, brightness: ${state.level}%`);

// Control devices
await turnOn('device-id');
await turnOff('device-id');
await toggle('device-id');

// Set brightness
await setLevel('device-id', 75); // 75%

// Set color (hue 0-360, saturation 0-100)
await setColor('device-id', {
  hue: 240,      // Blue
  saturation: 100,
});

// Set color temperature (2000-6500K)
await setColor('device-id', {
  colorTemperature: 4000, // Neutral white
});

// Convenience: set light with brightness and color
await setLight('device-id', 80, {
  hue: 30,
  saturation: 80,
});
```

### Device Types

```typescript
type DeviceType =
  | 'light'
  | 'switch'
  | 'outlet'
  | 'thermostat'
  | 'door_lock'
  | 'window_covering'
  | 'fan'
  | 'sensor'
  | 'unknown';
```

### Capabilities

```typescript
type Capability =
  | 'on_off'          // OnOff cluster
  | 'level_control'   // LevelControl cluster
  | 'color_control'   // ColorControl cluster
  | 'temperature_control'
  | 'door_lock'
  | 'window_covering';
```

## Android Permissions

The plugin automatically declares required permissions:

```xml
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## Notes

### Commissioning

- **Android**: The plugin launches the Google Home commissioning flow. Your app must be registered as a Matter commissioner.
- **iOS**: Matter commissioning must be done through the Home app. The plugin will open the Home app when commissioning is requested.

### Device Discovery

Devices must first be commissioned to your Matter fabric (Android) or HomeKit home (iOS) before they can be discovered and controlled by this plugin.

### Thread Border Router

Matter over Thread requires a Thread Border Router (like HomePod mini, Apple TV 4K, or Google Nest Hub) for network connectivity.

## License

MIT
