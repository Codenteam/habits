# Mobile App

**Goal:** Run and manage your habits from your phone, trigger automations on the go, receive push notifications when tasks complete, and work entirely offline, no server required.

The **Habits mobile app** is a native iOS and Android app. It bundles a full Cortex runtime, so your habits run directly on the device. No cloud subscription. No server to maintain. The phone is the server.

## What you'll end up with

- A native app on your phone with a list of all your installed habits
- One-tap execution of any habit
- Push notifications when a habit finishes or fails
- Full offline operation, habits run even without a network connection
- A built-in form UI for habits that take inputs

## Tools used

| Tool | Role |
|---|---|
| Mobile App | Runs Cortex on-device, manages habits, sends notifications |
| [Cortex Server](/tools/cortex-server) | The same runtime the app embeds, your habits work identically on mobile and server |
| [Mirror](/tools/mirror) | Transfer habits from your desktop to your phone over a local P2P connection |

## Step 1, Download the app

![App Store listing for habits mobile app](/images/get-started/mobile-app-store.webp)

Install Habits from the App Store or Google Play:

- **iOS:** [Download on the App Store](#)
- **Android:** [Get it on Google Play](#)

The app requires iOS 16+ or Android 12+.

After installing, open the app. You'll land on the home screen, an empty habit list on first launch.

## Step 2, Add your first habit

There are three ways to add a habit to the app:

**Option A, From the built-in library**
Tap **Browse** in the bottom tab bar. The library shows all showcase habits. Tap any habit and tap **Install**. It's available immediately.

**Option B, Import a `.habit` file**
If you have a `.habit` binary (from Base, from a colleague, or downloaded from a link), tap **Import** and select the file. Habits validates it and adds it to your list.

**Option C, Transfer from desktop via Mirror**
On your desktop, open Base and use **Pack → Share via Mirror**. On your phone, tap **Import → Mirror** and enter the pairing code. The habit transfers over a local peer-to-peer connection, no cloud upload, no email. See the [Mirror docs](/tools/mirror).

## Step 3, View your habits at a glance

![Home screen, list of running habits with status](/images/get-started/mobile-home.webp)

The home screen lists all installed habits with:
- **Name and icon** from the habit's manifest
- **Status badge**, idle, running, or last run result (success / failure)
- **Last run time**, so you know when it last executed

Tap any habit to open its detail view.

## Step 4, Trigger habits from anywhere

![Habit detail view, inputs, trigger, and run button](/images/get-started/mobile-detail.webp)

The detail view shows the habit's input form (if it has one) and three trigger options:

**Run now**
Tap **Run**. Fill in any inputs and tap **Submit**. The habit runs on-device and you see a live progress indicator. Tap any step to see what it did.

**Schedule**
Tap **Schedule** and set a cron expression or pick a simple interval (every hour, daily at 8am, etc.). The app registers a background task, the habit runs at the scheduled time even when the app is closed.

**Webhook trigger**
Enable **Webhook** and the app generates a local URL (e.g. `http://phone-ip:3000/api/my-habit`). Other devices on the same network can POST to this URL to trigger the habit. Useful for scripting from a laptop.

## Step 5, Stay informed via push notifications

![Notification from a habit completing a task](/images/get-started/mobile-notification.webp)

When the app prompts for notification permission, tap **Allow**.

Every habit can emit notifications. A habit that summarises your emails sends a notification with the summary. A habit that monitors a folder sends a notification when a new file appears. You define what triggers a notification in the habit's workflow, the mobile app delivers it.

Notification settings per habit:
- **On success**, notify when the habit finishes without errors
- **On failure**, always notify on errors (default: on)
- **Custom**, the habit itself calls a `notify` node with a custom message and title

## Getting the most out of the mobile app

**Use home screen shortcuts.** Long-press a habit in the list and tap **Add to Home Screen**. iOS and Android both support this. One tap on your home screen → the habit runs immediately, no need to open the app.

**Combine with Shortcuts (iOS) or Tasker (Android).** The webhook trigger exposes a local HTTP URL. Use this in Shortcuts automations (e.g. "when I arrive home, run my home-setup habit") or Tasker profiles.

**Keep habits small and focused.** On mobile, habits share CPU and memory with every other app. A habit that does one thing (summarise, classify, extract) runs fast. A habit that chains 20 AI calls will be slow and drain the battery. Split large workflows into multiple focused habits and chain them manually or via webhook.

**Use the schedule trigger for daily briefings.** Set a habit to run every morning at 7am that pulls your calendar, checks the weather, and sends you a push notification summary. The habit runs in the background even with the phone locked.

**Transfer habits from your team via Mirror.** Your team lead builds a habit in Base on their laptop. They share it via Mirror. You scan the pairing code in the app and the habit installs. No file sharing service, no email attachment, seconds, peer-to-peer.

**Offline-first habit design.** If you need a habit to work with no internet, avoid nodes that call external APIs. Use local AI nodes (on-device LLM), local database reads, and local file system operations. The mobile runtime supports all of these, they work offline.

## Limitations on mobile

| Limitation | Details |
|---|---|
| No persistent server | The app runs habits on demand or on schedule, not as a permanently-listening HTTP server. For always-on APIs, use Cortex Server on a machine instead. |
| Background restrictions | iOS aggressively limits background tasks. Scheduled habits may be delayed or skipped if the device is in low-power mode. |
| Large AI models | On-device LLM inference requires models to be downloaded (200 MB–4 GB). First run will be slow while the model downloads. |

## Related

- [Desktop App recipe](./desktop-app), native app for Mac, Windows, Linux
- [Mirror tool reference](/tools/mirror), P2P habit transfer
- [Cortex Server reference](/tools/cortex-server), run habits on a server instead
