# habits

Unified automation workflow platform combining Cortex workflow executor and Base module manager.

For full documentation, guides, and schema reference, visit the [Habits documentation portal](https://codenteam.com/intersect/habits).

## Installation

```bash
npm install -g habits
# or
npx habits
```

## Commands

### Initialize Project

Create a new Habits project with `.env` and `modules.json`:

```bash
habits init
habits init --force  # Overwrite existing files
```

### Cortex Mode (Workflow Executor)

Start the server in Cortex mode for executing workflows:

```bash
habits cortex --config ./stack.yaml
habits cortex -c ./stack.yaml -p 8080  # Custom port
```

Options:
- `--config, -c` - Path to stack.yaml or config.json file (required)
- `--port, -p` - Server port (default: 3000)

When running in Cortex mode:
- Workflow execution API available at `/api/:workflowId`
- Cortex management UI at `/habits/cortex`
- Base UI embedded at `/habits/base`

### Base Mode (Module Manager)

Start the server in Base mode for building and testing workflows:

```bash
habits base
habits base --port 8080
# Alias: habits edit
```

Options:
- `--port, -p` - Server port (default: 3000)

### Execute Workflow

Execute a workflow directly in CLI mode without starting a server:

```bash
# Execute from workflow file
habits execute ./workflow.json

# Execute by workflow ID from config
habits execute --config ./stack.yaml --id my-workflow

# Execute all workflows from config
habits execute --config ./stack.yaml --all

# Execute with input data
habits execute --config ./stack.yaml --id my-workflow --input '{"key": "value"}'
```

### Convert Workflow

Convert n8n, Activepieces, or Script workflows to Habits format:

```bash
habits convert --input ./n8n-workflow.json --output ./habits-workflow.yaml

# Also generate .env template for credentials
habits convert --input ./workflow.json --output ./habits.yaml --env
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: 0.0.0.0)
- `HABITS_OPENAPI_ENABLED` - Enable OpenAPI documentation (default: false)
- `HABITS_MANAGE_ENABLED` - Enable management UI (default: false)
- `HABITS_DEBUG` - Enable debug mode with verbose output (default: false)
- `HABITS_NODES_PATH` - Custom path for downloaded modules

## API Endpoints (Cortex Mode)

### Workflow Execution
- `GET /misc/workflows` - List all loaded workflows
- `GET /misc/workflow/:workflowId` - Get workflow details
- `POST /api/:workflowId` - Execute a workflow (supports `?stream=true` for streaming)
- `GET /misc/execution/:id` - Get execution status
- `GET /misc/executions` - List all executions
- `DELETE /misc/execution/:id` - Cancel execution

### Webhooks
- `GET /webhook/health` - Webhook health check
- `GET /webhook/list` - List webhook endpoints
- `ALL /webhook/:workflowId/:nodeId` - Webhook trigger endpoints

### Health
- `GET /health` - Health check
- `GET /` - Frontend UI / Server info

## UI Access

### Cortex Mode
- Frontend (Habit UI): `http://localhost:3000/`
- Cortex Management UI: `http://localhost:3000/habits/cortex`
- Base UI (embedded): `http://localhost:3000/habits/base`

### Base Mode
- Base UI: `http://localhost:3000/habits/base`

## Programmatic Usage

```typescript
import { startHabitsServer, startBaseServer } from 'habits';

// Start in Cortex mode
const server = await startHabitsServer({
  configPath: './stack.yaml',
  port: 3000,
});

// Start in Base mode
const baseServer = await startBaseServer({
  port: 3000,
});
```

## License

Apache-2.0
