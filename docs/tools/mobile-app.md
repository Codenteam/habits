# Mobile App, Cortex for iOS & Android

The **Habits Cortex Mobile App** is a native iOS and Android application built with [Tauri](https://tauri.app). It runs Cortex on-device, with access to hardware capabilities unavailable on a server.

## What it is

| Capability | Description |
|---|---|
| On-device execution | Habits run on the phone, no server required |
| Device bits | WiFi scan, SMS send, location, system settings |
| Offline support | Queue and run habits with no connectivity |
| Mirror | Receive habits via P2P from another device ([Mirror](/tools/mirror)) |
| Local AI | Run `bit-local-ai` models on-device (via LiteRT) |
| Secure storage | Keychain integration for credentials |

## Supported platforms

| Platform | Status |
|---|---|
| Android | Available |
| iOS | Available |

## Device-exclusive bits

These bits only work on the Mobile App (and Desktop App where applicable):

| Bit | Capability |
|---|---|
| `bit-wifi` | Scan nearby networks, connect/disconnect |
| `bit-sms` | Send SMS messages |
| `bit-location` | GPS coordinates, geofencing |
| `bit-system-settings` | Read/write device settings |
| `bit-local-ai` | Run LLMs on-device with LiteRT |
| `bit-smart-home` | Matter protocol for smart home control |

## Download

→ [Download the Cortex Mobile App](/downloads)

## When to use the Mobile App vs. Cortex Server

| Scenario | Mobile App | Cortex Server |
|---|---|---|
| Device sensors (GPS, WiFi, SMS) | ✓ |, |
| Offline / field use | ✓ |, |
| Local AI (no cloud) | ✓ | ✓ (with GPU server) |
| Team-shared workflows |, | ✓ |
| Webhook / HTTP triggers | ✓ | ✓ |

## Relation to other tools

| Tool | Relation |
|---|---|
| [Desktop App](/tools/desktop-app) | Same Tauri codebase, compiled for mobile targets |
| [Cortex Server](/tools/cortex-server) | Server equivalent, no device features |
| [Mirror](/tools/mirror) | Mobile App includes a built-in Mirror receiver |
| [Base](/tools/base) | Design habits in Base, deploy to the Mobile App |
