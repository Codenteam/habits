# Running Automations

This guide explains how to use **Cortex** to run and manage your automation habits.

## Overview

Cortex is the lightweight execution engine at the heart of Habits. Cortex is designed to be minimal and embeddable, perfect for serverless deployments, edge computing, or bundling into your own applications.

<div id="cortex-engine-screenshot">

![Cortex Engine](/images/cortex.webp)
*Cortex Engine - Lightweight Runtime Executor*

</div>

::: tip Lightweight by Design
Cortex runs your workflows without the overhead of a full platform. Deploy it to AWS Lambda, Cloudflare Workers, or embed it directly in your SaaS product.
:::

---

## Triggers (Cues)

In the [Habit Loop](/extra-reading/neuroscience), the **Cue** is the trigger that initiates your automation. Habits supports multiple trigger methods:

| Trigger Type | Description | Status |
|-------------|-------------|--------|
| **CLI** | Execute workflows from the command line | ✅ Available |
| **REST API** | Trigger workflows via HTTP endpoints | ✅ Available |
| **Bits Watchers**| Event-based triggers from Habits bits | ✅ Available |
| **ActivePieces Triggers** | Event-based triggers from ActivePieces Pieces | 🚧 WIP |
| **n8n Triggers** | Event-based triggers from n8n nodes | 🔜 Coming Soon |

### CLI Triggers

The CLI is ideal for manual execution, cron jobs, CI/CD pipelines, and local testing:

```bash
npx @ha-bits/cortex@latest execute ./examples/business-intersect-standalone/config.json
```

### REST API Triggers

The REST API is the primary method for integrating with external systems and services. See the [Swagger OpenAPI](#swagger) section below for complete details about the generated endpoints. To run in server mode, use this command:å

```bash
npx @ha-bits/cortex@latest server --config ./examples/business-intersect-standalone/config.json
```

---

## How to Run Cortex

There are three main ways to run Cortex depending on your use case:

### 1. Using nx (Local Development)

If you're developing locally and have cloned the repository, use nx to run Cortex:

```bash
# Run the dev target (uses preconfigured test config)
npx nx dev @ha-bits/cortex --config=n8n-top-6
```

This is the recommended approach when:
- You're actively developing or debugging Cortex
- You need hot-reloading during development
- You're contributing to the codebase

### 2. Using the Playground Script

For quickly testing habits within Docker and an example configurations, use the playground script:

```bash
bash packages/cortex/server/playground/run.bash --config=./examples/business-intersect-standalone/config.json
```

Available options:
- `--config=<path>`: Specify the example to run (e.g., `--config ./examples/business-intersect-standalone/config.json`)
- The playground provides a preconfigured environment for testing

This is ideal for:
- Trying out example workflows
- Testing habit configurations
- Quick prototyping without full setup

### 3. Using npx (Production/Standalone)

For production use or running Cortex as a standalone tool, use npx:

```bash
npx @ha-bits/cortex
```

With additional options:

```bash
# Run with a specific habit file
npx @ha-bits/cortex --habit ./path/to/habit.json

# Run with custom configuration
npx @ha-bits/cortex --config ./config.json

# Run on a specific port
npx @ha-bits/cortex --port 3000
```

This approach is best for:
- Production deployments
- Running Cortex without cloning the repository
- CI/CD pipelines
- Quick execution of habits


## Cortex Components

Cortex consists of several components that work together to execute and manage habits:

| Component | Path | Description |
|-----------|------|-------------|
| **Web UI** | `/cortex` | Visual interface for managing and monitoring habits |
| **API** | `/api` | RESTful API for programmatic access |
| **Swagger Docs** | `/api/docs` | Interactive API documentation |

---

## Cortex Web UI

The Cortex UI provides a visual interface for managing your habits.

### Accessing the UI

Navigate to `/cortex` in your browser to access the Cortex dashboard.

<!-- ![Cortex Dashboard](../images/cortex-dashboard.png) -->
<!-- *Placeholder: Screenshot of the Cortex dashboard* -->

### Dashboard Features

- **Habits List**: View all available habits
- **Execution History**: See past runs and their status
- **Real-time Monitoring**: Watch habits execute in real-time
- **Logs**: Access detailed execution logs

<!-- ![Cortex Features](../images/cortex-features.png) -->
<!-- *Placeholder: Screenshot highlighting dashboard features* -->

### Running a Habit from the UI

1. Navigate to the Habits list
2. Select the habit you want to run
3. Click "Run" or "Execute"
4. Monitor the execution progress

<!-- ![Run Habit UI](../images/cortex-run-habit.png) -->
<!-- *Placeholder: Screenshot of running a habit from UI* -->

---

## Cortex API

Cortex provides a RESTful API for programmatic access to all functionality.

### API Base URL

```
http://your-host/api
```

### Common Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/misc/workflows` | List all habits |
| `GET` | `/misc/workflow/:id` | Get a specific habit |
| `POST` | `/api/:id` | Execute a habit |
| `GET` | `/misc/executions` | List execution history |
| `GET` | `/misc/executions/:id` | Get execution details |

### Example: Execute a Habit

```bash
curl -X POST http://localhost:3000/api/my-habit-id \
  -H "Content-Type: application/json" \
  -d '{"input": {"key": "value"}}'
```

### Example: Check Execution Status

```bash
curl http://localhost:3000/misc/executions/execution-id
```

---

## Swagger API Documentation {#swagger-api-documentation}

Cortex includes interactive API documentation powered by Swagger/OpenAPI.

### Accessing Swagger Docs

Navigate to `/api/docs` in your browser to access the interactive documentation.

<div id="swagger-screenshot">

![Swagger Docs](/images/swagger.webp)
*OpenAPI Swagger - Auto-generated API documentation*

</div>

### Features

- **Interactive Testing**: Try API calls directly from the browser
- **Schema Documentation**: View request/response schemas
- **Authentication**: Configure API keys for authenticated endpoints
- **Code Examples**: Generate code snippets for various languages

---

## Execution Modes

### Manual Execution

Trigger habits manually through:
- The Cortex UI "Run" button
- API calls to the execute endpoint
- CLI commands

### Scheduled Execution

Set up habits to run on a schedule:

1. Open the habit in the UI
2. Navigate to "Schedule" settings
3. Configure the cron expression or interval

<!-- ![Scheduling](../images/cortex-schedule.png) -->
<!-- *Placeholder: Screenshot of scheduling configuration* -->

### Webhook Triggers

Habits can be triggered via webhooks:

1. Enable webhook trigger for your habit
2. Copy the generated webhook URL
3. Send a POST request to trigger execution

```bash
curl -X POST http://localhost:3000/api/webhooks/your-webhook-id \
  -H "Content-Type: application/json" \
  -d '{"event": "triggered"}'
```

---

## Monitoring and Logs

### Execution History

View all past executions in the Cortex UI:

<!-- ![Execution History](../images/cortex-history.png) -->
<!-- *Placeholder: Screenshot of execution history* -->

### Real-time Logs

Monitor habit execution in real-time:

1. Click on an active execution
2. View logs as they stream
3. See bit-by-bit progress

<!-- ![Real-time Logs](../images/cortex-logs.png) -->
<!-- *Placeholder: Screenshot of real-time log streaming* -->

### Error Handling

When a habit fails:
- The execution is marked as "Failed"
- Error details are captured
- You can retry the execution from the point of failure

---

## Configuration

### Environment Variables

Configure Cortex behavior through environment variables or config file:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `DATABASE_URL` | Database connection string | - |

### Config File

Cortex reads from `config.json` in the project root:

```json
{
  "server": {
    "port": 3000
  },
  "execution": {
    "timeout": 30000,
    "retries": 3
  }
}
```

---

## Best Practices

1. **Monitor Executions**: Regularly check execution history for failures
2. **Set Timeouts**: Configure appropriate timeouts for long-running habits
3. **Use Webhooks**: For event-driven automation, prefer webhooks over polling
4. **Secure Your API**: Use authentication for production deployments

---

## Packing & Distributing

Pack your habits into portable formats for different deployment targets:

| Format | Output | Use Case |
|--------|--------|----------|
| `single-executable` | Standalone binary | FullStack, Frontend + backend, Server/CLI, no Node.js needed |
| `desktop` | Electron app | Desktop UI connecting to remote backend (or local execution: Coming soon) |
| `mobile` | Cordova app | iOS/Android app connecting to remote backend (or local exeuction: Coming soon) |

```bash
# Single executable binary (includes backend)
npx habits pack --config ./stack.yaml --format single-executable -o ./my-app

# Desktop app (frontend-only, connects to your backend)
npx habits pack --config ./stack.yaml --format desktop --backend-url https://api.example.com -o ./output

# Mobile app (frontend-only)
npx habits pack --config ./stack.yaml --format mobile --backend-url https://api.example.com --mobile-target android -o ./output
```

**Desktop platforms:** `dmg`, `exe`, `appimage`, `deb`, `rpm`, `msi`  
**Mobile targets:** `android`, `ios`

#### Platform Requirements

| Format | Requirements |
|--------|-------------|
| `single-executable` | Node.js 20+ (build only), macOS requires code signing |
| `desktop` | Node.js 18+, electron-builder (auto-installed) |
| `mobile` | Cordova CLI (`npm i -g cordova`), Android SDK (gradle, etc) or Xcode |

::: details Mobile Setup
**Android:** Install Android Studio, set `ANDROID_HOME`, ensure `gradle` 8.x is available  
**iOS:** macOS only, requires Xcode with command line tools
:::

See [Binary Export](/deep-dive/pack-distribute) for details on single-executable binaries.

---


## Next Steps

- Review the [Concepts](/getting-started/concepts) guide to understand core terminology
- Learn how to build habits in the [Creating Habits](/deep-dive/creating) guide
- [Binary Export](/deep-dive/pack-distribute) - Package your habits as a standalone executable
