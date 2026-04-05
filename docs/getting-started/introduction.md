# Introduction

Habits is a **lightweight workflow creator, runtime, and packer** for building agents, automations, full-stack apps, SaaS, and micro-apps. It combines a visual builder (**Base**) with a decentralized execution engine (**Cortex**) — all under Apache 2.0.

## What Can You Build?

| Category | Examples |
|----------|----------|
| **AI/ML** | AI assistants, image analyzers, voice generators, quiz creators |
| **Business** | Invoice generators, competitor analysis, real estate tools |
| **Communication** | Email classifiers, newsletter generators, social media managers |
| **Development** | Code reviewers, bug reporters, documentation generators |
| **Productivity** | Meeting summarizers, research assistants, resume analyzers |


## Core Components

| Component | Role | Description |
|-----------|------|-------------|
| **Stack** | Workflow Set | Multiple habits running together |
| **Habit** | Workflow | A YAML file defining connected nodes |
| **Bit** | Node | A single step: Habits bit or script |
| **Base** | Builder | Visual editor for creating habits |
| **Cortex** | Executor | Runtime that executes workflows |

::: tip Naming Origin
The naming draws from neuroscience, the brain's **cortex** orchestrates behavior while **basal ganglia** forms habits.
:::

## How It Works

## Visual Overview

|            | **Base** (Visual Builder)         | **Cortex** (Execution Engine)      |
|------------|-----------------------------------|------------------------------------|
| **Purpose**| Drag-and-drop workflow creation   | Executes workflows (habits)        |
| **Features** | - Visual editor<br>- Export to YAML<br>- Frontend builder<br>- Template library | - CLI execution<br>- REST API server<br>- Multi-framework support<br>- Dynamic module loading |

- **Base**: Design and prototype workflows visually, then export to YAML for version control or CI/CD.
- **Cortex**: Run workflows via CLI or REST API, supporting multiple frameworks and dynamic module loading.

**Ways to create habits:**
1. **Visual Builder**: Use Base UI to drag-and-drop nodes
2. **Code-first**: Write YAML directly for version control and CI/CD
3. **AI**: As the AI to directly create you the habit.

**Ways to run:**
- **REST API**: Start a server and trigger via HTTP/Frontend
- **CLI**: `habits execute --config ./stack.yaml`

## Key Features

- **Native Bits** — Use Habits bits for fully Apache 2.0 licensed integrations with no commercial restrictions
- **Apache 2.0 License** — Embed in commercial products, distribute without restrictions
- **Flexible Execution** — Run via CLI, REST API, or with an auto-generated frontend
- **Dynamic Module Loading** — Install modules from npm, GitHub, or local sources on-the-fly
- **Lightweight** — Minimal footprint for serverless, edge, and embedded deployments
- **Security** — Built-in DLP, PII protection, supply chain integrity, and sandboxing

<Checklist name="documentation-reading" title="Documentation Reading Order Checklist" icon="book">

<!--@include: ./checklists/documentation-reading.md{4,}-->

</Checklist>


## Next Steps

- [Core Concepts](/getting-started/concepts) — Deep dive into terminology
- [Build Your First Habit](/getting-started/first-habit) — Hands-on tutorial
- [When to Use Habits](/getting-started/when-to-use) — Check if it fits your use case
- [Why Habits?](/getting-started/motivation) — Detailed rationale and comparison
