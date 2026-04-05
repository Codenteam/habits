# tauri-plugin-system-settings

A Tauri v2 plugin for controlling system settings on mobile devices (Android/iOS).

## Features

- **Volume Control**: Get/set volume levels for different audio streams
- **Ringer Mode**: Get/set device ringer mode (normal, vibrate, silent)
- **Bluetooth**: Get state and enable/disable Bluetooth
- **Do Not Disturb**: Get state and enable/disable DND mode

## Platform Support

| Feature | Android | iOS |
|---------|---------|-----|
| Get Volume | ✅ | ✅ (output only) |
| Set Volume | ✅ | ❌ (system restriction) |
| Mute/Unmute | ✅ | ❌ (system restriction) |
| Get Ringer Mode | ✅ | ⚠️ (limited detection) |
| Set Ringer Mode | ✅ | ❌ (system restriction) |
| Get Bluetooth State | ✅ | ✅ |
| Set Bluetooth | ⚠️ (SDK < 33) | ❌ (opens settings) |
| Get DND State | ✅ | ❌ (no API) |
| Set DND | ✅ | ❌ (system restriction) |

## Installation

### Rust

Add to your `Cargo.toml`:

```toml
[dependencies]
tauri-plugin-system-settings = { path = "../tauri-plugin-system-settings" }
```

### JavaScript/TypeScript

```bash
npm install tauri-plugin-system-settings-api
# or
yarn add tauri-plugin-system-settings-api
```

## Setup

### Tauri Configuration

Add the plugin to your `tauri.conf.json`:

```json
{
  "plugins": {
    "system-settings": {}
  }
}
```

Add permissions in `capabilities/default.json`:

```json
{
  "permissions": [
    "system-settings:default"
  ]
}
```

### Rust (main.rs)

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_system_settings::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Usage

### TypeScript

```typescript
import {
  getVolume,
  setVolume,
  setMute,
  getRingerMode,
  setRingerMode,
  getBluetoothState,
  setBluetooth,
  getDndState,
  setDnd,
} from 'tauri-plugin-system-settings-api';

// Volume control
const volume = await getVolume('media');
console.log(`Volume: ${volume.level * 100}%`);

await setVolume(0.5, 'media', true); // 50% with UI

// Ringer mode
const ringer = await getRingerMode();
await setRingerMode('vibrate');

// Bluetooth
const bt = await getBluetoothState();
if (!bt.enabled) {
  await setBluetooth(true);
}

// Do Not Disturb
const dnd = await getDndState();
if (dnd.hasPermission) {
  await setDnd(true);
}
```

### Volume Streams (Android)

- `media` - Music, video, games
- `ring` - Ringtone
- `alarm` - Alarm clock
- `notification` - Notifications
- `voice` - Voice calls
- `system` - System sounds

### Ringer Modes

- `normal` - Sound enabled
- `vibrate` - Vibrate only
- `silent` - No sound or vibration

## Android Permissions

The plugin automatically declares these permissions in AndroidManifest.xml:

```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_NOTIFICATION_POLICY" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### Runtime Permissions

- **Bluetooth Connect** (Android 12+): Required for Bluetooth control
- **Notification Policy Access**: Required for DND and silent/vibrate ringer modes

## iOS Limitations

Due to Apple's security policies, iOS has significant restrictions:

- **Volume**: Can only read, not set programmatically
- **Ringer/Mute**: No direct API access
- **Bluetooth**: Can only read state; enabling opens Settings
- **DND**: No API access (Focus modes are user-controlled)

## License

MIT
