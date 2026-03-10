---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.
---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

## Server Management

- When running Cortex server and sending requests in the same script/session, always use `nohup` with `&` to run the server in the background: nohup npx nx dev @ha-bits/cortex --config showcase/mixed/stack.yaml &
- This prevents the server from terminating when subsequent commands are executed.

## API Testing

- Prefer using `.http` files with httpyac for testing Cortex API endpoints instead of `curl` if a file exists

- If you need to test a habit, test showcase/mixed/stack.yaml or showcase/marketing-campaign/stack.yaml

- If you need to test habits app, run the server with either npx habits@latest for the npm version or npx nx <action> habits for the local version. 

### Using httpyac Test Files

The `http/` directory contains comprehensive API test files:

- **`http/base-tests.http`** - Tests all Base mode endpoints (UI health, templates API, modules API, forms API)
- **`http/cortex-tests.http`** - Tests all Cortex mode endpoints (workflow execution, streaming)

**Running httpyac tests:**

```bash
# Install httpyac globally if needed
npm install -g httpyac

# Run all tests in a file (MUST be run from workspace root)
cd /path/to/habits
httpyac http/base-tests.http --all
httpyac http/cortex-tests.http --all

# Run specific test by name
httpyac http/base-tests.http -n "baseUIHealth"
httpyac http/cortex-tests.http -n "workflowsList"

# Run with verbose output
httpyac http/base-tests.http --all -v
```

### Local npx Testing (Emulating Remote npx)

This is the most important testing method - it emulates what users experience when running `npx habits@latest`.

**CRITICAL**: Always run from `/tmp` to ensure we're testing the packaged dist, not the workspace source.

**Full Testing Procedure:**

```bash
# 1. Build and pack (from workspace root)
cd /path/to/habits
pnpm nx pack habits --skip-nx-cache

# 2. Kill any existing habits processes
pkill -f habits 2>/dev/null; sleep 2
```

**Base Mode Test with httpyac:**
```bash
# Start server from /tmp (emulates remote npx)
cd /tmp && nohup npx /path/to/habits/dist/packages/habits base > /tmp/habits-base.log 2>&1 &
sleep 5

# Run httpyac tests (MUST run from workspace root)
cd /path/to/habits
httpyac http/base-tests.http --all

# Check results - all tests should pass
# Expected: 13 requests processed (all succeeded)

# Stop server
pkill -f habits
```

**Cortex Mode Test with httpyac:**
```bash
# Start server from /tmp with config from dist (emulates remote npx)
cd /tmp && nohup npx /path/to/habits/dist/packages/habits cortex --config /path/to/habits/dist/packages/habits/showcase/mixed/stack.yaml > /tmp/habits-cortex.log 2>&1 &
sleep 10  # Needs longer for module preload

# Run httpyac tests (MUST run from workspace root)
cd /path/to/habits
httpyac http/cortex-tests.http --all

# Check results
# Expected: 11 requests processed (all succeeded)

# Stop server
pkill -f habits
```

### Manual Testing with curl

- If I ask you "test all habits scenarios locally using npx", you should:
  1. Build and pack: `pnpm nx pack habits --skip-nx-cache`
  2. Test using local dist path (emulates remote npx): `npx ./dist/packages/habits/`
  3. Test in both modes (base and cortex) using the local dist path

  **Base Mode Test:**
  ```bash
  # Start server (use nohup & for background)
  cd /tmp && nohup npx /path/to/habits/dist/packages/habits base > /tmp/habits-base.log 2>&1 &
  sleep 5
  
  # Test endpoints:
  curl http://localhost:3000/habits/base/           # Base UI (React) → 200
  curl http://localhost:3000/habits/base/api        # Base API → 200
  curl http://localhost:3000/habits/base/api/templates/mixed/stack.yaml                    # Templates → 200
  curl http://localhost:3000/habits/base/api/templates/business-intersect-standalone/stack.yaml  # Templates → 200
  
  # Stop: pkill -f habits
  ```

  **Cortex Mode Test:**
  ```bash
  # Start server with example config
  cd /tmp && nohup npx /path/to/habits/dist/packages/habits cortex --config /path/to/habits/dist/packages/habits/showcase/mixed/stack.yaml > /tmp/habits-cortex.log 2>&1 &
  sleep 10  # Longer wait for module preload
  
  # Test endpoints:
  curl http://localhost:3000/                       # Frontend (habit UI) → 200
  curl http://localhost:3000/misc/workflows          # Cortex API → 200
  curl http://localhost:3000/habits/cortex/         # Cortex Management UI → 200
  curl http://localhost:3000/habits/base/           # Base UI (embedded) → 200
  
  # Stop: pkill -f habits
  ```

### Testing Published npm Package

- If I ask you "test all habits scenarios published in npx", you should:
  1. Clear npx cache if needed: `rm -rf ~/.npm/_npx`
  2. Test with `npx habits@latest base` and `npx habits@latest cortex --config <path>`
  3. For cortex, use example from the package: `~/.npm/_npx/*/node_modules/habits/showcase/mixed/stack.yaml`
This can be done with latest or @next based on my request


### Don't stop until tested
- If you are instructed to do a task, don't stop until you have tested building it then if it has a dev/serve mode, test it as well, if it's backend, test the endpoints. If it's frontend, 

### Match habits to schema
If you need to write any habit, make sure it matches the habits.schema.yaml file. If you need to introduce something new to schema, do it but add a comment explaining it clearly in the schema. and make sure to update the description in habits.schema.md to reflect the changes in habits.schema.yaml.

### Documentation

For any change in documentation, make sure any example in json or yaml matches the habits.schema.yaml. 

### Logging

Use core/logger for any logging in the codebase, do not use console.log or any other logging method. Always use structured logging with context objects. For example:
