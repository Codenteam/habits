<!-- This file is auto-generated. Edit packages/manage/forge/src/mcp/commands.ts instead. -->
<!-- Run: pnpm nx generate-commands @ha-bits/manage -->
<!--
<!-- This file is more meant for bots not humans -->
-->

# Habits Commands

## Pack to Bundle
Pack a showcase to cortex-bundle.js
pnpm nx dev habits pack --format bundle --config {{config}}

## Pack to .habit
Pack a showcase to .habit file
pnpm nx run habits pack --format habit --config {{config}}

## Pack with .env
Pack with .env values included (YOU MUST KNOW WHAT YOU ARE DOING!!!)
pnpm nx dev habits pack --format habit --config {{config}} --include-env

## Build Habits
Build Habits
pnpm nx build habits

## Pack Habits
Pack Habits
pnpm nx pack habits

## Publish Habits (latest)
Publish Habits (latest)
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/

## Publish Habits @next
Publish Habits @next
cd packages/habits && npm version patch --no-git-tag-version && cd ../.. && pnpm nx pack habits && cd dist/packages/habits && npm publish --access public --registry https://registry.npmjs.org/ --tag next

## Run Example
Run Example (e.g., hello-world)
pnpm nx cortex habits --config {{config}}

## Pack Showcase App (mobile-full)
Pack Showcase App (interactive, example for mixed showcase)
pnpm tsx packages/habits/app/src/main.ts pack --config {{config}} --format mobile-full --mobile-target {{mobileTarget}} --app-name "{{appName}}" --output {{output}}

## Pack SEA Binary
Pack SEA Binary (single executable)
node dist/packages/habits/app/main.cjs pack --config {{config}} --format single-executable -o {{output}}

## Pack Desktop App
Pack Desktop App (Electron dmg)
node dist/packages/habits/app/main.cjs pack --config {{config}} --format desktop --backend-url {{backendUrl}} --desktop-platform {{desktopPlatform}} -o {{output}}

## Pack Mobile App
Pack Mobile App (Cordova)
node dist/packages/habits/app/main.cjs pack --config {{config}} --format mobile --backend-url {{backendUrl}} --mobile-target {{mobileTarget}} -o {{output}}

## Pack Mobile + Sign
Pack Mobile + Sign (release APK with debug sign)
pnpm tsx packages/habits/app/src/main.ts pack --config {{config}} --format mobile-full --mobile-target {{mobileTarget}}

## Sign APK
Sign APK (with debug keystore)
jarsigner -verbose -keystore ~/.android/debug.keystore -storepass android -keypass android {{apkPath}} androiddebugkey

# Cortex Commands

## Run Cortex Server
Run a habit as server using local @ha-bits/cortex (not the published cortex)
pnpm nx dev @ha-bits/cortex --config {{config}}

## Run .habit File
Run a .habit file directly (portable self-contained package)
pnpm nx dev @ha-bits/cortex --config {{config}}

## Execute Workflow (npx)
Execute a workflow one-shot via npx
npx @ha-bits/cortex execute --config {{config}} --id {{workflowId}} --input '{{input}}'

## Start Server (npx)
Start cortex server via npx
npx @ha-bits/cortex server --config {{config}} --port {{port}}

## Execute Workflow (POST)
Execute workflow via POST
curl -X POST http://localhost:{{port}}/api/{{workflowId}} -H "Content-Type: application/json" -d '{{input}}'

## Execute Workflow (GET)
Execute workflow via GET
curl "http://localhost:{{port}}/api/{{workflowId}}?{{queryParams}}"

## List Workflows
List workflows
curl http://localhost:{{port}}/misc/workflows

## Build Cortex
Build Cortex
pnpm nx build @ha-bits/cortex

## Publish Cortex
Publish Cortex
cd packages/cortex/server && npm version patch --no-git-tag-version && cd ../ui && npm version patch --no-git-tag-version && cd ../../.. && pnpm nx pack @ha-bits/cortex && cd dist/packages/cortex && npm publish --registry https://registry.npmjs.org/

## Link Cortex Core
Link Cortex Core (npm link from dist)
cd dist/packages/cortex/core && npm link

## Unlink Cortex Core
Unlink Cortex Core
npm unlink -g @ha-bits/cortex-core

# Base Commands

## Build Base
Build Base
pnpm nx build @ha-bits/base

## Publish Base
Publish Base
cd packages/base/server && npm version patch --no-git-tag-version && cd ../ui && npm version patch --no-git-tag-version && cd ../../.. && pnpm nx pack @ha-bits/base && cd dist/packages/base && npm publish --registry https://registry.npmjs.org/

## Dev Base
Dev Base
pnpm nx dev @ha-bits/base

# Bits Commands

## Build One Bit
Build One Bit (e.g., bit-example)
pnpm nx build @ha-bits/{{bitName}}

## Publish Bit to Verdaccio
Publish Bits to Verdaccio (local registry)
pnpm nx publish-verdaccio @ha-bits/{{bitName}}

## Publish Bit to npm
Publish Bits to npm
cd nodes/bits/@ha-bits/{{bitName}} && npm version patch --no-git-tag-version && cd ../../../../.. && pnpm nx build @ha-bits/{{bitName}} && cd nodes/bits/@ha-bits/{{bitName}} && npm publish --access public --registry https://registry.npmjs.org/

## Bits Converter CLI
Bits Converter CLI
npx tsx bits-creator/src/cli.ts

## Bits Creator Server (AI)
Bits Creator Server (AI mode)
npx tsx bits-creator/server/src/main.ts

## Bits Creator Server (Mock)
Bits Creator Server (Mock)
MOCK_MODE=true npx tsx bits-creator/server/src/main.ts

# General Commands

## Build All
Build All (habits + cortex + base)
pnpm nx build habits && pnpm nx build @ha-bits/cortex && pnpm nx build @ha-bits/base

## Pack All
Pack All (habits + cortex + base)
pnpm nx pack habits && pnpm nx pack @ha-bits/cortex && pnpm nx pack @ha-bits/base

## NPM Login
NPM Login
npm login --registry https://registry.npmjs.org/

## NPM Whoami
NPM Whoami
npm whoami --registry https://registry.npmjs.org/

## Clean All
Clean All (dist + cache)
rm -rf dist && pnpm nx reset

## Clean Dist
Clean Dist
rm -rf dist

## Kill Port 3000
Kill Port 3000
lsof -ti:{{port}} | xargs kill -9 2>/dev/null || echo "No process"

## Link Local
Link cortex into bits, link All Bits into habits, etc
npx tsx scripts/link-local.cts

## Unlink Local
Unlink
npx tsx scripts/link-local.cts --unlink

# Testing Commands

## Run Unit Tests
Run Unit Tests
pnpm jest

## Run HTTP Tests
Run HTTP Tests with httpyac
httpyac http/cortex-tests.http --all

## Typecheck All
Typecheck All
pnpm nx run-many --target=typecheck

## Test Habit
Run habit tests on a showcase
pnpm nx test-habit @ha-bits/manage --path={{path}}

## Test WebDriver
Run WebDriver E2E tests
npx tsx packages/testing/src/cli/index.ts webdriver {{testFile}} --platform {{platform}}

## Test Bit (Node.js)
Test a single bit action in Node.js — smallest possible command. No build required.
npx tsx scripts/test-bit.ts {{bit}} {{action}} '{{input}}' --expected '{{expected}}'

## Test Bit (Tauri)
Test a single bit action in Tauri via WebDriver. Add --headless --habit <path> to auto-launch and kill the app.
npx tsx scripts/test-bit-tauri.ts {{bit}} {{action}} '{{input}}' --expected '{{expected}}'

## Test Bit (Tauri Headless)
Test a single bit action in Tauri — auto-launches the app, runs the test, then kills it. One-shot, no manual steps.
npx tsx scripts/test-bit-tauri.ts --headless --habit {{habitPath}} {{bit}} {{action}} '{{input}}' --expected '{{expected}}'

## Test Bit (Cross-Platform)
Test a single bit action across Node.js and Tauri via the built CLI. Requires pnpm nx build @ha-bits/manage first.
node dist/packages/manage/cli/index.js bit-platform {{bit}} {{action}} --input='{{input}}' --expected='{{expected}}'

# Habits-Cortex Tauri App Commands

## Build Tauri (debug)
Build habits-cortex (debug, no bundle)
cd habits-cortex && npm run build:debug

## Build Tauri (release)
Build habits-cortex (release)
cd habits-cortex && npm run build

## Run Tauri Dev
Run habits-cortex in dev mode
cd habits-cortex && npm run dev

## Build Android APK (release)
Build APK for habits-cortex (release)
cd habits-cortex && npm run tauri android build -- --split-per-abi -t aarch64 --apk

## Build Android APK (debug)
Build APK for habits-cortex (debug - separate app on device)
cd habits-cortex && npm run android:build:debug -- --split-per-abi -t aarch64 --apk

## Test Habit via CLI
Test .habit file via habits-cortex CLI (executes workflow and exits)
./habits-cortex/src-tauri/target/debug/habits-cortex --test --habit {{habitPath}} --workflow {{workflowId}} --input '{{input}}'

## Run Habit in App
Run .habit file via habits-cortex (opens UI)
./habits-cortex/src-tauri/target/debug/habits-cortex --habit {{habitPath}}

## Dev with Habit
Run habit in dev mode
cd habits-cortex && npm run dev -- -- -- --habit {{habitPath}}

## Stream Android Logs
Stream Cortex app logs on Android (live)
adb logcat | grep -iE "codenteam|habits|cortex|tauri|RustStdoutStderr"

## Push File to Android
Send file to Android device
adb push {{file}} {{dest}}

## Clear Cargo Locks
Release cargo locks on Android build
rm -rf habits-cortex/src-tauri/target/.cargo-lock; find habits-cortex/src-tauri -name ".cargo-lock" -delete; fuser -k habits-cortex/src-tauri/target/.package-cache; echo "Cargo locks cleared"

## iOS Dev (Device)
Run iOS dev mode on physical device
cd habits-cortex && npm run ios:dev -- --host

## iOS Dev (Simulator)
Run iOS dev mode on simulator
cd habits-cortex && npm run ios:dev -- "{{simulator}}"

## List iOS Devices
List iOS devices
xcrun xctrace list devices

## Build iOS (Simulator)
Build iOS app for simulator (release, no code signing)
cd habits-cortex && npm run tauri -- ios build --target aarch64-sim

## Build iOS (Release)
Build iOS app for device (release)
cd habits-cortex && npm run ios:build

## Build iOS (Debug)
Build iOS app for device (debug)
cd habits-cortex && npm run ios:build:debug

## Install iOS App (Simulator)
Install and run built iOS app on simulator
xcrun simctl boot "{{simulator}}" || true && open -a Simulator && xcrun simctl install booted habits-cortex/src-tauri/gen/apple/build/arm64-sim/Cortex.app && xcrun simctl launch booted com.codenteam-oss.habits

## Publish iOS
Publish iOS app
cd habits-cortex && npx env-cmd -f ../.secrets -- npx tsx build-release.ts --platform ios --upload-ios

## Publish macOS
Build for macOS store submission
npx env-cmd .secrets -- npx tsx habits-cortex/build-release.ts --platform macos --upload-macos

## Sign Android APK
Sign Android APK with debug keystore
cd habits-cortex && apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --key-pass pass:android {{apkPath}}

# Docs Commands

## Deploy Docs
Deploy documentation
npx env-cmd -f .secrets -- npx tsx scripts/deploy-docs.ts

## Start Docs Server
Start the VitePress docs server on port 5173
pnpm dev

# Screenshots Commands

## Generate Store Screenshots
Capture and process Tauri app store screenshots (automate + frame)
npx tsx packages/manage/forge/run-all.cts

## Generate Docs Screenshots
Capture Base, Cortex, Admin screenshots for the docs site
npx tsx packages/manage/forge/generate-docs-screenshots.ts {{extra}}

## Generate Get-Started Screenshots
Capture all "Get Started" screenshots used in the landing page
npx tsx packages/manage/forge/generate-get-started-shots.ts {{extra}}

## Start Base Server
Start the Base UI server on port 3000
pnpm nx dev @ha-bits/base

## Start Cortex Server
Start a Cortex server with a given config
pnpm nx dev @ha-bits/cortex --config {{config}}

## Start Tauri Dev (webdriver)
Start habits-cortex in dev mode (exposes webdriver on port 9987)
cd habits-cortex && npm run dev

## Screenshot Webpage
Take a screenshot of any URL and save as .webp
npx tsx packages/manage/forge/src/screenshots/cli.ts webpage --url {{url}} --out {{out}}

## Screenshot HTML Template
Render a local HTML template and save as .webp
npx tsx packages/manage/forge/src/screenshots/cli.ts template --path {{path}} --out {{out}}

## Screenshot Code Snippet
Render a code snippet with syntax highlighting and save as .webp
npx tsx packages/manage/forge/src/screenshots/cli.ts code-snippet --lang {{lang}} --code {{code}} --out {{out}}

## Screenshot Store Listing
Screenshot an app store listing page (e.g. Google Play) and save as .webp
npx tsx packages/manage/forge/src/screenshots/cli.ts store-listing --url {{url}} --out {{out}}

## Start Admin Server
Start the Admin server on port 3099
node packages/manage/admin/dist/server/index.js

## Build Admin
Build the Admin app (TypeScript + Tailwind CSS)
cd packages/manage/admin && npm run build

## Build Admin Docker Image
Build Admin dist then rebuild the Docker image (habits-admin:latest)
cd packages/manage/admin && npm run build && docker build -t habits-admin:latest .

## Restart Admin Docker
Restart the Admin Docker container (build image then restart compose)
cd packages/manage/admin && npm run build && docker build -t habits-admin:latest . && docker compose up -d --force-recreate

## Update Admin in Docker
Build admin dist, copy files into the running container, then restart it (no image rebuild), this is much more prefered to be used with local dev
cd packages/manage/admin && npm run build && docker cp dist/. habits-admin:/app/dist && docker restart habits-admin

## Deploy Admin to Docker Context
Switch to a remote Docker context, build the Admin image, restart the container, then revert back to default
docker build --context {{context}} -t habits-admin:latest packages/manage/admin && docker --context {{context}} compose -f packages/manage/admin/compose.yaml up -d --force-recreate
