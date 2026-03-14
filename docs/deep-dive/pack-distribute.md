# Binary Export

Export your habits as standalone applications: server binaries, desktop apps, or mobile apps.

## Overview

The Pack feature allows you to package your habits configuration into distributable formats:

- **Single Executable** - Standalone server binary
- **Desktop** - Electron desktop application
- **Mobile** - Cordova mobile application (iOS/Android)

## Pack Formats

| Format | Description | Backend | Status |
|--------|-------------|---------|--------|
| `single-executable` | Node.js Full-stack Binary | Embedded | <Icon name="check-circle" /> Available |
| `desktop` | Electron app | Remote URL | <Icon name="check-circle" /> Available |
| `desktop-full` | Electron with embedded backend | Embedded | <Icon name="wrench" /> Early Access |
| `mobile` | Cordova app | Remote URL | <Icon name="check-circle" /> Available |
| `mobile-full` | Mobile with embedded backend | Embedded | <Icon name="wrench" /> Early Access |

---

## Single Executable (Server Binary)

Package your entire habits configuration into a single executable file that can run without Node.js installed.


### Using the Base UI

1. Open the **Export/Deploy** modal in Habits Base UI
2. Navigate to the **Binary** tab
3. Select your target platform
4. Click **Generate Standalone Binary**
5. The binary will download automatically

![Binary Export UI](/images/export.webp)


### Using the CLI

```bash
# Generate binary for current platform
npx habits pack --config ./stack.yaml --format single-executable --output ./my-app

# Generate binary for a specific platform
npx habits pack --config ./stack.yaml --format single-executable --output ./my-app --platform linux-x64
```

**CLI Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--config` | Path to stack.yaml configuration | Required |
| `--output` | Output path for the binary | Required |
| `--platform` | Target platform | `current` |

**Supported `--platform` values:** `darwin-arm64`, `darwin-x64`, `linux-x64`, `win32-x64`, `current`

### Features

- **Standalone execution** - No Node.js installation required
- **Embedded configuration** - All habits, stack.yaml, and .env bundled inside
- **Environment override** - Place a `.env` file beside the binary to override bundled settings
- **Cross-platform** - Supports macOS (ARM64, x64), Linux (x64), and Windows (x64)

### Environment Override

The binary checks for a `.env` file in the same directory. If found, those values override the bundled environment variables:

```bash
# Run the binary
./habits

# Or with a local .env override
echo "PORT=8080" > .env
./habits  # Now runs on port 8080
```

### Supported Platforms

| Platform | Architecture | Binary Name |
|----------|--------------|-------------|
| macOS | ARM64 | `habits` |
| macOS | x64 | `habits` |
| Linux | x64 | `habits` |
| Windows | x64 | `habits.exe` |

---

## Desktop (Electron)

Package your habits frontend as a desktop application that connects to a remote backend.

### Using the CLI

```bash
# Generate desktop app for all platforms
npx habits pack --config ./stack.yaml --format desktop --backend-url https://api.example.com --output ./my-desktop-app

# Generate for a specific platform
npx habits pack --config ./stack.yaml --format desktop --backend-url https://api.example.com --desktop-platform dmg --output ./my-app.dmg
```

**CLI Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--config` | Path to stack.yaml configuration | Required |
| `--format` | Must be `desktop` | Required |
| `--backend-url` | URL of your deployed backend API | Required |
| `--desktop-platform` | Target desktop platform | `all` |
| `--output` | Output path for the app | Auto-generated |

**Supported `--desktop-platform` values:**

| Value | Description |
|-------|-------------|
| `dmg` | macOS disk image |
| `exe` | Windows executable installer |
| `appimage` | Linux AppImage |
| `deb` | Debian/Ubuntu package |
| `rpm` | Red Hat/Fedora package |
| `msi` | Windows MSI installer |
| `all` | All platforms |

### Features

- **Native desktop app** - Runs as a proper desktop application with system integration
- **API proxy** - All API calls automatically routed to your backend URL
- **Cross-platform** - Build for macOS, Windows, and Linux from a single codebase

### Requirements

- Node.js 20+
- Your frontend must be defined in `stack.yaml` under `server.frontend`
- Backend must be deployed and accessible at the provided URL

---

## Mobile (Cordova)

Package your habits frontend as a mobile application for iOS and Android.

### Using the CLI

```bash
# Generate mobile app for both iOS and Android
npx habits pack --config ./stack.yaml --format mobile --backend-url https://api.example.com --output ./my-mobile-app

# Generate for iOS only
npx habits pack --config ./stack.yaml --format mobile --backend-url https://api.example.com --mobile-target ios --output ./my-ios-app

# Generate for Android only
npx habits pack --config ./stack.yaml --format mobile --backend-url https://api.example.com --mobile-target android --output ./my-android-app
```

**CLI Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--config` | Path to stack.yaml configuration | Required |
| `--format` | Must be `mobile` | Required |
| `--backend-url` | URL of your deployed backend API | Required |
| `--mobile-target` | Target mobile platform | `both` |
| `--output` | Output path for the app | Auto-generated |

**Supported `--mobile-target` values:**

| Value | Description |
|-------|-------------|
| `ios` | iOS app (requires macOS with Xcode) |
| `android` | Android app (requires Android SDK) |
| `both` | Both iOS and Android |

### Features

- **Native mobile app** - Proper mobile application with native capabilities
- **API proxy** - All API calls automatically routed to your backend URL
- **Cross-platform** - Build for iOS and Android from the same frontend

### Requirements

- Node.js 20+
- **iOS:** macOS with Xcode installed
- **Android:** Android SDK and build tools
- Your frontend must be defined in `stack.yaml` under `server.frontend`
- Backend must be deployed and accessible at the provided URL

---

## Early Access

### Desktop Full (`desktop-full`)

Full Electron application with the backend embedded, enabling completely offline operation.

```bash
# Early Access
npx habits pack --config ./stack.yaml --format desktop-full --output ./my-offline-app
```

### Mobile Full (`mobile-full`)

Full mobile application with the backend embedded, enabling completely offline operation.

```bash
# Early Access
npx habits pack --config ./stack.yaml --format mobile-full --mobile-target android --output ./my-offline-app
```

---

## General Requirements

- Node.js 20+ (for generation only)
- Signing of packages isn't included
