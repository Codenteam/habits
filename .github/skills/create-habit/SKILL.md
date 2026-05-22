---
name: create-habit
description: 'Create new habits (workflows) with YAML frontends following a guided workflow: propose structure, create skeleton, implement workflows, create YAML frontend, and test. Use when user wants to create a new habit, add workflows, or scaffold a habit with a frontend UI.'
argument-hint: 'Name and purpose of the habit to create (e.g., "ai-quiz for generating quizzes")'
---

# Create Habit Skill

This skill guides the creation of new habits through a structured workflow.

## Workflow Overview

```
1. PROPOSE    → Present habit structure to user for approval
2. SKELETON   → Create minimal scaffolding, confirm with user
3. WORKFLOWS  → Implement each workflow using bits
4. FRONTEND   → Create frontend/index.yaml (YAML-driven UI)
5. TEST       → Test with pnpm nx test-habit and verify frontend
```

## Phase 1: Propose Structure

Before writing any code, present a detailed proposal to the user:

### Required Information to Gather

Ask the user (if not provided):
- **Habit name/id**: e.g., `ai-quiz` (snake-case, becomes the directory name)
- **Purpose**: What problem does this habit solve?
- **Workflows**: What workflows does it need?
- **Frontend**: Does it need a UI? What should the user experience look like?

### Structure Proposal Template

```markdown
## Proposed Habit: showcase/{habit-id}

**Description:** {purpose}
**Directory:** showcase/{habit-id}/

### Workflows

| Workflow ID | Display Name | Inputs | Outputs | Bits Used |
|-------------|--------------|--------|---------|-----------|
| {id}        | {Display}    | {list} | {list}  | {bits}    |

### Frontend UI
- Layout: {single|tabs|sidebar|wizard|mobile-shell|chat}
- Theme: {ha-bits-blue|ha-bits-purple|...}
- Key interactions: {describe what user does}

### File Structure
showcase/{habit-id}/
├── stack.yaml
├── habits/
│   └── {workflow-id}.yaml
└── frontend/
    └── index.yaml
```

**Wait for user approval before proceeding to Phase 2.**

## Phase 2: Create Skeleton

### Directory Structure

```
showcase/{habit-id}/
├── stack.yaml
├── habits/
│   └── {workflow-id}.yaml
└── frontend/
    └── index.yaml
```

### stack.yaml Template

```yaml
name: {Habit Display Name}
version: 0.0.1
description: {description}

server:
  port: 13000
  frontend: ./frontend

workflows:
  - id: {workflow-id}
    path: ./habits/{workflow-id}.yaml
    displayName: {Workflow Display Name}
```

### habits/{workflow-id}.yaml Template

```yaml
id: {workflow-id}
name: {Workflow Display Name}
description: {description}

nodes:
  - id: input-node
    type: action
    data:
      framework: bits
      source: npm
      module: "@ha-bits/bit-http"
      operation: request
      params:
        url: "https://api.example.com/endpoint"
        method: "POST"
        body: "{{habits.input.query}}"

edges: []

output:
  result: "{{input-node.result}}"
```

**Present skeleton to user and wait for approval before Phase 3.**

## Phase 3: Implement Workflows

Follow the habits schema (`schemas/habits.schema.yaml`) exactly when writing workflows.

### Key Patterns

- Use `{{habits.input.field}}` for workflow inputs
- Use `{{node-id.result.field}}` for data flow between nodes
- Use `{{habits.env.HABITS_VAR_NAME}}` for environment variables (always use `HABITS_` prefix)
- All edges must be listed, even if empty: `edges: []`
- Workflow `id` in the YAML file MUST match the `id` in `stack.yaml`

### Available Bits

```
bit-http          : HTTP requests (GET/POST/PUT/DELETE)
bit-openai        : OpenAI chat, embeddings, image generation
bit-string        : String manipulation
bit-if            : Conditional branching
bit-loop          : Iteration over arrays
bit-shell         : Run shell commands
bit-slack         : Send Slack messages
bit-discord       : Send Discord messages
bit-email         : Send emails
bit-telegram      : Send Telegram messages
bit-filesystem    : Read/write files
bit-database      : SQLite database operations
bit-database-mongodb : MongoDB operations
bit-database-sql  : SQL operations
bit-intersect     : Intersect AI API
```

Read each bit's `src/index.ts` before using it to learn exact action names and props.

## Phase 4: Create YAML Frontend

**CRITICAL: Always use `frontend/index.yaml` — NEVER create `frontend/index.html`.**

The frontend is compiled to HTML at request time by the Cortex server using `@ha-bits/cortex-core`.

### Schema Reference

The schema lives at `schemas/ui-spec.schema.yaml`. Add this comment at the top of the file:

```yaml
# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml
```

### Minimal Frontend Template

```yaml
# yaml-language-server: $schema=../../../schemas/ui-spec.schema.yaml
version: 1

meta:
  id: {habit-id}
  title: {Habit Title}
  icon: "🤖"

theme:
  preset: ha-bits-blue
  mode: dark

state:
  # All input fields and result state
  result: null

actions:
  run:
    method: POST
    endpoint: /api/{workflow-id}
    body: { field: "{{state.field}}" }
    responsePath: output
    onSuccess:
      set: { result: "$response" }
      toast: "Done!"
    onError:
      toast:
        message: "{{state.error}}"
        level: error

widgets:
  - kind: card
    title: {Habit Title}
    children:
      - kind: form
        bindTo: state
        fields:
          - { name: field, type: text, label: Your Input, required: true }
        submit: { label: Run, action: run, loadingLabel: "Running..." }
  - kind: result-panel
    source: state.result
    showWhen: state.result
    title: Result
    sections:
      - { kind: json-dump, source: state.result, copy: true }
```

### Layout Options

| Layout | Use When |
|--------|----------|
| `single` | Simple single-page form |
| `tabs` | Multiple workflows or views |
| `sidebar` | Navigation + content area |
| `wizard` | Multi-step workflow |
| `mobile-shell` | Mobile-first app feel |
| `chat` | Conversational interface |

### Theme Presets

| Preset | Look |
|--------|------|
| `ha-bits-blue` | Default blue, dark |
| `ha-bits-purple` | Purple, dark |
| `ha-bits-cyan` | Cyan, dark |
| `ha-bits-emerald` | Green, dark |
| `ha-bits-red` | Red/danger, dark |
| `aurora` | Aurora gradient-free dark |
| `cyberpunk` | Neon cyberpunk dark |
| `mobile-blue` | Mobile-optimized blue |
| `tailwind-dark` | Plain Tailwind dark |

### Common Widget Patterns

#### Form with submit
```yaml
- kind: form
  bindTo: state
  fields:
    - { name: query, type: text, label: Query, required: true }
    - { name: tone, type: select, label: Tone, options: [Professional, Casual, Friendly] }
    - { name: content, type: textarea, label: Content, rows: 6 }
  submit: { label: Generate, action: generate, loadingLabel: "Generating..." }
```

#### Result panel with sections
```yaml
- kind: result-panel
  source: state.result
  showWhen: state.result
  title: Output
  sections:
    - { kind: markdown, source: state.result.text }
    - { kind: json-dump, source: state.result, copy: true }
```

#### Metric grid
```yaml
- kind: metric-grid
  columns: 3
  metrics:
    - { value: "{{state.result.count}}", label: "Total Items" }
    - { value: "{{state.result.score}}", label: "Score" }
```

#### Tabs layout
```yaml
layout:
  type: tabs
  nav:
    - { id: input, label: Input }
    - { id: results, label: Results }

defaultView: input

views:
  input:
    widgets:
      - kind: form
        ...
  results:
    widgets:
      - kind: result-panel
        ...
```

#### Streaming output
```yaml
actions:
  stream:
    method: POST
    endpoint: /api/{workflow-id}
    stream: ndjson
    events:
      - { append: state.chunks }
      - { match: { done: true }, set: { streaming: false } }

widgets:
  - kind: streaming-panel
    source: state.chunks
    showWhen: state.streaming
```

### API Response Parsing

The response from `POST /api/{workflow-id}` has the shape:
```json
{ "output": { "fieldName": "value" } }
```

In the frontend YAML, use `responsePath: output` to get `data.output`, then use
`"$response"` in `onSuccess.set` to capture the whole output object:
```yaml
onSuccess:
  set: { result: "$response" }
```

Then access fields like `{{state.result.fieldName}}` in templates.

### Examples to Reference

Browse these for real patterns:
- Simple form: `showcase/hello-world/frontend/index.yaml`
- Tabs + history: `showcase/ai-quiz/frontend/index.yaml`
- Streaming NDJSON: `showcase/marketing-campaign/frontend/index.yaml`
- Chat layout: `showcase/openclaw-clone/frontend/index.yaml`
- OAuth gating: `showcase/cloud-file-upload/frontend/index.yaml`
- Multi-platform tabs: `showcase/social-media-manager/frontend/index.yaml`

## Phase 5: Test

### Test the Habit

```bash
pnpm nx test-habit @ha-bits/manage --path=showcase/{habit-id}/stack.yaml
```

Capture all logs and verify there are no errors.

### Test Frontend Compilation

```bash
pnpm nx build @ha-bits/cortex-core
node scripts/smoke-test-ui-engine.mjs showcase/{habit-id}/frontend/index.yaml
```

### Run Dev Server to Preview UI

```bash
pnpm habits dev showcase/{habit-id}/stack.yaml
# open http://localhost:13000/
```

Check that:
- [ ] All workflows execute without errors
- [ ] Frontend compiles without errors
- [ ] Forms submit correctly
- [ ] Results display properly
- [ ] Theme and layout look as expected

## Common Mistakes to Avoid

1. **Never use `frontend/index.html`** — always use `frontend/index.yaml`
2. **No CSS gradients** — use solid colors only (enforced by YAML engine)
3. **Workflow ID mismatch** — `id` in habit YAML must match `id` in stack.yaml
4. **Wrong env var prefix** — always use `HABITS_` prefix (e.g., `HABITS_OPENAI_API_KEY`)
5. **Wrong API endpoint** — use `/api/{workflow-id}` (NOT `/api/workflows/{id}/run`)
6. **No edges field** — always include `edges: []` even if empty
7. **Missing defaults for optional fields** — use `"{{habits.input.name || ''}}"` not `"{{habits.input.name}}"`

## When This Skill is Triggered

- User says "create habit", "new habit", "scaffold habit", "build habit"
- User wants to add workflows to an existing habit
- User says "create a frontend for a habit", "build UI for habit"
- User provides a habit idea and wants a complete implementation
