# Habit Schema

Workflows in Habits define automation sequences by connecting nodes that execute in order.

## Full Schema

<<< @/../schemas/habits.schema.yaml

## Workflow Structure

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the workflow |
| `name` | string | Yes | Human-readable name |
| `description` | string | No | Workflow description |
| `inputs` | object | No | Input parameters with types and defaults |
| `nodes` | array | Yes | List of node definitions |
| `edges` | array | Yes | Node connections defining execution flow |
| `output` | object | No | Output mapping for workflow results |

## Nodes

Each node represents a single operation in your workflow.

### Node Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the node |
| `type` | string |  `script` or `bit` |
| `position` | object | Optional `{ x, y }` coordinates for visual layout |
| `data` | object | Node configuration (see below) |

### Node Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Display name for the node |
| `framework` | string | `script` or `bits` |
| `module` | string | Module/package name (e.g., `@ha-bits/bit-openai`) |
| `operation` | string | Operation to execute |
| `source` | string | Module source (`npm`, `inline`) |
| `isTrigger` | boolean | Marks node as workflow entry point |
| `params` | object | Operation parameters |
| `credentials` | object | Authentication credentials |
| `inputTransforms` | object | Input data transformations |
| `stopAfterIf` | object | Conditional stop with `expr` and `skipIfStopped` |

### Script Params

For `type: script` nodes:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Set to `"script"` |
| `language` | string | `bash`, `deno`, `go`, `python3`, `sql`, or `typescript` |
| `script` | string | The script code to execute |

## Edges

Edges define how data flows between nodes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | No | Unique identifier for the edge |
| `source` | string | Yes | ID of the source node |
| `target` | string | Yes | ID of the target node |
| `sourceHandle` | string | No | Output handle on source node |
| `targetHandle` | string | No | Input handle on target node |

## Data References

Reference data from other nodes using template syntax:

<div v-pre>

| Pattern | Description |
|---------|-------------|
| `{{<nodeId>}}` | Full output from a specific node |
| `{{<nodeId>.<path>}}` | Nested property from node output (JSON) |
| `{{habits.env.<VAR>}}` | Environment variable |
| `{{habits.input.<field>}}` | Runtime input parameter |
| `{{habits.header.<header>}}` | Request header |
| `{{habits.cookies.<cookie>}}` | Request cookie |

</div>

## Stack Configuration

The `stack.yaml` file defines workflows and server settings:

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Config version |
| `workflows` | array | Workflow paths or inline definitions |
| `server.port` | number | Server port (default: 3000) |
| `server.host` | string | Server host (default: 0.0.0.0) |
| `logging` | object | Logging configuration |


## Next Steps

- [Creating Habits](/deep-dive/creating) - Build workflows visually or as code
- [Running Automations](/deep-dive/running) - Execute and monitor workflows
- [Showcase](/showcase/) - Browse complete showcase
