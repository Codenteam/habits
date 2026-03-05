# Why Habits?

Habits helps you build backend logic using pre-built, tested building blocks instead of writing custom code then use AI to build the frontend. Here's why that matters.

## The Problem

Building backend logic is hard. You need to:
- Connect to APIs (OpenAI, SendGrid, databases, etc.)
- Handle errors, retries, and edge cases
- Avoid security vulnerabilities
- Keep track of what's happening

When you write custom code, these responsibilities are all on you. One wrong line can expose data or break your app.

## The Solution

Habits gives you **pre-built nodes** that already handle the hard parts:

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

The Database node already handles validation, error handling, and retries. You just configure what to save.

## Key Benefits

| Benefit | What it means |
|---------|---------------|
| **Pre-built integrations** | 200+ connectors for common services (APIs, databases, AI, etc.) |
| **Less code** | Configure what you want, not how to do it |
| **Easy to audit** | YAML files show exactly what happens in each workflow |
| **Mix and match** | Combine nodes from different platforms (Habits, Activepieces, n8n) in one workflow |

## Three Ways to Build

| Approach | When to use | Example |
|----------|-------------|---------|
| **Pre-built nodes** | Standard integrations | OpenAI, Postgres, SendGrid |
| **Declarative config** | Simple HTTP calls, data transforms | REST API requests |
| **Custom scripts** | Unique business logic | Deno/TypeScript inline code |

## Open Source

Habits is **Apache 2.0 licensed**: no enterprise edition, no feature gates. All functionality is free and open.

::: tip Node Licensing
When using nodes from different ecosystems, check their licenses:
- **Bits & ActivePieces nodes** → MIT (fully permissive)
- **n8n nodes** → SUL (some commercial restrictions)
:::

## Next Steps

- [Quick Start](/getting-started/first-habit) - Build your first habit
- [Core Concepts](/getting-started/concepts) - Learn how Habits works
- [When to Use Habits](/getting-started/when-to-use) - See if it fits your use case
