### Build Tauri (debug)

```bash
# Build habits-cortex (debug, no bundle)
cd habits-cortex && npm run build:debug
```

### Build Tauri (release)

```bash
# Build habits-cortex (release)
cd habits-cortex && npm run build
```

### Run Tauri Dev

```bash
# Run habits-cortex in dev mode
cd habits-cortex && npm run dev
```

### Build Android APK (release)

```bash
# Build APK for habits-cortex (release)
cd habits-cortex && npm run tauri android build -- --split-per-abi -t aarch64 --apk
```

### Build Android APK (debug)

```bash
# Build APK for habits-cortex (debug - separate app on device)
cd habits-cortex && npm run android:build:debug -- --split-per-abi -t aarch64 --apk
```

### Test Habit via CLI

```bash
# Test .habit file via habits-cortex CLI (executes workflow and exits)
./habits-cortex/src-tauri/target/debug/habits-cortex --test --habit {{habitPath}} --workflow {{workflowId}} --input '{{input}}'
```

### Run Habit in App

```bash
# Run .habit file via habits-cortex (opens UI)
./habits-cortex/src-tauri/target/debug/habits-cortex --habit {{habitPath}}
```

### Dev with Habit

```bash
# Run habit in dev mode
cd habits-cortex && npm run dev -- -- -- --habit {{habitPath}}
```

### Stream Android Logs

```bash
# Stream Cortex app logs on Android (live)
adb logcat | grep -iE "codenteam|habits|cortex|tauri|RustStdoutStderr"
```

### Push File to Android

```bash
# Send file to Android device
adb push {{file}} {{dest}}
```

### Clear Cargo Locks

```bash
# Release cargo locks on Android build
rm -rf habits-cortex/src-tauri/target/.cargo-lock; find habits-cortex/src-tauri -name ".cargo-lock" -delete; fuser -k habits-cortex/src-tauri/target/.package-cache; echo "Cargo locks cleared"
```

### iOS Dev (Device)

```bash
# Run iOS dev mode on physical device
cd habits-cortex && npm run ios:dev -- --host
```

### iOS Dev (Simulator)

```bash
# Run iOS dev mode on simulator
cd habits-cortex && npm run ios:dev -- "{{simulator}}"
```

### List iOS Devices

```bash
# List iOS devices
xcrun xctrace list devices
```

### Build iOS (Simulator)

```bash
# Build iOS app for simulator (release, no code signing)
cd habits-cortex && npm run tauri -- ios build --target aarch64-sim
```

### Build iOS (Release)

```bash
# Build iOS app for device (release)
cd habits-cortex && npm run ios:build
```

### Build iOS (Debug)

```bash
# Build iOS app for device (debug)
cd habits-cortex && npm run ios:build:debug
```

### Install iOS App (Simulator)

```bash
# Install and run built iOS app on simulator
xcrun simctl boot "{{simulator}}" || true && open -a Simulator && xcrun simctl install booted habits-cortex/src-tauri/gen/apple/build/arm64-sim/Cortex.app && xcrun simctl launch booted com.codenteam-oss.habits
```

### Publish iOS

```bash
# Publish iOS app
cd habits-cortex && npx env-cmd -f ../.secrets -- npx tsx build-release.ts --platform ios --upload-ios
```

### Publish macOS

```bash
# Build for macOS store submission
npx env-cmd .secrets -- npx tsx habits-cortex/build-release.ts --platform macos --upload-macos
```

### Sign Android APK

```bash
# Sign Android APK with debug keystore
cd habits-cortex && apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --key-pass pass:android {{apkPath}}
```
