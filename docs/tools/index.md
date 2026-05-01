# Tools

Habits ships as a collection of standalone tools. Each one can be used independently or combined to build a complete system. Pick the tools that fit your context.

## The tools

| Tool | What it does | Run it |
|---|---|---|
| [Base](./base) | Visual drag-and-drop canvas for building and testing habits in the browser | `npx habits base` |
| [Cortex Server](./cortex-server) | Node.js runtime that executes habits and exposes them as a REST API | `npx habits cortex` |
| [Admin](./admin) | Self-hosted web UI that manages multiple Cortex instances, subdomains, and users | `npx habits admin` |
| [Desktop App](./desktop-app) | Native macOS, Windows, and Linux app that runs habits fully offline | Download from GitHub |
| [Mobile App](./mobile-app) | Native iOS and Android app with on-device execution and device hardware access | Download from stores |
| [Mirror](./mirror) | P2P file transfer for moving `.habit` files between devices, no cloud involved | Built into Base / Admin / Apps |

## How they relate

```
┌─────────────────────────────────────────────────┐
│  Base (build)          Admin (manage)            │
│   └─ design habits      └─ host multiple         │
│   └─ export .habit          Cortex instances     │
│   └─ use Mirror             └─ subdomain routing │
└──────────────────┬──────────────────────────────┘
                   │  .habit file
         ┌─────────▼──────────┐
         │   Cortex Server    │  ← runs anywhere Node.js runs
         │   executes habits  │
         │   REST API         │
         └────────────────────┘
                   │
         ┌─────────▼──────────────────────┐
         │  Desktop App / Mobile App       │  ← offline, on-device
         │  bundles Cortex + hardware bits │
         └─────────────────────────────────┘
```

## Choosing what to use

**I want to build a workflow visually** → start with [Base](./base)

**I want to run a habit on a server** → use [Cortex Server](./cortex-server)

**I want to host habits for a team or customers** → use [Admin](./admin)

**I want to run habits offline on my laptop** → use the [Desktop App](./desktop-app)

**I want habits on my phone** → use the [Mobile App](./mobile-app)

**I want to send a habit to another device** → use [Mirror](./mirror)

## What a habit actually is

A habit is a self-contained workflow file (`.habit` or `stack.yaml`) that describes inputs, a sequence of nodes, and an output. Each node is a **bit** — a small, single-purpose function like "call OpenAI", "send an email", or "query a database". All tools in this list know how to load and run habit files.

See the [Recipes](/recipes/) section for end-to-end examples that combine multiple tools.
