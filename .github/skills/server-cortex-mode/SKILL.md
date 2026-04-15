---
name: server-cortex-mode
description: 'EXCLUSIVE Node.js Cortex server development mode. Use when: building workflows, implementing API endpoints, working on @ha-bits/cortex package, testing HTTP endpoints, or when user says "server mode", "cortex only", "backend". NEVER use Tauri commands, Rust code, or native app features in this mode. All functionality runs through the Node.js Cortex server.'
argument-hint: 'Describe the server feature, workflow, or API endpoint you need'
---

# Server Cortex Mode (Exclusive)

## CRITICAL CONSTRAINTS

**NEVER DO** in this mode:
- Never reference Tauri, Rust, or native app code
- Never use `invoke()` or Tauri commands
- Never modify `habits-cortex/src-tauri/` files
- Never suggest native device capabilities (use server alternatives)
- Never use Tauri plugins or WebDriver MCP tools
- Never reference `tauri-plugin-*` directories

**ALWAYS DO** in this mode:
- Use Node.js/TypeScript for all backend logic
- Implement features in `packages/cortex/` or `packages/core/`
- Use HTTP endpoints for all client-server communication
- Test via `httpyac` http files or `curl`
- Start server with `pnpm nx dev @ha-bits/cortex --config <habit>`

## Project Structure

```
packages/
├── cortex/              # Main Cortex server
│   ├── server/          # Express server, workflow engine
│   ├── ui/              # Management UI
│   └── core/            # Shared utilities
├── core/                # Core framework (logger, utils)
├── habits/              # CLI tool
└── bits/                # Bit implementations

showcase/                # Example habits
├── hello-world/
├── marketing-campaign/
└── ...
```

## Starting the Server

```bash
# Dev mode with stack.yaml
pnpm nx dev @ha-bits/cortex --config showcase/hello-world/stack.yaml

# Dev mode with .habit file
pnpm nx dev @ha-bits/cortex --config /path/to/example.habit

# Background server (for scripts)
nohup pnpm nx dev @ha-bits/cortex --config showcase/hello-world/stack.yaml &
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/{workflow-id}` | POST/GET | Execute workflow |
| `/misc/workflows` | GET | List all workflows |
| `/misc/workflow/{id}` | GET | Get workflow details |
| `/` | GET | Frontend UI |
| `/habits/cortex/` | GET | Cortex management UI |
| `/habits/base/` | GET | Base UI |

**NEVER** use `/misc/execute/` - this endpoint does not exist.

## Testing with httpyac

```bash
# Run all Cortex tests (from workspace root)
httpyac http/cortex-tests.http --all

# Run specific test
httpyac http/cortex-tests.http -n "workflowsList"

# Run Base tests  
httpyac http/base-tests.http --all
```

## Testing with curl

```bash
# List workflows
curl http://localhost:3000/misc/workflows

# Execute workflow (POST)
curl -X POST http://localhost:3000/api/my-workflow \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'

# Execute workflow with streaming
curl -X POST http://localhost:3000/api/my-workflow \
  -H "Accept: text/event-stream"
```

## Implementing New Features

### 1. Add New Bit
```typescript
// nodes/bits/@ha-bits/bit-example/src/lib/actions/my-action.ts
import { createAction } from '@ha-bits/core';
import { logger } from '@ha-bits/core/logger';

export const myAction = createAction({
  name: 'my-action',
  // ... implementation
});
```

### 2. Add Workflow Step
```yaml
# In stack.yaml
workflows:
  my-workflow:
    steps:
      - id: step1
        action: my-bit/my-action
        params:
          key: value
```

### 3. Add Server Endpoint
```typescript
// packages/cortex/server/src/routes/my-route.ts
router.get('/my-endpoint', async (req, res) => {
  // Implementation
});
```

## Build Commands

```bash
# Build Cortex
pnpm nx build @ha-bits/cortex

# Pack Cortex
pnpm nx pack @ha-bits/cortex

# Build a bit
pnpm nx build @ha-bits/bit-example
```

## Full Test Procedure

```bash
# 1. Build and pack
pnpm nx pack habits --skip-nx-cache

# 2. Start server from /tmp (emulates npx)
cd /tmp && nohup npx /path/to/habits/dist/packages/habits cortex \
  --config /path/to/habits/dist/packages/habits/showcase/hello-world/stack.yaml \
  > /tmp/habits-cortex.log 2>&1 &
sleep 10

# 3. Run httpyac tests
cd /path/to/habits && httpyac http/cortex-tests.http --all

# 4. Stop server
pkill -f habits
```

## Logging

Always use structured logging:
```typescript
import { logger } from '@ha-bits/core/logger';

logger.info('Operation completed', { userId, result });
logger.error('Operation failed', { error: err.message });
```

## When This Mode is Triggered

- User mentions "server", "backend", "cortex", "API", "endpoint"
- Working on files in `packages/cortex/` or `packages/core/`
- User explicitly says "server mode" or "cortex only"
- Building workflows, bits, or HTTP-based features
- Testing with httpyac or curl
- User wants to run `npx habits` or start the Cortex server
