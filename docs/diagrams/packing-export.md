# Packing & Export Diagrams

## Export Modes Overview

```d2
style: {
  fill: transparent
}

direction: down

habit: Habit Configuration {
  link: /intersect/habits/deep-dive/pack-distribute
  style.fill: "#276749"
  style.stroke: "#68d391"
  style.font-color: "#c6f6d5"
  style.stroke-width: 3
  
  stack: stack.yaml {
    style.fill: "#2f855a"
    style.stroke: "#9ae6b4"
    style.font-color: "#c6f6d5"
  }
  
  frontend: Frontend UI {
    style.fill: "#2f855a"
    style.stroke: "#9ae6b4"
    style.font-color: "#c6f6d5"
  }
  
  backend: Backend Logic {
    style.fill: "#2f855a"
    style.stroke: "#9ae6b4"
    style.font-color: "#c6f6d5"
  }
  
  env: Environment (.env) {
    style.fill: "#2f855a"
    style.stroke: "#9ae6b4"
    style.font-color: "#c6f6d5"
  }
}

pack: habits pack {
  style.fill: "#744210"
  style.stroke: "#f6ad55"
  style.font-color: "#fefcbf"
  style.stroke-width: 2
}

modes: Export Modes {
  style.fill: "#1a365d"
  style.stroke: "#63b3ed"
  
  standalone: Standalone Mode {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
    
    label: "Complete App\n(Frontend + Backend)"
  }
  
  frontend_only: Frontend-Only Mode {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
    
    label: "Frontend App\n(Connects to Remote API)"
  }
}

habit -> pack: {
  style.stroke-dash: 3
  style.animated: true
}

pack -> modes.standalone: "Bundle Everything" {
  style.stroke: "#68d391"
  style.stroke-dash: 3
  style.animated: true
}

pack -> modes.frontend_only: "Bundle Frontend Only" {
  style.stroke: "#90cdf4"
  style.stroke-dash: 3
  style.animated: true
}
```

## Standalone Mode (Offline-Capable)

```d2
style: {
  fill: transparent
}

direction: right

input: Habit Configuration {
  style.fill: "#276749"
  style.stroke: "#68d391"
  style.font-color: "#c6f6d5"
  style.stroke-width: 2
  
  yaml: stack.yaml
  ui: Frontend
  logic: Backend/Workflows
  env: .env Variables
}

pack: Pack Process {
  style.fill: "#744210"
  style.stroke: "#f6ad55"
  style.font-color: "#fefcbf"
  
  bundle: Bundle All Code
  embed: Embed Node.js Runtime
  compile: Create Single Binary
}

output: Standalone Binary {
  style.fill: "#553c9a"
  style.stroke: "#b794f4"
  style.font-color: "#e9d8fd"
  style.stroke-width: 3
  
  label: "Single Executable\n./habits"
}

features: Features {
  style.fill: "#2c5282"
  style.stroke: "#90cdf4"
  style.font-color: "#bee3f8"
  
  f1: No Node.js Required {
    shape: hexagon
    style.fill: "#2b6cb0"
    style.stroke: "#63b3ed"
  }
  f2: Works Offline {
    shape: hexagon
    style.fill: "#2b6cb0"
    style.stroke: "#63b3ed"
  }
  f3: Zero External Dependencies {
    shape: hexagon
    style.fill: "#2b6cb0"
    style.stroke: "#63b3ed"
  }
  f4: .env Override Option {
    shape: hexagon
    style.fill: "#2b6cb0"
    style.stroke: "#63b3ed"
  }
}

platforms: Target Platforms {
  style.fill: "#1a365d"
  style.stroke: "#63b3ed"
  
  mac_arm: macOS ARM64 {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
  }
  mac_x64: macOS x64 {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
  }
  linux: Linux x64 {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
  }
  windows: Windows x64 {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
  }
}

input -> pack: {
  style.stroke-dash: 3
  style.animated: true
}

pack -> output: Compile {
  style.stroke-dash: 3
  style.animated: true
}

output -> features: Provides {
  style.stroke: "#68d391"
}

output -> platforms: Cross-Platform {
  style.stroke: "#b794f4"
}
```

## Frontend-Only Mode (API Connected)

```d2
style: {
  fill: transparent
}

direction: right

input: Habit Configuration {
  style.fill: "#276749"
  style.stroke: "#68d391"
  style.font-color: "#c6f6d5"
  style.stroke-width: 2
  
  yaml: stack.yaml
  ui: Frontend Only {
    style.fill: "#48bb78"
    style.stroke: "#9ae6b4"
    style.font-color: "#c6f6d5"
    style.stroke-width: 2
  }
}

pack: Pack Frontend {
  style.fill: "#744210"
  style.stroke: "#f6ad55"
  style.font-color: "#fefcbf"
  
  bundle: Bundle Frontend Assets
  proxy: Configure API Proxy
  wrap: Wrap in Native Shell
}

backend: Remote Backend {
  style.fill: "#553c9a"
  style.stroke: "#b794f4"
  style.font-color: "#e9d8fd"
  icon: https://icons.terrastruct.com/tech%2Fserver.svg
  
  label: "Your Deployed Backend\nhttps://api.example.com"
}

apps: Native Apps {
  style.fill: "#1a365d"
  style.stroke: "#63b3ed"
  
  desktop: Desktop App (Electron) {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
    
    dmg: macOS .dmg
    exe: Windows .exe
    appimage: Linux AppImage
  }
  
  mobile: Mobile App (Cordova) {
    style.fill: "#2c5282"
    style.stroke: "#90cdf4"
    style.font-color: "#bee3f8"
    
    ios: iOS App
    android: Android APK
  }
}

connection: API Connection {
  style.fill: "#744210"
  style.stroke: "#f6ad55"
  style.font-color: "#fefcbf"
  
  label: "Requires Internet\n& Running Backend"
}

input -> pack: {
  style.stroke-dash: 3
  style.animated: true
}

pack -> apps: Generate {
  style.stroke-dash: 3
  style.animated: true
}

apps -> connection: {
  style.stroke: "#f6ad55"
}

connection -> backend: API Calls {
  style.stroke: "#b794f4"
  style.stroke-dash: 3
  style.animated: true
}
```

## Complete Export Decision Flow

```d2
style: {
  fill: transparent
}

direction: down

start: Start Export {
  shape: oval
  style.fill: "#276749"
  style.stroke: "#68d391"
  style.font-color: "#c6f6d5"
}

question1: Need Offline Support? {
  shape: diamond
  style.fill: "#744210"
  style.stroke: "#f6ad55"
  style.font-color: "#fefcbf"
}

question2: Target Platform? {
  shape: diamond
  style.fill: "#744210"
  style.stroke: "#f6ad55"
  style.font-color: "#fefcbf"
}

standalone: single-executable {
  style.fill: "#2c5282"
  style.stroke: "#90cdf4"
  style.font-color: "#bee3f8"
  style.stroke-width: 2
  
  label: "Complete Binary\n(Backend Embedded)"
}

desktop_full: desktop-full {
  style.fill: "#2c5282"
  style.stroke: "#90cdf4"
  style.font-color: "#bee3f8"
  style.stroke-width: 2
  
  label: "Desktop + Backend\n(Early Access)"
}

mobile_full: mobile-full {
  style.fill: "#2c5282"
  style.stroke: "#90cdf4"
  style.font-color: "#bee3f8"
  style.stroke-width: 2
  
  label: "Mobile + Backend\n(Early Access)"
}

question3: Target Platform? {
  shape: diamond
  style.fill: "#744210"
  style.stroke: "#f6ad55"
  style.font-color: "#fefcbf"
}

desktop: desktop {
  style.fill: "#553c9a"
  style.stroke: "#b794f4"
  style.font-color: "#e9d8fd"
  style.stroke-width: 2
  
  label: "Electron Frontend\n(Connects to API)"
}

mobile: mobile {
  style.fill: "#553c9a"
  style.stroke: "#b794f4"
  style.font-color: "#e9d8fd"
  style.stroke-width: 2
  
  label: "Cordova Frontend\n(Connects to API)"
}

deploy_backend: Deploy Backend First {
  shape: parallelogram
  style.fill: "#9b2c2c"
  style.stroke: "#fc8181"
  style.font-color: "#fed7d7"
  
  label: "Backend must be\naccessible via URL"
}

result_offline: Can Run Offline {
  shape: hexagon
  style.fill: "#276749"
  style.stroke: "#68d391"
  style.font-color: "#c6f6d5"
}

result_online: Requires Backend API {
  shape: hexagon
  style.fill: "#9b2c2c"
  style.stroke: "#fc8181"
  style.font-color: "#fed7d7"
}

start -> question1: {
  style.stroke-dash: 3
  style.animated: true
}

question1 -> question2: "Yes" {
  style.stroke: "#68d391"
}

question1 -> question3: "No" {
  style.stroke: "#fc8181"
}

question2 -> standalone: "Server / CLI" {
  style.stroke: "#90cdf4"
}

question2 -> desktop_full: "Desktop" {
  style.stroke: "#90cdf4"
}

question2 -> mobile_full: "Mobile" {
  style.stroke: "#90cdf4"
}

standalone -> result_offline: {
  style.stroke: "#68d391"
}

desktop_full -> result_offline: {
  style.stroke: "#68d391"
}

mobile_full -> result_offline: {
  style.stroke: "#68d391"
}

question3 -> desktop: "Desktop" {
  style.stroke: "#b794f4"
}

question3 -> mobile: "Mobile" {
  style.stroke: "#b794f4"
}

desktop -> deploy_backend: {
  style.stroke: "#fc8181"
}

mobile -> deploy_backend: {
  style.stroke: "#fc8181"
}

deploy_backend -> result_online: {
  style.stroke: "#fc8181"
}
```

## What Gets Packed - Detailed View

```d2
style: {
  fill: transparent
}

direction: right

source: Source Configuration {
  style.fill: "#276749"
  style.stroke: "#68d391"
  style.font-color: "#c6f6d5"
  style.stroke-width: 2
  
  stack: stack.yaml {
    shape: document
    style.fill: "#2f855a"
  }
  
  workflows: Workflows {
    shape: queue
    style.fill: "#2f855a"
  }
  
  modules: Modules (Bits) {
    shape: package
    style.fill: "#2f855a"
  }
  
  frontend: Frontend HTML/JS/CSS {
    shape: page
    style.fill: "#2f855a"
  }
  
  env: Environment Variables {
    shape: cylinder
    style.fill: "#2f855a"
  }
}

standalone_pack: Standalone Pack {
  style.fill: "#2c5282"
  style.stroke: "#90cdf4"
  style.font-color: "#bee3f8"
  style.stroke-width: 3
  
  label: "Everything Bundled"
  
  all: Frontend + Backend + Runtime {
    style.fill: "#2b6cb0"
    style.stroke: "#63b3ed"
  }
}

frontend_pack: Frontend-Only Pack {
  style.fill: "#553c9a"
  style.stroke: "#b794f4"
  style.font-color: "#e9d8fd"
  style.stroke-width: 3
  
  label: "Partial Bundle"
  
  partial: Frontend Only {
    style.fill: "#6b46c1"
    style.stroke: "#d6bcfa"
  }
}

standalone_result: Self-Contained Binary {
  style.fill: "#276749"
  style.stroke: "#68d391"
  style.font-color: "#c6f6d5"
  
  includes: |md
    ✓ Node.js Runtime
    ✓ Server Code
    ✓ Workflow Engine
    ✓ All Modules
    ✓ Frontend Assets
    ✓ Default .env
  |
}

frontend_result: Native App Shell {
  style.fill: "#553c9a"
  style.stroke: "#b794f4"
  style.font-color: "#e9d8fd"
  
  includes: |md
    ✓ Electron/Cordova Shell
    ✓ Frontend Assets
    ✓ API Proxy Config
    ✗ No Backend
    ✗ Needs Remote API
  |
}

source -> standalone_pack: "All Files" {
  style.stroke: "#68d391"
  style.stroke-dash: 3
  style.animated: true
}

source.frontend -> frontend_pack: "Frontend Only" {
  style.stroke: "#b794f4"
  style.stroke-dash: 3
  style.animated: true
}

standalone_pack -> standalone_result: {
  style.stroke-dash: 3
  style.animated: true
}

frontend_pack -> frontend_result: {
  style.stroke-dash: 3
  style.animated: true
}
```
