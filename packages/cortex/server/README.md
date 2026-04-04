# @ha-bits/cortex

Cortex - Habits Workflow Executor Server and CLI

## Installation

```bash
npm install -g @ha-bits/cortex
# or
npx @ha-bits/cortex
```

## Usage

```bash
npx cortex <command> [options]
# or
npx @ha-bits/cortex <command> [options]
```

### Commands

#### Start Server

Start the workflow execution server:

```bash
npx cortex server --config ./stack.yaml
npx cortex server -c ./config.json -p 8080
```

Options:
- `--config, -c` - Path to config file (looks for config.json in cwd if not specified)
- `--port, -p` - Server port (priority: args > config.json > .env > 3000)
- `--host, -h` - Server host (default: 0.0.0.0)

#### Execute Workflow

Execute a workflow directly without starting a server:

```bash
# Execute from workflow file
cortex execute ./workflow.json

# Execute by ID from config
cortex execute --config ./stack.yaml --id my-workflow

# Execute all workflows
cortex execute --config ./stack.yaml --all

# Execute with input data
cortex execute --config ./stack.yaml --id my-workflow --input '{"prompt": "Hello"}'
```

#### Convert Workflow

Convert Script workflows to Habits format:

```bash
cortex convert --input ./script-workflow.json --output ./habits.yaml
cortex convert -i ./workflow.json -o ./habits.yaml
```

### Local Development

```bash
pnpm nx dev @ha-bits/cortex --config showcase/mixed/stack.yaml
```

## API Endpoints

### Workflow Management
- `GET /misc/workflows` - List all loaded workflows
- `GET /misc/workflow/:workflowId` - Get workflow details

### Workflow Execution
- `POST /api/:workflowId` - Execute a workflow
  - Query params: `?stream=true` for streaming response (NDJSON)
- `GET /misc/execution/:id` - Get execution status
- `GET /misc/executions` - List all executions
- `DELETE /misc/execution/:id` - Cancel execution

### Webhooks
- `GET /webhook/health` - Webhook subsystem health
- `GET /webhook/list` - List registered webhook endpoints
- `ALL /webhook/:workflowId/:nodeId` - Webhook trigger endpoints

### Health
- `GET /health` - Server health check
- `GET /misc/health` - Alternative health endpoint

## Technical Notes

### Dynamic Module Loading

Cortex uses `createRequire` from Node.js's `module` API instead of standard `require()` for loading modules at runtime. This is necessary because:

1. **Bundler Compatibility**: When bundled with esbuild/webpack/ncc, the bundler transforms `require()` calls and creates a static context that can't resolve runtime paths.

2. **Dynamic Path Resolution**: Modules are downloaded to `/tmp/habits-nodes/` (or `HABITS_NODES_PATH`) at runtime, and their paths aren't known at build time.

3. **Production Environment**: In bundled production code, regular `require()` would throw "Cannot find module" errors.

```typescript
// Instead of: require(dynamicPath)  // ❌ Fails in bundled code
// Use:
import { createRequire } from 'module';
const dynamicRequire = createRequire(__filename);
const loadedModule = dynamicRequire(dynamicPath);  // ✅ Works in bundled code
```

## License

Apache-2.0

## Repository

https://github.com/codenteam/habits

