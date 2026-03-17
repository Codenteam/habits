# Build a Fully Standalone App (No External APIs)

This guide walks you through building a complete **offline-capable application** that requires no external API keys or cloud services to function. Everything runs locally on the user's device.

::: tip <Icon name="package" /> Complete Example
This tutorial uses the [QR Code Manager](/showcase/qr-database) showcase, an app demonstrating local-only workflows with SQLite storage and custom frontend.
:::

<script setup>
const habitTabs = [
    { label: 'create-qr', url: '/showcase/qr-database/create-qr.yaml' },
    { label: 'scan-qr', url: '/showcase/qr-database/scan-qr.yaml' },
    { label: 'list-qrs', url: '/showcase/qr-database/list-qrs.yaml' },
]
</script>

## Why Build Standalone?

Standalone applications offer significant advantages:

| Advantage | Description |
|-----------|-------------|
| **Privacy** | All data stays on the user's device — no cloud transmission |
| **Offline First** | Works without internet connection |
| **No API Costs** | Zero ongoing costs for external services |
| **Simple Deployment** | Distribute a single file, no server setup |
| **Data Ownership** | Users control their own data completely |

## What You'll Build

The QR Code Manager demonstrates building a **multi-habit application** entirely with local bits:

- **5 local workflows** — Generate QR codes, scan images, full CRUD operations
- **SQLite database** — Persistent local storage using `@ha-bits/bit-database-sql`
- **QR processing** — Generate and decode using `@ha-bits/bit-qr`
- **Custom frontend** — Mobile-friendly UI
- **Cross-platform packaging** — Build for macOS, Windows, Linux, and Android

## Workflow Visualization

Explore the workflows that power the QR Code Manager:

<HabitViewerTabs :tabs="habitTabs" :height="500" />

## Anatomy of a Local-Only Habit

The key to building standalone apps is using **local bits** instead of API-dependent ones. The Create QR workflow demonstrates this pattern — it uses `@ha-bits/bit-qr` for local QR generation and `@ha-bits/bit-database-sql` for local SQLite storage:

::: code-group
<<< @/../showcase/qr-database/create-qr.yaml [create-qr.yaml]

<<< @/../showcase/qr-database/list-qrs.yaml [list-qrs.yaml]
:::

## Stack Configuration

The stack.yaml for a standalone app references local workflows and configures the server with a custom frontend:

::: code-group
<<< @/../showcase/qr-database/stack.yaml [stack.yaml]
:::

::: info No .env Required
Since there are no external API keys, you don't need a `.env` file. The app works out of the box.
:::

## Running Locally

Test your standalone app during development using the ExampleRunner:

<ExampleRunner examplePath="qr-database" />

## Packaging for Distribution

Package your standalone app for any platform:

<PackCommandsAll appName="QRManager" />

### Pre-built Downloads

The QR Code Manager showcase includes pre-built binaries you can download and test immediately:

<DownloadBuilds 
  :downloads="[
    { filename: 'QR Database Habit Mac (Unsigned).dmg', platform: 'mac', size: 5819255, displaySize: '5.5 MB' },
    { filename: 'QR Database Habit Android (Self-Signed).apk', platform: 'android', size: 12493971, displaySize: '11.9 MB' }
  ]" 
  basePath="/showcase/qr-database/downloads" 
/>

## Best Practices for Standalone Apps

### 1. Choose Local Bits First

When designing workflows, prefer local bits over API-dependent ones:

| Use This (Local) | Instead Of (API) | Why |
|------------------|------------------|-----|
| `@ha-bits/bit-qr` | External QR API | Generates QR codes locally |
| `@ha-bits/bit-database-sql` | Cloud database | SQLite runs on device |
| `@ha-bits/bit-image` | Image processing API | Local image manipulation |

### 2. Handle Data Persistence

For local storage, use one of these bits based on your data model:

| Bit | Best For | Example Use |
|-----|----------|-------------|
| `@ha-bits/bit-database-sql` | Structured, relational data | Users, products, transactions |
| `@ha-bits/bit-database-pouch` | Documents, sync-capable | Notes, settings, offline-first apps |
| `@ha-bits/bit-fs` | Files, binary data | Images, exports, user uploads |

See the `list-qrs.yaml` workflow above for a real example of SQLite queries.

### 3. Design for Offline

- Store all necessary data locally
- Don't depend on external resources (fonts, images, APIs)
- Include fallback UI states for empty data

### 4. Keep Binary Size Reasonable

Standalone binaries bundle the entire runtime. Keep them lean by:

- Avoiding unnecessary dependencies
- Using optimized frontend assets
- Compressing images before bundling

## Next Steps

- **[QR Code Manager Showcase](/showcase/qr-database)** — Explore the full example
- **[Packing and Distribution](/deep-dive/pack-distribute)** — Learn all packaging options
- **[Bits Catalog](/bits/)** — Discover available local and API bits
- **[Build AI-Powered App](/getting-started/first-app-using-habits)** — For apps that need AI capabilities

<style>
.vp-doc table {
  display: table;
  width: 100%;
}
</style>
