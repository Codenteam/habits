---
title: "MCP Servers"
description: "Connect AI agents to external tools via Model Context Protocol"
---

# MCP Servers

Use `@ha-bits/bit-agent` with MCP (Model Context Protocol) to give AI agents access to Google Drive, Slack, GitHub, filesystem, and more.

**Related bit:** [`@ha-bits/bit-agent`](/bits/bit-agent)

## Quick Start (No Auth)

The simplest test uses the Everything MCP server, which requires no authentication:

```bash
export OPENAI_API_KEY=sk-...

npx nx dev @ha-bits/cortex --config showcase/agent-mcp-demo/stack.yaml

curl -X POST http://localhost:13000/api/agent-mcp-search \
  -H "Content-Type: application/json" \
  -d '{"query": "What tools do you have available?"}'
```

## Full Setup (Authenticated MCPs)

1. Copy `.env.example` to `.env`:

   ```bash
   cp showcase/agent-mcp-demo/.env.example showcase/agent-mcp-demo/.env
   ```

2. Configure credentials:

   | Secret | Description |
   |--------|-------------|
   | `OPENAI_API_KEY` | Your OpenAI API key |
   | `GDRIVE_CREDENTIALS` | Google Drive OAuth credentials (see [mcp-server-gdrive](https://github.com/anthropics/mcp-server-gdrive)) |
   | `SLACK_BOT_TOKEN` | Slack bot token — see [Slack setup](/integrations/slack/) |

3. Run with env file:

   ```bash
   npx nx dev @ha-bits/cortex --config showcase/agent-mcp-demo/stack.yaml --env showcase/agent-mcp-demo/.env
   ```

## Available MCP Presets

| Preset | Description | Required Secrets |
|--------|-------------|------------------|
| `everything` | Local utilities and testing | None |
| `google-drive` | Google Drive access | `GDRIVE_CREDENTIALS` |
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

Connect to custom MCP servers in your workflow YAML:

```yaml
mcpServers:
  - type: custom
    command: npx
    args: '-y,my-custom-mcp-server'
    env:
      MY_SECRET: '{{habits.env.MY_SECRET}}'
    transport: stdio

  - type: custom
    transport: sse
    url: 'http://localhost:8080/mcp'
```

## Example Queries

- "What tools do you have available?" — lists all MCP tools
- "Search for documents about budgets" — searches Google Drive
- "Find messages about the product launch in Slack" — searches Slack
- "What files are in my current directory?" — uses filesystem tools

<IntegrationShowcases integration="mcp-servers" />

## Related Integrations

- [OpenAI](/integrations/openai/) — powers the agent
- [Slack](/integrations/slack/) — Slack MCP preset
- [Google Drive](/integrations/google-drive/) — Drive MCP preset (different OAuth flow than bit-google-drive)
