## <Icon name="package" /> Exporting for Production

> **Note:** We are deprecating support for `capacitor`, `cordova`, and `electron`. Future releases will rely exclusively on `tauri` for desktop and mobile exports. Please migrate any existing projects to use `tauri` for best support and compatibility.


### If exporting Server-Side or Full-Stack (Recommended: Docker)
- [ ] Stack tested locally and working
- [ ] Export via Base UI: Export → Docker
- [ ] Download `{stackName}-docker.zip`
- [ ] Unzip and run: `docker-compose up -d`

### If exporting Server-Side (Alternative: Single Executable)
- [ ] Stack tested locally and working
- [ ] Export via Base UI → Export tab → Binary
- [ ] Download binary for target platform
- [ ] Run executable on target machine

### If exporting Desktop App (Experimental)
- [ ] Stack tested locally and working
- [ ] Backend URL configured (where app will connect)
- [ ] Choose framework: `tauri` (recommended) or `electron`
- [ ] Choose platform: `windows`, `mac`, `linux`, or `all`
- [ ] Check build tools: `curl http://localhost:3000/habits/base/api/export/binary/support` or in UI
- [ ] For Tauri: Rust, Cargo installed
- [ ] Export via Base UI → Export tab → Desktop
- [ ] If first time: Download scaffold (buildBinary: false)
- [ ] If ready for binary: Enable buildBinary: true
- [ ] Download and test on target platform

### If exporting Mobile App (Experimental)
- [ ] Stack tested locally and working
- [ ] Backend URL configured (must be accessible from mobile device)
- [ ] Choose framework: `tauri` (recommended)
- [ ] Choose target: `ios`, `android`, or `both`
- [ ] Check build tools: `curl http://localhost:3000/habits/base/api/export/binary/support`
  - [ ] For Android: Java, Gradle, Android SDK installed
  - [ ] For iOS: macOS with Xcode installed (iOS builds only work on macOS)
- [ ] Set environment variables:
- [ ] `ANDROID_HOME` or `ANDROID_SDK_ROOT` for Android
- [ ] Export via Base UI → Export tab → Mobile
- [ ] If first time: Download scaffold (buildBinary: false)
- [ ] If ready for binary: Enable buildBinary: true
- [ ] Download APK (Android) or IPA (iOS)
- [ ] Test on real device or emulator

### Troubleshooting: Desktop/Mobile Build Fails
- [ ] Check `mobile` or `desktop` section for missing tools
- [ ] Install missing dependencies
- [ ] Try scaffold export first (buildBinary: false) to verify config
- [ ] Check logs for specific error messages
- [ ] Via API, Run: `curl http://localhost:3000/habits/base/api/export/binary/support`

### Troubleshooting: iOS Build Fails
- [ ] Verify you're on macOS (iOS builds require macOS)
- [ ] Verify Xcode is installed: `xcodebuild -version`
- [ ] Open Xcode at least once to accept license agreements

### Troubleshooting: Android Build Fails
- [ ] Verify `ANDROID_HOME`/`ANDROID_SDK_ROOT` is set
- [ ] Verify Java and Gradle versions are compatible
- [ ] Check compatibility in support endpoint response
- [ ] Install Android SDK build tools if missing
