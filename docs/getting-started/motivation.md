# Why Habits?

Build backend logic (agents, automations, SaaS) using pre-built, tested building blocks instead of custom code, then use AI to generate the frontend.

## The Problem

Building logic requires connecting to APIs, handling errors/retries, securing vulnerabilities, and tracking execution. When you write custom code, all these responsibilities are on you.

Current tools run in a centralized way, with almost no way to audit the runtime or decentralize specific workflows. Making it impossible to pack specific workflows to run on serverless functions or as standalone apps.

## The Solution

Habits provides **pre-built nodes** that handle the hard parts:

```yaml
nodes:
  - id: send-email
    type: activepieces
    data:
      module: "@ha-bits/bit-database"
      operation: insert
      label: Store in DB
      params:
        collection: survey-responses
```
## Key Benefits

| Benefit | What it means |
|---------|---------------|
| **Pre-built integrations** | 200+ connectors for common services (APIs, databases, AI, etc.), we are gradually open-sourcing those and releasing to public NPM |
| **Less code** | Configure what you want, not how to do it |
| **Easy to audit** | YAML files show exactly what happens in each workflow |
| **Mix and match** | Combine nodes from different platforms (Habits, Activepieces, n8n) in one workflow |

## Three Ways to Build

| Approach | When to use | Example |
|----------|-------------|---------|
| **Pre-built nodes** | Standard integrations | OpenAI, Postgres, SendGrid, etc |
| **Declarative config** | Simple HTTP calls, data transforms | REST API requests |
| **Custom scripts** | Unique business logic | Deno/TypeScript inline code |

## Open Source

Habits is **Apache 2.0 licensed**.

::: tip Node Licensing
When using nodes from different ecosystems, check their licenses:
- **Bits & ActivePieces nodes** → MIT (fully permissive)
- **n8n nodes** → SUL (some commercial restrictions)
:::

## Why not bundle n8n and Activepieces?

Habits initially aimed to be a runtime (The cortex part) that runs n8n and Activepieces nodes for SaaS backends. However, n8n's source-available licensing created constraints, and Activepieces' single-trigger model didn't fit our multi-trigger, out-of-order execution needs. We kept some compatibility with both ecosystems while introducing our own Bits for flexibility.


## Why Not Vibecode Everything?

AI-generated code is fast but often vulnerable. Habits takes a pragmatic approach:

### Layered Security Model

1. **Frontend** – Vibecode freely (browser-sandboxed, XSS mostly mitigated)
2. **Backend Bits** – Vibecode with guardrails (SAST, SCA, partial DAST before packaging)
3. **Workflows** – No-code assembly using pre-validated nodes

### What This Achieves

- Significantly reduces source-code-level attack surface
- Enables rapid development with security gates
- **Note**: Design-level security (business logic, permissions) still requires human review


## Next Steps

- [Quick Start](/getting-started/first-habit) - Build your first habit
- [Core Concepts](/getting-started/concepts) - Learn how Habits works
- [When to Use Habits](/getting-started/when-to-use) - See if it fits your use case
