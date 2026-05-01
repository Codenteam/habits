```bash
# Release cargo locks on Android build
rm -rf habits-cortex/src-tauri/target/.cargo-lock; find habits-cortex/src-tauri -name ".cargo-lock" -delete; fuser -k habits-cortex/src-tauri/target/.package-cache; echo "Cargo locks cleared"
```
