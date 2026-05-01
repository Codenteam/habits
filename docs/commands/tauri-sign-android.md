```bash
# Sign Android APK with debug keystore
cd habits-cortex && apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --key-pass pass:android {{apkPath}}
```
