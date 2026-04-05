# Tauri Plugin: Wi-Fi

Monitor Wi-Fi network connectivity on mobile devices (Android and iOS).

## Features

- Get current Wi-Fi network information (SSID, BSSID, signal strength)
- Check if connected to a specific network
- List saved Wi-Fi networks (limited on modern Android/iOS)
- Permission management

## Platform Support

| Platform | Support |
|----------|---------|
| Windows  | ❌      |
| Linux    | ❌      |
| macOS    | ❌      |
| Android  | ✅      |
| iOS      | ✅      |

## Installation

### Rust

Add to your `Cargo.toml`:

```toml
[dependencies]
tauri-plugin-wifi = { path = "../tauri-plugin-wifi" }
```

### JavaScript

```bash
npm install tauri-plugin-wifi
```

## Setup

### Register the Plugin

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_wifi::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Configure Permissions

Add to your capabilities file:

```json
{
  "permissions": [
    "wifi:default"
  ]
}
```

### Android Permissions

The plugin adds these permissions to `AndroidManifest.xml` automatically:

```xml
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS Configuration

Add to your `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location access is required to get Wi-Fi network information</string>
```

Also, add the "Access WiFi Information" capability in Xcode.

## Usage

```typescript
import { 
  getCurrentNetwork, 
  isConnected, 
  checkPermissions, 
  requestPermissions 
} from 'tauri-plugin-wifi';

// Check and request permissions
const perms = await checkPermissions();
if (perms.location !== 'granted') {
  await requestPermissions(['location']);
}

// Get current network info
const network = await getCurrentNetwork();
if (network.connected) {
  console.log(`Connected to: ${network.network?.ssid}`);
  console.log(`Signal: ${network.network?.signalStrength} dBm`);
}

// Check if connected to specific network
const homeWifi = await isConnected('MyHomeWifi');
if (homeWifi.matchesRequested) {
  console.log('Connected to home WiFi!');
}
```

## Limitations

### iOS
- Reading Wi-Fi SSID requires location permission
- Access WiFi Information entitlement required (Xcode capability)
- Cannot list saved networks (privacy restriction)
- Signal strength not available

### Android
- SSID access requires location permission (Android 8.0+)
- Listing saved networks returns empty on Android 10+ (privacy restriction)

## API Reference

### `getCurrentNetwork()`

Returns current Wi-Fi network information.

### `isConnected(ssid?: string)`

Check if connected to any Wi-Fi or a specific network.

### `listSavedNetworks()`

List saved Wi-Fi networks (limited functionality).

### `checkPermissions()`

Check current permission status.

### `requestPermissions(permissions: string[])`

Request Wi-Fi-related permissions.

## License

MIT
