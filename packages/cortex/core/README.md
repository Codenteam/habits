# @ha-bits/cortex-core

Platform-agnostic workflow execution engine for Habits (workflows). This package contains the core execution logic without any server dependencies.

## Features

- **Platform-agnostic**: Works in browsers, Deno, Bun, and Node.js
- **No server dependencies**: No Express, Yargs, or Dotenv required
- **Bits framework support**: Execute Bits modules and scripts
- **Streaming support**: Real-time execution updates via callbacks
- **Security scanning**: Built-in DLP, PII, and moderation support

## Usage

```typescript
import { HabitsExecutor, WorkflowConfig, Workflow } from '@ha-bits/cortex-core';

// Create executor
const config: WorkflowConfig = {
  version: '1.0',
  workflows: [{ id: 'my-workflow', path: 'inline' }]
};

const workflows = new Map<string, Workflow>([
  ['my-workflow', myWorkflowDefinition]
]);

const executor = new HabitsExecutor(config, workflows, {
  OPENAI_API_KEY: 'sk-...',
});

// Execute a workflow
const result = await executor.startWorkflow('my-workflow', {
  initialContext: {
    habits: {
      input: { prompt: 'Hello' }
    }
  }
});

console.log(result.output);
```

## Server Package

For HTTP server functionality with Express, OpenAPI documentation, and webhook support, use `@ha-bits/cortex` which depends on this core package.

## License

Apache-2.0
