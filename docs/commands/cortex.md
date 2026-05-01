### Run Cortex Server

```bash
# Run a habit as server using local @ha-bits/cortex (not the published cortex)
pnpm nx dev @ha-bits/cortex --config {{config}}
```

### Run .habit File

```bash
# Run a .habit file directly (portable self-contained package)
pnpm nx dev @ha-bits/cortex --config {{config}}
```

### Execute Workflow (npx)

```bash
# Execute a workflow one-shot via npx
npx @ha-bits/cortex execute --config {{config}} --id {{workflowId}} --input '{{input}}'
```

### Start Server (npx)

```bash
# Start cortex server via npx
npx @ha-bits/cortex server --config {{config}} --port {{port}}
```

### Execute Workflow (POST)

```bash
# Execute workflow via POST
curl -X POST http://localhost:{{port}}/api/{{workflowId}} -H "Content-Type: application/json" -d '{{input}}'
```

### Execute Workflow (GET)

```bash
# Execute workflow via GET
curl "http://localhost:{{port}}/api/{{workflowId}}?{{queryParams}}"
```

### List Workflows

```bash
# List workflows
curl http://localhost:{{port}}/misc/workflows
```

### Build Cortex

```bash
# Build Cortex
pnpm nx build @ha-bits/cortex
```

### Publish Cortex

```bash
# Publish Cortex
cd packages/cortex/server && npm version patch --no-git-tag-version && cd ../ui && npm version patch --no-git-tag-version && cd ../../.. && pnpm nx pack @ha-bits/cortex && cd dist/packages/cortex && npm publish --registry https://registry.npmjs.org/
```

### Link Cortex Core

```bash
# Link Cortex Core (npm link from dist)
cd dist/packages/cortex/core && npm link
```

### Unlink Cortex Core

```bash
# Unlink Cortex Core
npm unlink -g @ha-bits/cortex-core
```
