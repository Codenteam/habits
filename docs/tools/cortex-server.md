# Cortex Server, Execution Engine

**Cortex Server** is the Node.js runtime that executes habits. It exposes a REST API and can be self-hosted anywhere Node.js runs: a VPS, Docker container, serverless function, or CI runner.

## What it is

| Capability | Description |
|---|---|
| REST API | Every habit becomes an HTTP endpoint automatically |
| CLI execution | Run any habit from the command line |
| Multi-habit stacks | Load multiple habits from a single `stack.yaml` |
| Dynamic modules | Load bits on demand; no rebuild required |
| Streaming | Server-sent events for long-running workflows |
| Swagger UI | Auto-generated API docs at `/misc/api-docs` |

![Cortex Engine](/images/cortex.webp)

## How to run

```bash
# Latest from npm
npx habits cortex --config ./stack.yaml

# Or pin a version
npx habits@1.2.3 cortex --config ./stack.yaml
```

Server starts at `http://localhost:3000` by default.

## Key API endpoints

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/{workflow-id}` | Execute a workflow |
| `GET` | `/misc/workflows` | List all loaded workflows |
| `GET` | `/misc/workflow/{id}` | Workflow details |
| `GET` | `/misc/api-docs` | Swagger UI |

::: tip
Never use `/misc/execute/`, it does not exist. Execute via `/api/{workflow-id}`.
:::

## Self-hosting with Docker

```bash
docker run -v $(pwd)/stack.yaml:/app/stack.yaml \
  -p 3000:3000 \
  habits cortex --config /app/stack.yaml
```

See the [Docker Compose examples](https://github.com/codenteam/habits/tree/main/docker) in the repository.

## Deep dive

- [Running Habits (Cortex)](/deep-dive/running), full configuration reference
- [Creating Habits](/deep-dive/creating), build the YAML that Cortex runs
- [Packing and Distributing](/deep-dive/pack-distribute), embed Cortex in a binary

## Relation to other tools

| Tool | Relation |
|---|---|
| [Base](/tools/base) | Base designs habits; Cortex runs them |
| [Admin](/tools/admin) | Admin orchestrates multiple Cortex instances |
| [Desktop App](/tools/desktop-app) | The app bundles Cortex for offline execution |
| [Mobile App](/tools/mobile-app) | The mobile app bundles Cortex for on-device execution |
