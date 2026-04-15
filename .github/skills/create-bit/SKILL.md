---
name: create-bit
description: 'Create new bits following a guided workflow: propose structure, create skeleton, implement actions/triggers one at a time, and test each in both Tauri and Node.js before proceeding. Use when user wants to create a new bit, add actions/triggers, or scaffold bit functionality.'
argument-hint: 'Name and purpose of the bit to create (e.g., "bit-weather for fetching weather data")'
---

# Create Bit Skill

This skill guides the creation of new bits through a structured, test-driven workflow.

## Workflow Overview

```
1. PROPOSE    → Present bit structure to user for approval
2. SKELETON   → Create minimal scaffolding, confirm with user
3. IMPLEMENT  → Fill each action/trigger one at a time
4. TEST       → Test each action in BOTH Tauri AND Node.js before continuing
5. REPEAT     → Move to next action/trigger only after tests pass
```

## Phase 1: Propose Structure

Before writing any code, present a detailed proposal to the user:

### Required Information to Gather

Ask the user (if not provided):
- **Bit name**: e.g., `bit-weather` (will become `@ha-bits/bit-weather`)
- **Purpose**: What problem does this bit solve?
- **Runtime**: `all` (universal), `app` (Tauri only), or `server` (Node.js only)
- **Authentication**: None, API key, OAuth2, or custom auth

### Structure Proposal Template

```markdown
## Proposed Bit: @ha-bits/bit-{name}

**Description:** {purpose}
**Runtime:** {all|app|server}
**Logo:** lucide:{icon-name}

### Authentication
- Type: {none|SECRET_TEXT|CUSTOM_AUTH|OAUTH2}
- Fields: {list auth fields if any}

### Actions

| Action | Display Name | Description | Inputs | Outputs |
|--------|--------------|-------------|--------|---------|
| {name} | {Display} | {What it does} | {input props} | {output shape} |

### Triggers

| Trigger | Type | Description | Inputs | Outputs |
|---------|------|-------------|--------|---------|
| {name} | {POLLING|WEBHOOK} | {When it fires} | {props} | {event shape} |

### Dependencies
- {list npm packages needed}

### Browser Stubs Needed
- {list Node.js modules requiring browser polyfills}
```

**Wait for user approval before proceeding to Phase 2.**

## Phase 2: Create Skeleton

After user approves the structure, create the minimal scaffolding:

### Directory Structure

```
nodes/bits/@ha-bits/bit-{name}/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── lib/
│       ├── actions/
│       │   └── index.ts
│       ├── triggers/
│       │   └── index.ts
│       ├── common/
│       │   └── common.ts
│       └── stubs/
│           └── index.ts (if needed)
```

### package.json Template

```json
{
  "name": "@ha-bits/bit-{name}",
  "version": "0.0.1",
  "description": "{description}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "files": ["dist"],
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "nx": {
    "sourceRoot": "@ha-bits/bit-{name}/src",
    "projectType": "library",
    "tags": ["scope:bits", "type:bit"]
  },
  "habits": {
    "catalog": true
  }
}
```

### src/index.ts Template (Using createBit)

```typescript
import { createBit } from '@ha-bits/cortex-core';
// Import actions and triggers as they are created
// import { action1 } from './lib/actions';
// import { trigger1 } from './lib/triggers';

export const bit{PascalName} = createBit({
  displayName: '{Display Name}',
  description: '{Description}',
  logoUrl: 'lucide:{icon}',
  minimumSupportedRelease: '0.0.1',
  authors: [],
  // auth: undefined,  // Add when implementing
  actions: [
    // Actions will be added here
  ],
  triggers: [
    // Triggers will be added here
  ],
});

export default bit{PascalName};
```

### src/lib/actions/index.ts Template

```typescript
// Actions will be exported here as they are implemented
// export { myAction } from './my-action';
```

### src/lib/common/common.ts Template

```typescript
// Shared constants and utilities

export const API_BASE_URL = '';

// Add shared types, helpers, error messages here
```

**Present skeleton to user and wait for approval before Phase 3.**

## Phase 3: Implement Actions/Triggers (One at a Time)

For EACH action or trigger:

### Action Implementation Template

```typescript
// src/lib/actions/{action-name}.ts
import { createAction, Property } from '@ha-bits/cortex-core';
import { logger } from '@ha-bits/core/logger';

export const {actionName} = createAction({
  name: '{action-name}',
  displayName: '{Action Display Name}',
  description: '{What this action does}',
  props: {
    // Define input properties
    inputField: Property.ShortText({
      displayName: 'Input',
      description: 'Description of input',
      required: true,
    }),
  },
  async run({ auth, propsValue, store, files }) {
    const { inputField } = propsValue;

    logger.info('{action-name} started', { inputField });

    try {
      // Implementation here
      const result = { /* output */ };

      logger.info('{action-name} completed', { result });
      return result;
    } catch (error) {
      logger.error('{action-name} failed', { error: error.message });
      throw error;
    }
  },
});
```

### Trigger Implementation Template (Polling)

```typescript
// src/lib/triggers/{trigger-name}.ts
import { createTrigger, TriggerStrategy, Property } from '@ha-bits/cortex-core';
import { logger } from '@ha-bits/core/logger';

export const {triggerName} = createTrigger({
  name: '{trigger-name}',
  displayName: '{Trigger Display Name}',
  description: '{When this trigger fires}',
  type: TriggerStrategy.POLLING,
  props: {
    cronExpression: Property.ShortText({
      displayName: 'Poll Interval',
      description: 'Cron expression for polling',
      required: true,
      defaultValue: '*/5 * * * *',
    }),
  },
  async onEnable(context) {
    context.setSchedule({ cronExpression: context.propsValue.cronExpression });
  },
  async onDisable(context) {
    // Cleanup
  },
  async run(context) {
    const { auth, propsValue, store } = context;

    // Check for new items
    const lastRun = await store.get('lastRun');
    const newItems = []; // Fetch new items since lastRun

    await store.put('lastRun', new Date().toISOString());
    return newItems;
  },
  async test(context) {
    return [{ /* sample event */ }];
  },
  sampleData: {
    /* Example output shape */
  },
});
```

## Phase 4: Test Each Action (MANDATORY)

**CRITICAL: Test EVERY action in BOTH environments before proceeding to the next one.**

### Test in Node.js (Server Cortex)

```bash
# 1. Build the bit
pnpm nx build @ha-bits/bit-{name}

# 2. Create a test stack.yaml
cat > /tmp/test-bit-{name}.yaml << 'EOF'
name: Test Bit {Name}
version: 0.0.1
workflows:
  test-{action-name}:
    displayName: Test {Action Name}
    steps:
      - id: test
        action: bit-{name}/{action-name}
        params:
          inputField: "test value"
EOF

# 3. Start server with test habit
pnpm nx dev @ha-bits/cortex --config /tmp/test-bit-{name}.yaml

# 4. Test via curl
curl -X POST http://localhost:3000/api/test-{action-name} \
  -H "Content-Type: application/json" \
  -d '{"inputField": "test value"}'

# 5. Verify output and check logs
```

### Test in Tauri (App Mode) - Using MCP

```
# 1. Ensure bit is built
pnpm nx build @ha-bits/bit-{name}

# 2. Run the Tauri app
mcp__tauri-webdriver__run_app

# 3. Start WebDriver session
mcp__tauri-webdriver__start_session

# 4. Pack test habit
mcp__tauri-webdriver__pack_habit(stackPath: "/tmp/test-bit-{name}.yaml")

# 5. Import habit
mcp__tauri-webdriver__import_habit_file(habitPath: "/tmp/test-bit-{name}.habit")

# 6. Select habit
mcp__tauri-webdriver__select_habit(name: "Test Bit {Name}")

# 7. List workflows to verify
mcp__tauri-webdriver__list_workflows

# 8. Run the workflow
mcp__tauri-webdriver__run_workflow(workflowId: "test-{action-name}", inputs: { inputField: "test value" })

# 9. Take screenshot to verify
mcp__tauri-webdriver__take_screenshot

# 10. Check app state
mcp__tauri-webdriver__get_app_state

# 11. Cleanup
mcp__tauri-webdriver__close_session
mcp__tauri-webdriver__stop_app
```

### Test Checklist Per Action

- [ ] Action builds without TypeScript errors
- [ ] Node.js server executes action successfully
- [ ] Tauri app executes action successfully
- [ ] Output matches expected schema
- [ ] Error handling works (test with invalid inputs)
- [ ] Logs are informative

**Only proceed to the next action/trigger after ALL tests pass.**

## Property Types Reference

| Type | Method | Use Case |
|------|--------|----------|
| Short Text | `Property.ShortText()` | Single-line input |
| Long Text | `Property.LongText()` | Multi-line input |
| Number | `Property.Number()` | Numeric values |
| Checkbox | `Property.Checkbox()` | Boolean toggle |
| Static Dropdown | `Property.StaticDropdown()` | Fixed options |
| Dropdown | `Property.Dropdown()` | Dynamic options (with refreshers) |
| JSON | `Property.Json()` | Object/array input |
| File | `Property.File()` | File upload |
| DateTime | `Property.DateTime()` | Date/time picker |
| Secret Text | `BitAuth.SecretText()` | Sensitive data |

## Auth Types Reference

```typescript
// No auth
auth: undefined,

// Simple API Key
auth: BitAuth.SecretText({
  displayName: 'API Key',
  description: 'Your API key',
  required: true,
}),

// Custom auth with validation
auth: BitAuth.CustomAuth({
  description: 'Connect to Service',
  required: true,
  props: {
    apiKey: BitAuth.SecretText({ displayName: 'API Key', required: true }),
    baseUrl: Property.ShortText({ displayName: 'Base URL', required: false }),
  },
  validate: async ({ auth }) => {
    try {
      // Test the credentials
      const response = await fetch(`${auth.baseUrl}/test`, {
        headers: { Authorization: `Bearer ${auth.apiKey}` }
      });
      if (!response.ok) throw new Error('Invalid credentials');
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  },
}),
```

## Browser Stubs (For Universal Bits)

If your bit uses Node.js modules that don't work in browser, or you want to replace specific flow when running in Tauri:

```typescript
// src/lib/stubs/node-fetch.ts
export default async function fetch(url: string, options?: any) {
  return window.fetch(url, options);
}
```

```json
// package.json
{
  "habits": {
    "stubs": {
      "node-fetch": "./dist/stubs/node-fetch.js"
    }
  }
}
```

## Common Patterns

### Single stub

Try to implement all business logic in a single driver.ts that is then stubbed. A single file or a max of two files is recommended for stubbing.

### API Call with Error Handling

```typescript
async run({ auth, propsValue }) {
  const response = await fetch(`${API_BASE_URL}/endpoint`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(propsValue),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error (${response.status}): ${error}`);
  }

  return response.json();
}
```

### Using Store for State

```typescript
async run({ store, propsValue }) {
  // Get previous value
  const lastValue = await store.get('key');

  // Store new value
  await store.put('key', newValue);

  // Delete value
  await store.delete('key');
}
```

## Checklist Before Completion

- [ ] All actions implemented and tested
- [ ] All triggers implemented and tested
- [ ] Auth validation works (if auth required)
- [ ] Error messages are human-readable
- [ ] Logs use structured logging
- [ ] package.json has correct metadata
- [ ] TypeScript compiles without errors
- [ ] Works in Node.js Cortex server
- [ ] Works in Tauri app
- [ ] Browser stubs provided (if universal runtime)

## When This Skill is Triggered

- User says "create bit", "new bit", "scaffold bit"
- User wants to add actions or triggers to existing bit
- User says "implement bit", "build bit"
- User provides a bit name and description
