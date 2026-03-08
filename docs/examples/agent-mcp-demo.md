# Agent MCP Demo

Demonstrates using the `@ha-bits/bit-agent` module with MCP (Model Context Protocol) integration to search across multiple data sources.

::: warning Beta Feature
**Agents are in beta** and breaking changes may be introduced at any time. 

**Not supported in Base UI**: Agents can only be configured via YAML and must be run with Cortex mode. The Base UI does not support agent configuration.
:::

<script setup>
import agentHabitYaml from '../../examples/agent-mcp-demo/habit.yaml?raw'
</script>

<DownloadExample examplePath="agent-mcp-demo" />

## What It Does

The agent can search across multiple data sources:
1. **Google Drive** - Documents, spreadsheets, and files
2. **Slack** - Messages and conversations
3. **Local filesystem** - Files and data via Everything MCP server

When you ask a question, the agent uses all available tools to provide comprehensive results.

## Why It's Included

Shows how Habits enables AI agents to interact with multiple services through the Model Context Protocol (MCP), making it easy to build intelligent workflows that can access and combine data from various sources.

## Workflow Visualization

<HabitViewer :content="agentHabitYaml" :hide-controls="true" :fit-view="true" :height="500" />

## Quick Start (No Auth Required)

The simplest way to test is with the Everything MCP server, which requires no authentication:

<ExampleRunner examplePath="agent-mcp-demo" />

::: code-group
```bash [Test]
curl -X POST http://localhost:13000/api/agent-mcp-search \
  -H "Content-Type: application/json" \
  -d '{"query": "What tools do you have available?"}'
```
:::

## Example Queries

Try these queries to test the agent:

```bash
# List available tools
curl -X POST http://localhost:13000/api/agent-mcp-search \
  -H "Content-Type: application/json" \
  -d '{"query": "What tools do you have available?"}'

# Search Slack (requires SLACK_BOT_TOKEN)
curl -X POST http://localhost:13000/api/agent-mcp-search \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the last channel created on slack?"}'

# Search Google Drive (requires GDRIVE_CREDENTIALS)
curl -X POST http://localhost:13000/api/agent-mcp-search \
  -H "Content-Type: application/json" \
  -d '{"query": "Search for documents about budgets"}'
```

## Full Setup (All MCPs)

To use Google Drive and Slack MCPs, you need to configure credentials:

1. Copy `.env.example` to `.env`:
   ```bash
   cp examples/agent-mcp-demo/.env.example examples/agent-mcp-demo/.env
   ```

2. Edit `.env` with your credentials:
   - **OPENAI_API_KEY**: Your OpenAI API key (required)
   - **GDRIVE_CREDENTIALS**: Google Drive OAuth credentials (see [mcp-server-gdrive](https://github.com/anthropics/mcp-server-gdrive))
   - **SLACK_BOT_TOKEN**: Slack bot token (create app at [api.slack.com](https://api.slack.com/apps))
   - **SLACK_TEAM_ID**: Your Slack team ID

3. Run the server with env file:
   ```bash
   npx habits@latest cortex --config examples/agent-mcp-demo/stack.yaml --env examples/agent-mcp-demo/.env
   ```

## Available MCP Presets

| Preset | Description | Required Secrets |
|--------|-------------|------------------|
| `everything` | Local utilities & testing | None |
| `google-drive` | Google Drive access | `GDRIVE_CREDENTIALS` |
| `slack` | Slack workspace | `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID` |
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

## Key Files

::: code-group
<<< @/../examples/agent-mcp-demo/habit.yaml [habit.yaml]

<<< @/../examples/agent-mcp-demo/.env.example [.env.example]

<<< @/../examples/agent-mcp-demo/stack.yaml [stack.yaml]


:::

## Important Notes

- **Beta Status**: The agent functionality is still in beta. Breaking changes may be introduced at any time.
- **Cortex Only**: Agents must be run with `npx habits@latest cortex`. They are not available in Base mode.
- **No Base UI Support**: Agents cannot be configured or run through the Base UI. Use YAML configuration only.
- **MCP Requirements**: Different MCP servers have different authentication requirements. See the table above.
- **Rate Limits**: Be aware of API rate limits for your LLM provider and MCP services.
