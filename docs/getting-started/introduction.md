# Introduction

Habits is a **lightweight automation creator, runtime and packer**. It's designed for environments where full platforms are overkill: serverless functions, edge computing, embedded systems, or when you want to bundle automation into your own SaaS product and serve it as a full-stack application. Allowing you to create, run and pack-to-distribute Agents, Automations, Full-Stacks, SaaS and Micro-Apps.

With Apache 2.0 licensing, Habits combined with open-source nodes gives you a completely open-source workflow runner.

## What is Habits?

At its core, Habits is an execution engine inspired by how the human brain forms habits. Just as your brain automates repeated behaviors through the **Habit Loop** (Cue → Routine → Reward), Habits automates your workflows through a similar pattern:

| Concept | Role | Description |
|---------|------|-------------|
| **Habit** | Workflow | A complete automation logic composed of connected nodes |
| **Stack** | Workflow Set | A collection of habits executed together |
| **Bit** | Node | A single step: a bit, an ActivePieces piece, n8n node, or a script |
| **Base** | Builder | Visual workflow designer for constructing habits |
| **Cortex** | Executor | The orchestration engine that runs everything |

## Why Choose Habits?

### 🔀 Multi-Framework Support
Combine the best of each ecosystem in a single workflow. Use an ActivePieces piece for OpenAI, an n8n node for text processing, and a script for custom logic. All chained together seamlessly.

### 📜 True Open Source (Apache 2.0)
Habits is fully Apache 2.0 licensed. This means you can:
- Embed it in commercial products
- Distribute to customers without restrictions
- Modify without source-available obligations
- Ship automation as a product feature

### 🚀 Flexible Execution
Run workflows your way:
- **CLI**: Perfect for CI/CD pipelines, cron jobs, and scripts
- **REST API**: Trigger workflows via HTTP endpoints with auto-generated Swagger docs
- **Frontend**: Put your automation behind an automatically generated Frontend or build your own.
- **Cortex Management UI**: Built-in management portal for monitoring and control


### 📦 Dynamic Module Loading
Install and use modules from npm, GitHub, or local sources on-the-fly. No rebuilding required.

## Architecture Overview

Habits is composed of two main components:

- **Cortex**: The execution engine that runs your habits via CLI or REST API
- **Base**: The experimental visual builder for designing workflows through drag-and-drop

<!--@include: ../diagrams/components.md-->

## Habits vs Other Platforms

| Aspect | Habits | n8n / ActivePieces |
|--------|--------|--------------------|
| **Purpose** | Create, run and pack automations | Centeralized automation platforms |
| **Deployment** | Serverless, edge, embedded, anywhere | Self-hosted or cloud |
| **UI** | Optional (Base is experimental) | Full visual builder |
| **Footprint** | Minimal | Full application stack |
| **Use Case** | Embed automation in your app | Standalone automation |
| **Frontend Bundling** | Built-in SaaS builder | Separate concern |

### Native Execution Mode

Habits runs n8n or ActivePieces modules using their actual runtime dependencies, providing maximum compatibility when exact behavior matching is required.

## License Considerations

When mixing modules, the **most restrictive license applies**:

| Module Source | License | Safe to Distribute? |
|--------------|---------|---------------------|
| Habits core | Apache 2.0 | ✅ Yes |
| ActivePieces pieces | MIT | ✅ Yes |
| Community n8n nodes | Usually MIT | ✅ Check each |
| n8n-nodes-base | Sustainable Use | ❌ No |

Stick to Apache 2.0 or MIT licensed modules for maximum freedom.

## What's in This Documentation

| Section | What You'll Learn |
|---------|-------------------|
| **Getting Started** | Build your first habit, understand when to use Habits, and learn core concepts |
| **Deep Dive** | Create workflows with Base, run them with Cortex, and master the habit schema |
| **Extra Reading** | Explore the neuroscience inspiration and licensing details |
| **Roadmap** | Discover upcoming features like self-improving habits and bits |

## Next Steps

Ready to build? Start with these guides:

- [Build Your First Habit](/getting-started/first-habit): Create a working workflow in 5 minutes
- [When to Use Habits](/getting-started/when-to-use): Understand the ideal use cases
- [Concepts](/getting-started/concepts): Deep dive into the core architecture
- [Running Automations](/deep-dive/running): Master CLI and API execution
