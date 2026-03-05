# OpenClaw Clone Example

A personal AI assistant clone inspired by [OpenClaw](https://openclaw.ai/), built with Habits. This example demonstrates how to create a full-featured AI assistant with persistent memory, task management, and multi-channel messaging capabilities.

<div id="openclaw-clone-screenshot">

![OpenClaw-clone built with Habits](/images/openclaw-clone.webp)
*OpenClaw-clone - AI Assistant built with Habits*

</div>

<DownloadExample examplePath="openclaw-clone" />

## What It Does

Provides a complete personal AI assistant with:
- **AI Chat** - Natural conversation with contextual memory
- **Persistent Memory** - Stores and recalls information about you
- **Task Management** - Create, view, and complete tasks
- **Multi-Channel Messaging** - Send messages via Telegram, WhatsApp, Slack
- **Email Integration** - Send emails via SMTP
- **Web Browsing** - Fetch and parse web content
- **Summarization** - AI-powered content summaries
- **Heartbeat** - Proactive check-ins with status updates

## Why It's Included

Demonstrates Habits as a foundation for building AI assistants - showing how declarative workflows can replace complex agent frameworks while maintaining extensibility through bits.

## Quick Start

<ExampleRunner examplePath="openclaw-clone" />

::: code-group
```bash [Chat]
curl -X POST http://localhost:13000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"input": {"message": "Hello! What can you do?", "userId": "user123"}}'
```

```bash [Create Task]
curl -X POST http://localhost:13000/api/create-task \
  -H "Content-Type: application/json" \
  -d '{"input": {"title": "Review project", "priority": "high", "userId": "user123"}}'
```
:::

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Main chat interface |
| `/api/create-memory` | POST | Store a memory |
| `/api/search-memory` | POST | Search memories |
| `/api/get-memories` | POST | List all memories |
| `/api/create-task` | POST | Create a task |
| `/api/get-tasks` | POST | List tasks |
| `/api/complete-task` | POST | Mark task complete |
| `/api/send-telegram` | POST | Send Telegram message |
| `/api/send-whatsapp` | POST | Send WhatsApp message |
| `/api/send-slack` | POST | Send Slack message |
| `/api/send-email` | POST | Send email |
| `/api/browse-web` | POST | Fetch webpage |
| `/api/summarize` | POST | Summarize content |
| `/api/heartbeat` | POST | Get proactive status |
| `/misc/workflows` | GET | List all workflows |
| `/health` | GET | Health check |

## Key Files

::: code-group
```yaml [stack.yaml]
version: "1.0"
workflows:
  - id: chat
    path: ./habits/chat.yaml
    enabled: true
  - id: create-memory
    path: ./habits/create-memory.yaml
    enabled: true
  # ... 14 total workflows
server:
  port: 13000
  frontend: ./frontend
  openapi: true
```

```yaml [chat.yaml]
id: chat
name: Chat with AI

input:
  - id: message
    type: string
    required: true
  - id: userId
    type: string

nodes:
  - id: get-context
    type: bits
    data:
      module: "@ha-bits/bit-database"
      operation: query
      params:
        collection: "memories"
        filter: '{"userId": "{{habits.input.userId}}"}'
  
  - id: ai-response
    type: bits
    data:
      module: "@ha-bits/bit-intersect"
      operation: ask_chatgpt
      params:
        systemMessage: |
          You are Claw, a helpful assistant.
          Context: {{get-context.results}}
        prompt: "{{habits.input.message}}"

edges:
  - source: get-context
    target: ai-response

output:
  response: "{{ai-response}}"
```
:::

## Frontend

The example includes a modern chat interface at `http://localhost:13000/`:

- **Chat** (`/`) - Main conversation interface with assistant
- **Dashboard** (`/dashboard.html`) - Overview of tasks, memories, and integrations
- **Memories** (`/memories.html`) - View and manage stored memories
- **Tasks** (`/tasks.html`) - Task list with filtering and completion

## Environment Variables

Create a `.env` file with your API keys:

<<< @/../examples/openclaw-clone/.env.example

## Bits Used

| Bit | Purpose |
|-----|---------|
| `@ha-bits/bit-intersect` | AI/LLM integration |
| `@ha-bits/bit-database` | Persistent storage |
| `@ha-bits/bit-telegram` | Telegram messaging |
| `@ha-bits/bit-whatsapp` | WhatsApp messaging |
| `@ha-bits/bit-slack` | Slack messaging |
| `@ha-bits/bit-email` | Email via SMTP |
| `@ha-bits/bit-http` | Web requests |

## Extending

Add new skills by creating additional habit files:

```yaml
# habits/my-skill.yaml
id: my-skill
name: My Custom Skill

input:
  - id: param1
    type: string

nodes:
  - id: do-something
    type: bits
    data:
      module: "@ha-bits/bit-http"
      operation: request
      params:
        url: "https://api.example.com"
        method: "GET"

output:
  result: "{{do-something.body}}"
```

Then add to `stack.yaml`:

```yaml
workflows:
  - id: my-skill
    path: ./habits/my-skill.yaml
    enabled: true
```

## Comparison with OpenClaw

| Feature | OpenClaw | This Clone |
|---------|----------|------------|
| AI Chat | ✅ Claude/GPT | ✅ GPT-4/compatible |
| Memory | ✅ Persistent | ✅ Database-backed |
| Telegram | ✅ | ✅ |
| WhatsApp | ✅ | ✅ |
| Slack | ✅ | ✅ |
| Discord | ✅ | ✅ |
| Email | ✅ | ✅ |
| Browser | ✅ Full control | ✅ HTTP fetch |
| Tasks | ✅ | ✅ |
| Skills/Plugins | ✅ | ✅ (habits) |
| Heartbeat | ✅ | ✅ |
| File Access | ✅ Full system | ✅ |
| Shell Commands | ✅ | ✅ |


