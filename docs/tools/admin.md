# Admin, Multi-Cortex Orchestrator

**Habits Admin** is a self-hosted web UI that manages multiple Cortex Server instances on a single server. It handles subdomain routing, service lifecycle, user management, habit installation, and the Mirror P2P service.

## What it is

| Capability | Description |
|---|---|
| Service management | Start, stop, and monitor Cortex instances per subdomain |
| Habit library | Browse, install, and update habits from the library |
| User management | Create accounts and control access |
| Mirror hosting | Run the P2P Mirror signaling server as a managed service |
| Base hosting | Optionally run a Base UI instance as a managed service |
| Health monitoring | Real-time status and dependency checks |

## Screenshots

![Admin Services](/images/admin.webp)

![Admin Library](/images/admin2.webp)

## How to run Admin

```bash
npx habits admin
```

Admin starts at `http://localhost:3000` by default. In production, put it behind a reverse proxy with wildcard subdomain support so each Cortex instance gets its own subdomain.

## Architecture

```
yourdomain.com          → Admin UI
app.yourdomain.com      → Cortex instance (habit: my-app)
crm.yourdomain.com      → Cortex instance (habit: crm-workflow)
mirror.yourdomain.com   → Habit Mirror signaling server
base.yourdomain.com     → Base UI (optional)
```

## System services

Admin has two built-in system services you can enable:

| Service | Description |
|---|---|
| **Habits Base** | Visual editor for building habits |
| **Habit Mirror** | P2P habit transfer signaling server ([Mirror](/tools/mirror)) |

## When to use Admin

- You need to host **multiple habits** for different teams or customers on one server
- You want a **management UI** instead of SSH + CLI
- You're building a **SaaS** where each customer gets their own Cortex instance
- You need **subdomain-per-service** routing

## Relation to other tools

| Tool | Relation |
|---|---|
| [Cortex Server](/tools/cortex-server) | Admin orchestrates multiple Cortex instances |
| [Base](/tools/base) | Admin can host a Base instance as a managed service |
| [Mirror](/tools/mirror) | Admin includes Mirror as a system service |
