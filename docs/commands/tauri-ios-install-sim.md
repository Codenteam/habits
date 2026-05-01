```bash
# Install and run built iOS app on simulator
xcrun simctl boot "{{simulator}}" || true && open -a Simulator && xcrun simctl install booted habits-cortex/src-tauri/gen/apple/build/arm64-sim/Cortex.app && xcrun simctl launch booted com.codenteam-oss.habits
```
