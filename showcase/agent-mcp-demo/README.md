# Agent MCP Demo

Demonstrates the `@ha-bits/bit-agent` with MCP (Model Context Protocol) integration.

## Quick Start (No Auth Required)

The simplest way to test is with the Everything MCP server, which requires no authentication:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# Run the server
npx nx dev @ha-bits/cortex --config showcase/agent-mcp-demo/stack.yaml

# Test (in another terminal)
curl -X POST http://localhost:13000/api/agent-mcp-search \
  -H "Content-Type: application/json" \
  -d '{"query": "What tools do you have available?"}'
```

## Full Setup (All MCPs)

To use Google Drive and Slack MCPs, you need to configure credentials:

1. Copy `.env.example` to `.env`:
   ```bash
   cp showcase/agent-mcp-demo/.env.example showcase/agent-mcp-demo/.env
   ```

2. Edit `.env` with your credentials:
   - **OPENAI_API_KEY**: Your OpenAI API key
   - **GDRIVE_CREDENTIALS**: Google Drive OAuth credentials (see [mcp-server-gdrive](https://github.com/anthropics/mcp-server-gdrive))
   - **SLACK_BOT_TOKEN**: Slack bot token (create app at [api.slack.com](https://api.slack.com/apps))

3. Run the server with env file:
   ```bash
   npx nx dev @ha-bits/cortex --config showcase/agent-mcp-demo/stack.yaml --env showcase/agent-mcp-demo/.env
   ```

## Available MCP Presets

| Preset | Description | Required Secrets |
|--------|-------------|------------------|
| `everything` | Local utilities & testing | None |
| `google-drive` | Google Drive access | `GDRIVE_CREDENTIALS` (see note) |
| `slack` | Slack workspace | `SLACK_BOT_TOKEN` |
| `github` | GitHub repos | `GITHUB_TOKEN` |
| `notion` | Notion workspace | `NOTION_API_KEY` |
| `figma` | Figma designs | `FIGMA_ACCESS_TOKEN` |
| `filesystem` | Local filesystem | None (configure paths) |
| `memory` | Persistent memory | None |
| `postgres` | PostgreSQL | `POSTGRES_CONNECTION_STRING` |
| `sqlite` | SQLite | `SQLITE_DB_PATH` |
| `brave` | Brave Search | `BRAVE_API_KEY` |
| `fetch` | Web fetching | None |

## Custom MCP Servers

You can also connect to custom MCP servers:

```yaml
mcpServers:
  - type: custom
    command: npx
    args: '-y,my-custom-mcp-server'
    env:
      MY_SECRET: '{{habits.env.MY_SECRET}}'
    transport: stdio

  # Or connect via SSE
  - type: custom
    transport: sse
    url: 'http://localhost:8080/mcp'
```

## Example Queries

- "What tools do you have available?" - Lists all MCP tools
- "Search for documents about budgets" - Searches Google Drive
- "Find messages about the product launch in Slack" - Searches Slack
- "What files are in my current directory?" - Uses filesystem tools
