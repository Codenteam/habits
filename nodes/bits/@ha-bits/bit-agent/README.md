# @ha-bits/bit-agent

AI Agent bit with LangChain and MCP (Model Context Protocol) integration for multi-tool AI workflows.

## Features

- **Multi-provider LLM support**: OpenAI, Anthropic (Claude), Google (Gemini)
- **MCP Integration**: Connect to any MCP server for tool access
- **Built-in MCP presets**: Google Drive, Slack, GitHub, Notion, Figma, Everything
- **Custom MCP servers**: Define your own MCP server connections
- **Dual transport**: Support for both stdio and SSE (Server-Sent Events) transports
- **Dynamic configuration**: Configure MCPs dynamically in your habit YAML

## Installation

```bash
npm install @ha-bits/bit-agent
```

## Usage

### Basic Example

```yaml
nodes:
  - id: agent-search
    type: bit
    data:
      framework: bits
      module: '@ha-bits/bit-agent'
      operation: run_agent
      source: npm
      credentials:
        agentAuth:
          llmProvider: openai
          apiKey: '{{habits.env.OPENAI_API_KEY}}'
          mcpSecrets:
            SLACK_BOT_TOKEN: '{{habits.env.SLACK_BOT_TOKEN}}'
            GDRIVE_CREDENTIALS: '{{habits.env.GDRIVE_CREDENTIALS}}'
      params:
        prompt: 'Search for documents about Q4 planning'
        mcpServers:
          - type: google-drive
          - type: slack
```

### With Custom MCP Server

```yaml
params:
  prompt: 'Analyze the local codebase'
  mcpServers:
    - type: custom
      command: npx
      args: ['@anthropic/mcp-server-filesystem', '/path/to/project']
      transport: stdio
```

### With SSE Transport

```yaml
params:
  prompt: 'Query the remote database'
  mcpServers:
    - type: custom
      transport: sse
      url: 'http://localhost:8080/mcp'
```

## Built-in MCP Presets

| Preset | Description | Required Secrets |
|--------|-------------|------------------|
| `google-drive` | Google Drive file access | `GOOGLE_DRIVE_CREDENTIALS` |
| `slack` | Slack workspace access | `SLACK_BOT_TOKEN` |
| `github` | GitHub repository access | `GITHUB_TOKEN` |
| `notion` | Notion workspace access | `NOTION_API_KEY` |
| `figma` | Figma design access | `FIGMA_ACCESS_TOKEN` |
| `everything` | Local filesystem & testing | None |

## Authentication

The `credentials` object must be nested under `agentAuth` key:

```yaml
credentials:
  agentAuth:
    llmProvider: openai  # or 'anthropic', 'google'
    apiKey: '{{habits.env.OPENAI_API_KEY}}'
    mcpSecrets:
      SLACK_BOT_TOKEN: '{{habits.env.SLACK_BOT_TOKEN}}'
```

## Action Parameters

### run_agent

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | The task or question for the agent |
| `systemPrompt` | string | No | - | System instructions for the agent |
| `mcpServers` | array | Yes | - | List of MCP servers to connect |
| `model` | string | No | Provider default | Model to use |
| `maxIterations` | number | No | 10 | Maximum agent iterations |
| `temperature` | number | No | 0.7 | LLM temperature |

## License

MIT
