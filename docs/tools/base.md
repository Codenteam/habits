# Base, Visual Builder

**Base** is the visual drag-and-drop editor for building habits. It runs in the browser and lets you design, test, and export workflows without writing YAML by hand.

## What it is

| Capability | Description |
|---|---|
| Visual editor | Connect bits with a node graph UI |
| YAML export | Export any workflow to version-controlled `.habit` or `stack.yaml` and multiple habits .yaml files |
| Template library | Browse and import community habits |
| Module manager | Install and manage bits available in your workspace |
| Binary export | Pack a habit into a standalone executable or app |
| Mirror | Send/receive habits to other devices via P2P ([Mirror](/tools/mirror)) |

![Base UI](/images/base.webp)

## How to run Base

```bash
npx habits base
```

Base starts at `http://localhost:3000/habits/base/` by default.

::: warning
Base exposes module installation and code execution endpoints. Do **not** expose it publicly on a production server.
:::

## Key workflows

- **Build a habit**, [Creating Habits](/deep-dive/creating)
- **Run a habit**, [Running Habits (Cortex)](/deep-dive/running)
- **Pack and ship**, [Packing and Distributing](/deep-dive/pack-distribute)
- **Explore variables**, [Evaluating Variables](/extra-reading/variables)

## Relation to other tools

| Tool | Relation |
|---|---|
| [Cortex Server](/tools/cortex-server) | Base exports YAML; Cortex runs it |
| [Admin](/tools/admin) | Admin can host a Base instance as a managed service |
| [Mirror](/tools/mirror) | Base toolbar includes a Mirror button to send habits P2P |
