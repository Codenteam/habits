```bash
# Publish iOS app
cd habits-cortex && npx env-cmd -f ../.secrets -- npx tsx build-release.ts --platform ios --upload-ios
```
