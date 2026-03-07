# Variables Reference

Habits uses a powerful variable system to pass data between nodes, access request data, environment variables, and utility functions. Variables use the `{{expression}}` syntax and are resolved at runtime.

::: v-pre

## Variable Syntax

Variables are enclosed in double curly braces:
```
{{variable.path}}
```

Supports:
- Dot notation: `{{habits.input.userId}}`
- Nested access: `{{previous-node.result.items.name}}`
- Array indexing: `{{node-id.output.0.data}}`

---

## Variable Categories

### Request Input (`habits.input.*`)

Access data from HTTP POST requests or CLI arguments.

| Variable | Description | Example |
|----------|-------------|---------|
| `{{habits.input}}` | Full request body | `{"name": "John", "age": 30}` |
| `{{habits.input.fieldName}}` | Specific field from request (POST or GET) | `{{habits.input.userId}}` |
| `{{habits.input.query}}` | Nested Params | `{{habits.input.query.page}}` |

**HTTP Request Example:**
```bash
curl -X POST http://localhost:3000/api/my-workflow \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "action": "send"}'
```

In your workflow, access with:
- `{{habits.input.userId}}` → `"123"`
- `{{habits.input.action}}` → `"send"`

**CLI Example:**
```bash
habits execute --config ./stack.yaml --id my-workflow --input '{"userId": "123"}'
```

---

### HTTP Headers (`habits.header.*`)

Access HTTP request headers (case-insensitive).

| Variable | Description | Example |
|----------|-------------|---------|
| `{{habits.header.authorization}}` | Authorization header | Bearer token |
| `{{habits.header.content-type}}` | Content type | application/json |
| `{{habits.header.x-custom-header}}` | Custom headers | Any custom value |

**Note:** Header names are case-insensitive. `{{habits.header.Authorization}}` and `{{habits.header.authorization}}` resolve to the same value.

---

### Environment Variables (`habits.env.*`)

Access environment variables for configuration and secrets.

| Variable | Description |
|----------|-------------|
| `{{habits.env.VAR_NAME}}` | Value of environment variable |
| `{{habits.env.OPENAI_API_KEY}}` | Example: OpenAI API key |
| `{{habits.env.DATABASE_URL}}` | Example: Database connection string |

**Security Note:** Use environment variables for sensitive data like API keys, passwords, and connection strings. Never hardcode secrets in workflows.

**Example `.env` file:**
```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:pass@localhost/db
API_BASE_URL=https://api.example.com
```

**Usage in workflow:**
```yaml
nodes:
  - id: call-api
    data:
      params:
        apiKey: "{{habits.env.OPENAI_API_KEY}}"
        url: "{{habits.env.API_BASE_URL}}/chat"
```

---

### Workflow Context (`habits.context.*`)

Access metadata about the current workflow execution.

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `{{habits.context.workflowId}}` | Current workflow ID | `"my-workflow"` |
| `{{habits.context.workflowName}}` | Workflow display name | `"My Workflow"` |
| `{{habits.context.executionId}}` | Unique execution run ID | `"550e8400-e29b..."` |
| `{{habits.context.timestamp}}` | Execution start time (ISO) | `"2024-01-15T10:30:00.000Z"` |
| `{{habits.context.startTime}}` | Same as timestamp | `"2024-01-15T10:30:00.000Z"` |
| `{{habits.context.nodeId}}` | Currently executing node ID | `"send-email"` |

**Use Cases:**
- Logging and auditing
- Creating unique identifiers
- Tracking execution flow
- Debugging

---

### Utility Functions (`habits.function.*`)

Built-in functions for common operations.

| Function | Description | Example Output |
|----------|-------------|----------------|
| `{{habits.function.date()}}` | Current date/time (ISO format) | `"2024-01-15T10:30:00.000Z"` |
| `{{habits.function.now()}}` | Alias for `date()` | `"2024-01-15T10:30:00.000Z"` |
| `{{habits.function.timestamp()}}` | Unix timestamp (milliseconds) | `1705315800000` |
| `{{habits.function.uuid()}}` | Generate random UUID v4 | `"550e8400-e29b-41d4..."` |
| `{{habits.function.random(min, max)}}` | Random float in range | `0.7234` (for 0-1) |
| `{{habits.function.randomInt(min, max)}}` | Random integer in range | `42` (for 1-100) |
| `{{habits.function.stringify(value)}}` | Convert to JSON string | `"value"` |

**Examples:**
```yaml
params:
  uniqueId: "{{habits.function.uuid()}}"
  createdAt: "{{habits.function.date()}}"
  randomScore: "{{habits.function.random(0, 100)}}"
  diceRoll: "{{habits.function.randomInt(1, 6)}}"
```

---

### Previous Node Outputs (`{{nodeId.*}}`)

Reference output from previous nodes using their node ID.

| Variable | Description |
|----------|-------------|
| `{{node-id.output}}` | Full output from node |
| `{{node-id.output.fieldName}}` | Specific field from output |
| `{{node-id.status}}` | Node execution status |
| `{{node-id.output[0]}}` | Array indexing |

**Example workflow:**
```yaml
nodes:
  - id: fetch-data
    data:
      module: "@ha-bits/bit-http"
      params:
        url: "https://api.example.com/users"
        method: GET

  - id: process-data
    data:
      module: "@ha-bits/bit-code"
      params:
        input: "{{fetch-data.output}}"
        # Access nested data
        firstUser: "{{fetch-data.output.data[0].name}}"
```

**Note:** Node IDs must be unique within a workflow. Use descriptive IDs like `fetch-users`, `send-email`, `transform-data`.

---

## Variable Resolution Order

When a variable is evaluated, Habits checks in this order:

1. **`habits.env.*`** - Environment variables (from `process.env`)
2. **`habits.function.*`** - Utility functions
3. **`habits.context.*`** - Workflow execution context
4. **`habits.header.*`** - HTTP request headers
5. **`habits.input.*`** - Request body / CLI input
6. **`{nodeId}.*`** - Previous node outputs
7. **Direct context access** - Raw context property

---

## Examples

### Complete Workflow Example

```yaml
name: User Notification Workflow
nodes:
  - id: get-user
    data:
      framework: bits
      module: "@ha-bits/bit-http"
      params:
        url: "{{habits.env.API_URL}}/users/{{habits.input.userId}}"
        headers:
          Authorization: "Bearer {{habits.env.API_TOKEN}}"

  - id: send-notification
    data:
      framework: bits
      module: "@ha-bits/bit-email"
      params:
        to: "{{get-user.output.email}}"
        subject: "Hello {{get-user.output.name}}!"
        body: |
          Hi {{get-user.output.name}},
          
          This notification was sent at {{habits.function.date()}}.
          Execution ID: {{habits.context.executionId}}
          
          Best regards,
          Automated System

edges:
  - source: get-user
    target: send-notification
```

### Using Variables in Conditions

```yaml
- id: check-status
  data:
    framework: bits
    module: "@ha-bits/bit-if"
    params:
      branches:
        - value1: "{{previous-node.output.status}}"
          operator: equals
          value2: "success"
          label: on-success
        - value1: "{{previous-node.output.status}}"
          operator: equals
          value2: "error"
          label: on-error
```

---

## Troubleshooting

### Variable Not Resolving

**Symptom:** Variable appears as literal text `{{habits.input.userId}}`

**Causes:**
1. Typo in variable path
2. Property doesn't exist in context
3. Node hasn't executed yet

**Solution:** Check the execution logs for warnings about missing properties.

### Environment Variable Not Found

**Symptom:** Empty string returned for `{{habits.env.VAR_NAME}}`

**Causes:**
1. Variable not set in environment
2. Variable name case mismatch (environment variables are case-sensitive)

**Solution:**
- Check `.env` file exists and is loaded
- Verify exact variable name
- Use `habits.env.VAR_NAME` (not `$VAR_NAME`)

### Node Output Not Available

**Symptom:** Error accessing `{{node-id.output}}`

**Causes:**
1. Node hasn't executed yet (check edge connections)
2. Node ID typo
3. Node was skipped due to flow control

**Solution:**
- Verify edge connections in workflow
- Check node execution status in logs
- Use exact node ID (case-sensitive)

:::
