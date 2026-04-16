<!-- This file is more meant for bots not humans -->

# Habits Commands

# Pack hello-world to cortex-bundle.js
pnpm nx dev habits pack --format bundle --config showcase/hello-world/stack.yaml

# Pack hello-world to .habit file
pnpm nx run habits pack --format habit --config showcase/hello-world/stack.yaml 

# Pack marketing-campaign to .habit file
pnpm nx run habits pack --format habit --config showcase/marketing-campaign/stack.yaml


# Pack with .env values included (YOU MUST KNOW WHAT YOU ARE DOING!!!)
pnpm nx dev habits pack --format habit --config showcase/marketing-campaign/stack.yaml --include-env

# Run a habit as server using local @ha-bits/cortex (not the published cortex)
pnpm nx dev @ha-bits/cortex --config showcase/hello-world/stack.yaml

# Run a .habit file directly (portable self-contained package)
pnpm nx dev @ha-bits/cortex --config showcase/hello-world/dist/hello-world.habit

# Run a .habit file with external .env override (place .env beside the .habit file)
# The external .env will merge with/override any embedded .env in the .habit file
pnpm nx dev @ha-bits/cortex --config /path/to/example.habit

# Build Habits
pnpm nx build habits

# Pack Habits
pnpm nx pack habits

# Publish Habits (latest)
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/

# Publish Habits @next
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/ --tag next

# Run Example (e.g., hello-world)
pnpm nx cortex habits --config showcase/hello-world/stack.yaml

# Dev Cortex (mixed/stack.yaml)
pnpm nx cortex habits --config showcase/hello-world/stack.yaml

# Pack Showcase App (interactive, example for mixed showcase)
pnpm tsx packages/habits/app/src/main.ts pack --config showcase/hello-world/stack.yaml --format mobile-full --mobile-target android --app-name "Mixed App" --output /tmp/mixed-app.apk

# Pack SEA Binary (single executable)
node dist/packages/habits/app/main.cjs pack --config showcase/hello-world/stack.yaml --format single-executable -o /tmp/habits-sea

# Pack Desktop App (Electron dmg)
node dist/packages/habits/app/main.cjs pack --config showcase/hello-world/stack.yaml --format desktop --backend-url http://localhost:3000 --desktop-platform dmg -o /tmp/habits-desktop

# Pack Mobile App (Cordova android)
node dist/packages/habits/app/main.cjs pack --config showcase/hello-world/stack.yaml --format mobile --backend-url http://localhost:3000 --mobile-target android -o /tmp/habits-mobile

# Pack Mobile + Sign (release APK with debug sign)
pnpm tsx packages/habits/app/src/main.ts pack --config showcase/hello-world/stack.yaml --format mobile-full --mobile-target android

# Sign APK (with debug keystore)
jarsigner -verbose -keystore ~/.android/debug.keystore -storepass android -keypass android /tmp/habits-mobile.apk androiddebugkey

# Cortex Commands

## Running .habit Files with Cortex

Cortex can run `.habit` files in two modes: **execute** (one-shot) and **server** (HTTP API).

### Using npx (Published Package)
```bash
# Execute a workflow (one-shot)
npx @ha-bits/cortex execute --config ./hello-world.habit --id hello-world --input '{"param1": "hello"}'

# Start server
npx @ha-bits/cortex server --config ./hello-world.habit --port 3000
```

### Using nx (Workspace Development)
```bash
# Run server via nx (uses local @ha-bits/cortex)
pnpm nx dev @ha-bits/cortex --config showcase/hello-world/stack.yaml

# Run .habit file via nx
pnpm nx dev @ha-bits/cortex --config showcase/hello-world/dist/hello-world.habit
```

### Example API Calls (Server Mode)
```bash
# Execute workflow via POST
curl -X POST http://localhost:3000/api/hello-world \
  -H "Content-Type: application/json" \
  -d '{"param1": "hello", "param2": "world"}'

# Execute workflow via GET
curl "http://localhost:3000/api/hello-world?param1=hello&param2=world"

# List workflows
curl http://localhost:3000/misc/workflows
```

## Build Cortex
pnpm nx build @ha-bits/cortex

# Publish Cortex
cd packages/cortex/server && npm version patch --no-git-tag-version && cd ../ui && npm version patch --no-git-tag-version && cd ../../.. && pnpm nx pack @ha-bits/cortex && cd dist/packages/cortex && npm publish --registry https://registry.npmjs.org/

# Link Cortex Core (npm link from dist)
cd dist/packages/cortex/core && npm link

# Unlink Cortex Core
npm unlink -g @ha-bits/cortex-core

# Base Commands

# Build Base
pnpm nx build @ha-bits/base

# Publish Base
cd packages/base/server && npm version patch --no-git-tag-version && cd ../ui && npm version patch --no-git-tag-version && cd ../../.. && pnpm nx pack @ha-bits/base && cd dist/packages/base && npm publish --registry https://registry.npmjs.org/

# Dev Base
pnpm nx dev @ha-bits/base

# Bits Commands

# Build All Bits
# Builds all bits in nodes/bits/@ha-bits/bit-*

# Build One Bit (e.g., bit-example)
pnpm nx build @ha-bits/bit-example

# Publish Bits to Verdaccio (local registry)
pnpm nx publish-verdaccio @ha-bits/bit-example

# Publish Bits to npm
cd nodes/bits/@ha-bits/bit-example && npm version patch --no-git-tag-version && cd ../../../../.. && pnpm nx build @ha-bits/bit-example && cd nodes/bits/@ha-bits/bit-example && npm publish --access public --registry https://registry.npmjs.org/

# Link All Bits
# Links all bits globally via npm link

# Unlink All Bits
# Unlinks all bits globally

# List Bits
# Lists all available bits with versions

# Bits Converter CLI
npx tsx bits-creator/src/cli.ts

# Bits Creator Server (AI mode)
npx tsx bits-creator/server/src/main.ts

# Bits Creator Server (Mock)
MOCK_MODE=true npx tsx bits-creator/server/src/main.ts

# General Commands

# Build All (habits + cortex + base)
pnpm nx build habits && pnpm nx build @ha-bits/cortex && pnpm nx build @ha-bits/base

# Pack All (habits + cortex + base)
pnpm nx pack habits && pnpm nx pack @ha-bits/cortex && pnpm nx pack @ha-bits/base

# Publish All (habits + cortex + base)
# Note: This bumps versions, packs, and publishes to npm
npm version patch --no-git-tag-version && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/  # Repeat for cortex and base

# Publish All @next (pre-release)
# Similar to above but with --tag next

# NPM Login
npm login --registry https://registry.npmjs.org/

# NPM Whoami
npm whoami --registry https://registry.npmjs.org/

# Clean All (dist + cache)
rm -rf dist && pnpm nx reset

# Clean Dist
rm -rf dist

# Kill Port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "No process"

# List Examples
# This lists all available examples in showcase/

# Link cortex into bits, link All Bits into habits, etc
npx tsx scripts/link-local.cts

# Unlink
npx tsx scripts/link-local.cts --unlink

# Testing Commands

# Run Unit Tests
pnpm jest

# Run HTTP Tests
httpyac http/cortex-tests.http --all

# Typecheck All
pnpm nx run-many --target=typecheck



# Habits-Cortex Tauri App Commands

## Build Variants
Different bundle identifiers for dev/debug/release to coexist on same device:
- **Dev** (com.codenteam-oss.habits.dev) - "Cortex Dev" - hot reload
- **Debug** (com.codenteam-oss.habits.debug) - "Cortex Debug" - debug symbols
- **Release** (com.codenteam-oss.habits) - "Cortex" - production

### iOS Provisioning Setup (for debug/dev builds)
To install dev/debug builds on iOS devices, register a wildcard App ID in Apple Developer:
1. Go to https://developer.apple.com/account/resources/identifiers
2. Click "+" to add new identifier → App IDs → App
3. Description: "Habits Wildcard", Bundle ID: Wildcard, enter `com.codenteam-oss.habits.*`
4. Xcode will auto-create provisioning profiles for `.dev` and `.debug` variants

## Build habits-cortex (debug, no bundle)
cd habits-cortex && npm run build:debug

## Build habits-cortex (release)
cd habits-cortex && npm run build

## Run habits-cortex in dev mode
cd habits-cortex && npm run dev

## Build apk for habits-cortex (release)
cd habits-cortex && npm run tauri android build -- --split-per-abi -t aarch64 --apk

## Build apk for habits-cortex (debug - separate app on device)
cd habits-cortex && npm run android:build:debug -- --split-per-abi -t aarch64 --apk

## Test .habit file via habits-cortex CLI (executes workflow and exits)
./habits-cortex/src-tauri/target/debug/habits-cortex --test --habit showcase/hello-world/dist/hello-world.habit --workflow hello-world --input '{"param1":"hello","param2":"world"}'

## Run .habit file via habits-cortex (opens UI)
./habits-cortex/src-tauri/target/debug/habits-cortex --habit showcase/hello-world/dist/hello-world.habit

## Build a .habit,  run the .habit into the  app in dev mode.
pnpm nx run habits pack --format habit --config showcase/email-demo/stack.yaml

npm run dev -- -- -- --habit showcase/email-demo/dist/email-demo.habit

## Android Commands
### release the lock
rm -rf habits-cortex/src-tauri/target/.cargo-lock; find habits-cortex/src-tauri -name ".cargo-lock" -delete; fuser -k habits-cortex/src-tauri/target/.package-cache; echo "Cargo locks cleared"


### Send file to android, preferable Downloads/Habits
adb push <file> <dest>

### Stream Cortex app logs on Android (live)
adb logcat | grep -iE "codenteam|habits|cortex|tauri|RustStdoutStderr"


## iOS Commands

## Run iOS dev mode on physical device (Cortex Dev - separate app)
cd habits-cortex && npm run ios:dev -- --host

## Run iOS dev mode on simulator
cd habits-cortex && npm run ios:dev -- "iPhone 17 Pro"

## List ios devices:

xcrun xctrace list devices


## Build iOS app for simulator (release, no code signing needed)
cd habits-cortex && npm run tauri -- ios build --target aarch64-sim

## Build iOS app for device (release - Cortex)
cd habits-cortex && npm run ios:build

## Build iOS app for device (debug - Cortex Debug - separate app)
cd habits-cortex && npm run ios:build:debug

## Install and run built iOS app on simulator
xcrun simctl boot "iPhone 17 Pro" || true
open -a Simulator
xcrun simctl install booted habits-cortex/src-tauri/gen/apple/build/arm64-sim/Cortex.app
xcrun simctl launch booted com.codenteam-oss.habits


## Publish 
cd habits-cortex
npx env-cmd -f ../.secrets -- npx tsx build-release.ts --platform ios --upload-ios



## Run app
cd habits-cortex
npm run dev

## Sign android apk
apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --key-pass pass:android --out src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-signed.apk src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk

apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --key-pass pass:android src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release-unsigned.apk


npx tsx packages/base/server/src/pack/inline-html.ts

npx tsx scripts/generate-showcase.ts




# SIGN - NOTARIZE - Submit

## To build for macos store submission
npx env-cmd .secrets -- npx tsx habits-cortex/build-release.ts --platform macos --upload-macos





# Testing

## habits-test CLI
The testing CLI can be run from source (local dev) or via npx (when published):
```bash
# Local development (from workspace root)
npx tsx packages/testing/src/cli/index.ts <command> [options]

# After @ha-bits/manage is published
npx habits-test <command> [options]
```

## List all available tests
npx tsx packages/testing/src/cli/index.ts list

## Run Habit Tests (workflow tests)
npx tsx packages/testing/src/cli/index.ts habit packages/testing/tests/habits/hello-world/workflow.test.yaml

## Run Habit Tests (backend only - cortex mode)
npx tsx packages/testing/src/cli/index.ts habit showcase/hello-world/stack.yaml --mode cortex

## WebDriver E2E Tests (tauri-plugin-webdriver)
Tests the habits-cortex Tauri app via embedded WebDriver server on port 4445.

### Test on macOS
npx tsx packages/testing/src/cli/index.ts webdriver packages/testing/tests/habits/hello-world/webdriver.test.cts --platform mac

### Test on iOS Simulator
npx tsx packages/testing/src/cli/index.ts webdriver packages/testing/tests/habits/hello-world/webdriver.test.cts --platform ios

### Test on Android Emulator
npx tsx packages/testing/src/cli/index.ts webdriver packages/testing/tests/habits/hello-world/webdriver.test.cts --platform android

### Test with verbose output
npx tsx packages/testing/src/cli/index.ts webdriver packages/testing/tests/habits/hello-world/webdriver.test.cts --platform mac --verbose

### Notes:
- macOS: Requires debug build (`cd habits-cortex/src-tauri && cargo build`)
- iOS: Requires booted simulator with app installed
- Android: Requires running emulator/device with app installed, uses ADB port forwarding
- The WebDriver plugin creates a separate webview - workflow tests use HTTP calls to cortex server


# Docs

To deploy docs:
npx env-cmd -f .secrets -- npx tsx scripts/deploy-docs.ts