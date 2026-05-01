# Desktop App

**Goal:** Run and manage habits from a native desktop app on macOS, Windows, or Linux, with offline capability, deep OS integration (keychain, notifications, WiFi, system settings), and no browser required.

The **Habits desktop app** is built with Tauri, which means it's a real native application: it installs to your Applications folder, launches instantly, uses native OS dialogs, and can access capabilities that a web browser cannot, including the system keychain, local network interfaces, and background system services.

## What you'll end up with

- A native desktop application for your OS with a standalone window
- Full node canvas (same as Habits Base) built into the app, design, run, and test habits without opening a terminal
- Offline operation, habits run on your machine without any network connection
- OS integrations: keychain for secure credential storage, system notifications, WiFi management
- A habit library on your machine, install, update, and remove habits from a single place

## Tools used

| Tool | Role |
|---|---|
| Desktop App | Native Tauri app that embeds Base + Cortex runtime |
| [Cortex Server](/tools/cortex-server) | The same runtime embedded in the app |
| [Base](/tools/base) | The visual canvas, also embedded, no separate process needed |
| [Mirror](/tools/mirror) | Transfer habits to/from the desktop app over P2P |

## Step 1, Download and install

![Download page, macOS, Windows, Linux options](/images/get-started/desktop-download.webp)

Download the installer for your operating system:

- **macOS**, `.dmg` universal binary (Apple Silicon + Intel)
- **Windows**, `.msi` installer
- **Linux**, `.AppImage` (no install required, just make executable and run)

macOS may prompt "unidentified developer" on first launch. Right-click the app → **Open** → **Open** to bypass the quarantine warning. The app is notarized by Apple.

After installation, launch Habits from your Applications folder, Start Menu, or by running the AppImage.

## Step 2, Explore the native canvas

![Desktop app window, habit list and node canvas](/images/get-started/desktop-app.webp)

The app opens with two panels:

**Left, Habit library**
All your installed habits appear here with their name, icon, and last-run status. Click any habit to open it. Use the **+** button to install a new habit from the library or import a `.habit` file.

**Right, Canvas or detail view**
Click a habit to see its workflow canvas. You can edit the workflow directly here, the embedded Base editor is fully functional. Run the habit using the **Run** button in the top bar.

The app requires no running server. Everything is embedded, the Cortex runtime, the Base editor, and the habit storage.

## Step 3, Use OS integrations

![OS integration, keychain access prompt dialog](/images/get-started/desktop-keychain.webp)

The desktop app exposes native OS capabilities that the browser-based Base cannot access. Your habits can use these through the built-in OS integration nodes:

**Keychain**
Store and retrieve secrets (API keys, passwords, tokens) in the system keychain. The habit calls the `keychain.get` or `keychain.set` action. macOS uses Keychain Access, Windows uses Windows Credential Manager, Linux uses libsecret.

```yaml
- id: get-api-key
  type: bits
  data:
    module: "@ha-bits/bit-keyring"
    operation: get
    params:
      key: openai_api_key
```

This is more secure than storing credentials in the habit file or environment variables.

**System notifications**
Send native OS notifications from your habit:

```yaml
- id: notify-done
  type: bits
  data:
    module: "@ha-bits/bit-notify"
    operation: send
    params:
      title: "Done"
      body: "Your habit finished: {{output}}"
```

**WiFi management**
Query connected networks, scan for available networks, or connect/disconnect, useful for habits that behave differently on home vs. office networks.

**System settings**
Read system information (OS version, hostname, username, active user) useful for habits that need to adapt to the local environment.

## Step 4, Run habits fully offline

![Offline mode, habit running without internet](/images/get-started/desktop-offline.webp)

Any habit that doesn't call external APIs works completely offline. This includes:

- **Local AI**, the desktop app supports on-device LLM inference via LiteRT. Download a model once and it runs offline forever. No API key, no cost per call.
- **Local database**, habits can read and write SQLite databases stored on your machine.
- **Local file system**, read, write, move, watch files anywhere on your disk.
- **Local network**, make HTTP requests to other services on your LAN.

To test offline, disable your network connection and run the habit. If it completes successfully, it's truly offline-capable.

**Designing for offline:**
- Use `@ha-bits/bit-local-ai` instead of `@ha-bits/bit-openai` for AI operations
- Use `@ha-bits/bit-database` with a local SQLite path instead of a hosted database URL
- Avoid external API nodes unless they're genuinely required

## Getting the most out of the desktop app

**Set up the keychain for all your API keys.** Instead of pasting API keys into each habit, store them once in the keychain and reference them by key name. You change the key in one place and every habit picks it up.

**Use scheduled habits as background services.** Configure a habit to run on a schedule (e.g. every 15 minutes). The desktop app runs it in the background even when the window is closed, similar to a system service.

**Use Mirror to share habits between your machines.** Built a habit on your work Mac? Open Mirror in the desktop app, generate a pairing code, and receive it on your home Mac or phone. No file transfer service needed. See the [Mirror docs](/tools/mirror).

**Edit workflows in the app instead of Base.** The desktop app's embedded canvas is identical to Habits Base. You don't need to run a separate `npx habits base` process, just open the habit in the app and edit it there.

**Keep a local model downloaded for air-gapped work.** If you sometimes work in environments with no internet access (flights, client sites, secure facilities), download a local LLM model in advance. The LiteRT plugin stores models in your app data directory and they're available offline indefinitely.

**Automate with OS-level triggers.** Combine the desktop app's schedule trigger with system events. Use a habit that polls a folder and runs whenever a new file appears (folder watcher trigger), or use the webhook trigger and call it from an AppleScript / PowerShell script reacting to OS events.

## Platform-specific notes

| Platform | Notes |
|---|---|
| **macOS** | Full keychain, notifications, WiFi, and system settings support. Universal binary runs natively on both Apple Silicon and Intel. |
| **Windows** | Credential Manager for keychain, Windows toast notifications. WiFi management available via WinAPI. |
| **Linux** | libsecret for keychain (requires `gnome-keyring` or `kwallet`). Notifications via libnotify. WiFi via NetworkManager D-Bus API. AppImage requires no installation. |

## Related

- [Mobile App recipe](./mobile-app), same concept for iOS and Android
- [Mirror tool reference](/tools/mirror)
- [Cortex Server reference](/tools/cortex-server), run habits as a server instead of a desktop app
- [Desktop App tool reference](/tools/desktop-app)
