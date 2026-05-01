```bash
# Sign APK (with debug keystore)
jarsigner -verbose -keystore ~/.android/debug.keystore -storepass android -keypass android {{apkPath}} androiddebugkey
```
