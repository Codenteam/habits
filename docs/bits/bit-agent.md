---
title: "Agent"
description: "AI Agent with LangChain and MCP integration. Connect to multiple MCP servers to give your agent access to tools like Google Drive, Slack, GitHub, Notion, Figma, and more."
aside: false
---

<script setup>
import { Bot } from 'lucide-vue-next'
</script>

# <component :is="Bot" :size="32" class="inline-icon" /> Agent

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-agent`</span>
  <span class="bit-version">v0.1.2</span>
  <span class="bit-downloads">📥 202 downloads</span>
  <span class="bit-categories"><span class="bit-category">agent</span> <span class="bit-category">langchain</span> <span class="bit-category">mcp</span> <span class="bit-category">model-context-protocol</span> <span class="bit-category">ai</span></span>
</div>

AI Agent with LangChain and MCP integration. Connect to multiple MCP servers to give your agent access to tools like Google Drive, Slack, GitHub, Notion, Figma, and more.

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-agent-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-agent"
    action: "run_agent"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Run Agent** | Execute an AI agent with MCP tool access. The agent can use tools from multiple MCP servers to complete tasks. |

## Used In Showcases

- [agent-mcp-demo](/showcase/agent-mcp-demo)

<style>
.bit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0 24px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.bit-package {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
}

.bit-version {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
}

.bit-downloads {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
  background: var(--vp-c-bg-alt);
  padding: 4px 10px;
  border-radius: 12px;
}

.bit-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.bit-category {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
}

.inline-icon {
  display: inline;
  vertical-align: middle;
  margin-right: 8px;
}

.vp-doc h2 {
  border-top-width: 0px;
}
</style>
