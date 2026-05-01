# Desktop App, Cortex for macOS, Windows & Linux

The **Habits Cortex Desktop App** is a native macOS, Windows, and Linux application built with [Tauri](https://tauri.app). It bundles Cortex so you can run habits fully offline without a terminal or Node.js.

## What it is

| Capability | Description |
|---|---|
| Offline execution | Run habits without internet or a server |
| Native OS integration | Keychain, notifications, system settings |
| Habit library | Browse, import, and run habits from a local library |
| Mirror | Receive habits P2P from another device ([Mirror](/tools/mirror)) |
| Visual runner | Built-in habit viewer and form runner |
| Auto-update | Stays current via GitHub Releases |

## Supported platforms

| Platform | Architecture | Status |
|---|---|---|
| macOS | Apple Silicon (arm64) | Available |
| macOS | Intel (x64) | Available |
| Windows | x64 | Available |
| Linux | x64 | Available |

## Download

→ [Download the Cortex Desktop App](/downloads)

## When to use the Desktop App vs. Cortex Server

| Scenario | Desktop App | Cortex Server |
|---|---|---|
| Running habits on your own machine | ✓ | ✓ |
| Offline / no internet | ✓ | ✓ (self-hosted) |
| Shared team server |, | ✓ |
| CI/CD pipelines |, | ✓ |
| Native OS features (keychain, notifications) | ✓ |, |

## Relation to other tools

| Tool | Relation |
|---|---|
| [Cortex Server](/tools/cortex-server) | Same runtime, packaged as a native app |
| [Mobile App](/tools/mobile-app) | Same Tauri codebase, compiled for iOS/Android |
| [Mirror](/tools/mirror) | Desktop App includes a built-in Mirror receiver |
| [Base](/tools/base) | Design habits in Base, run them in the Desktop App |
