# Concepts

Habits is built around five core concepts:

| Concept | Role | Description |
|---------|------|-------------|
| **Habit** | Workflow | A complete automation routine |
| **Stack** | Workflow Set | A collection of habits executed together |
| **Bit** | Node | A single step within a workflow |
| **Base** | Builder | Visual editor for creating habits |
| **Cortex** | Executor | Runtime that executes habits |

## Habit

A **Habit** is a workflow: a YAML file defining nodes and how they connect. Habits can be triggered via:
- **HTTP request** (server mode)
- **CLI command**
- **Watchers/Triggers**

## Stack

A **Stack** groups multiple habits together. Define one `stack.yaml` to run related habits as a unit.

## Bit

A **Bit** is a single node in a habit. It can be:
- A **Habits bit** (e.g., `@ha-bits/bit-intersect)
- An **ActivePieces piece** (e.g., `@activepieces/piece-openai`)
- An **n8n node** (e.g., `n8n-nodes-base`)
- A **custom script** (Deno/TypeScript)

## Base

**Base** is the visual builder for creating and editing habits.

> ⚠️ **Experimental**: Base is under active development.

See [Creating Habits](/deep-dive/creating) for details.

## Cortex

**Cortex** is the runtime that executes habits. It loads your stack, resolves dependencies, and runs workflows.

See [Running Automations](/deep-dive/running) for details.

---

::: tip Naming Origin
The naming draws from neuroscience, habits, and how the brain's cortex orchestrates behavior with basal ganglia forming habits. Learn more in [Neuroscience](/extra-reading/neuroscience).
:::


