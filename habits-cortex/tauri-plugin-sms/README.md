# Tauri Plugin SMS

A Tauri v2 plugin for sending and reading SMS messages on mobile devices (Android and iOS).

## Features

- **Send SMS**: Send text messages programmatically
  - Android: Direct sending with permission
  - iOS: Opens native SMS composer for user confirmation
- **Read SMS**: Read SMS messages from the device inbox/sent folder
  - Android only (iOS restricts SMS reading for privacy)
- **Permission Management**: Check and request SMS permissions

## Installation

### Rust

Add the plugin to your `Cargo.toml`:

```toml
[dependencies]
tauri-plugin-sms = { path = "../tauri-plugin-sms" }
```

### JavaScript/TypeScript

Install the JavaScript bindings:

```bash
pnpm add tauri-plugin-sms-api
# or
npm install tauri-plugin-sms-api
```

## Setup

### Register the Plugin

In your Tauri app's `src-tauri/src/lib.rs`:

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sms::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Configure Permissions

In your `tauri.conf.json`, add the plugin permissions:

```json
{
  "plugins": {
    "sms": {
      "permissions": ["allow-send-sms", "allow-read-sms"]
    }
  }
}
```

### Android Configuration

The plugin automatically adds the required permissions to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.SEND_SMS" />
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
```

### iOS Configuration

Add to your `Info.plist`:

```xml
<key>NSMessageSendingUsageDescription</key>
<string>This app needs to send SMS messages</string>
```

## Usage

### TypeScript/JavaScript

```typescript
import {
  sendSms,
  readSms,
  checkPermissions,
  requestPermissions,
} from "tauri-plugin-sms-api";

// Check permissions first
const permissions = await checkPermissions();

if (permissions.sendSms !== "granted") {
  await requestPermissions(["sendSms"]);
}

// Send an SMS
const result = await sendSms({
  phoneNumber: "+1234567890",
  message: "Hello from Tauri!",
});

if (result.success) {
  console.log("SMS sent with ID:", result.messageId);
} else {
  console.error("Failed:", result.error);
}

// Read SMS messages (Android only)
const messages = await readSms({
  limit: 20,
  folder: "inbox",
  unreadOnly: true,
});

console.log(`Found ${messages.totalCount} messages`);

for (const msg of messages.messages) {
  console.log(`From: ${msg.phoneNumber}, Body: ${msg.body}`);
}
```

### Rust

```rust
use tauri_plugin_sms::{SmsExt, SendSmsRequest};

#[tauri::command]
async fn send_message(app: tauri::AppHandle) -> Result<(), String> {
    let request = SendSmsRequest {
        phone_number: "+1234567890".to_string(),
        message: "Hello from Rust!".to_string(),
    };

    let result = app.sms().send_sms(request)
        .map_err(|e| e.to_string())?;

    if result.success {
        println!("SMS sent!");
    }

    Ok(())
}
```

## API Reference

### `sendSms(request: SendSmsRequest): Promise<SendSmsResponse>`

Send an SMS message.

**Request:**

| Field         | Type     | Description                   |
| ------------- | -------- | ----------------------------- |
| `phoneNumber` | `string` | Phone number with country code |
| `message`     | `string` | Message content               |

**Response:**

| Field       | Type      | Description                    |
| ----------- | --------- | ------------------------------ |
| `success`   | `boolean` | Whether the SMS was sent       |
| `messageId` | `string?` | Optional message ID            |
| `error`     | `string?` | Error message if failed        |

### `readSms(request: ReadSmsRequest): Promise<ReadSmsResponse>`

Read SMS messages (Android only).

**Request:**

| Field         | Type      | Description                     |
| ------------- | --------- | ------------------------------- |
| `phoneNumber` | `string?` | Filter by phone number          |
| `limit`       | `number?` | Max messages (default: 50)      |
| `folder`      | `string?` | "inbox", "sent", or "all"       |
| `unreadOnly`  | `boolean?`| Only unread messages            |

**Response:**

| Field        | Type           | Description           |
| ------------ | -------------- | --------------------- |
| `messages`   | `SmsMessage[]` | List of messages      |
| `totalCount` | `number`       | Total matching count  |

### `checkPermissions(): Promise<SmsPermissions>`

Check current SMS permission status.

### `requestPermissions(permissions: string[]): Promise<SmsPermissions>`

Request SMS permissions from the user.

## Platform Differences

| Feature     | Android | iOS |
| ----------- | ------- | --- |
| Send SMS    | ✅ Direct | ✅ Via composer |
| Read SMS    | ✅ | ❌ Not allowed |
| Permissions | Runtime | System |

## License

MIT License - See [LICENSE.md](LICENSE.md) for details.
