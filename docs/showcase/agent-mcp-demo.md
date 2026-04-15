---
title: "Agent MCP Demo"
description: "An intelligent AI agent with MCP integration enabling multi-source search across Google Drive, Slack, and filesystem."
aside: false
---

<script setup>
import { Brain, Tag } from 'lucide-vue-next'

const images = [
    { img: '/showcase/agent-mcp-demo/agent-default.svg', caption: 'Agent MCP Demo' }
]
</script>

# Agent MCP Demo

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-advanced">
        <span class="difficulty-dot"></span>
        Advanced
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-ai"><component :is="Brain" :size="12" /> ai</span> <span class="showcase-tag tag-integration"><component :is="Tag" :size="12" /> integration</span> <span class="showcase-tag tag-developer"><component :is="Tag" :size="12" /> developer</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="agent-mcp-demo" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<p class="showcase-description">An intelligent AI agent with MCP integration enabling multi-source search across Google Drive, Slack, and filesystem.</p>

Experience the power of AI agents with Model Context Protocol (MCP) integration.
This example demonstrates how to build agents that can access multiple data sources.

## Capabilities

- **Multi-Source Search**: Query across Google Drive, Slack, and local files
- **MCP Integration**: Uses the Model Context Protocol for tool access
- **Intelligent Agent**: Claude-powered reasoning and task execution
- **Context Awareness**: Maintains conversation context across queries

This example showcases how Habits can power sophisticated AI agents that go
beyond simple chat to actually interact with your tools and data.


## Requirements

- Claude API key (via env var)
- MCP server running (optional)
- Google Drive credentials (optional)

## Key Files

::: code-group
<<< @/../showcase/agent-mcp-demo/stack.yaml [stack.yaml]

<<< @/../showcase/agent-mcp-demo/habit.yaml [habit.yaml]

<<< @/../showcase/agent-mcp-demo/.env.example [.env.example]
:::

## Quick Start

<ExampleRunner examplePath="agent-mcp-demo" />

<DownloadExample examplePath="agent-mcp-demo" />
<style>
.showcase-header {
  margin: 20px 0 28px;
}

.showcase-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-right {
  flex-shrink: 0;
}

.meta-divider {
  width: 1px;
  height: 20px;
  background: var(--vp-c-divider);
}

.difficulty-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 500;
  letter-spacing: 0.01em;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
}

.difficulty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.difficulty-beginner .difficulty-dot {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.difficulty-intermediate .difficulty-dot {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.difficulty-advanced .difficulty-dot {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.showcase-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 0.75em;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  transition: all 0.15s ease;
}

.showcase-tag:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.showcase-tag svg {
  opacity: 0.7;
}

.showcase-description {
  font-size: 1.1em;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 24px;
}

.gallery-container {
  float: right;
  width: 400px;
  margin-left: 24px;
  margin-bottom: 16px;
}

.vp-doc h2 {
  border-top-width: 0;
}

@media (max-width: 768px) {
  .showcase-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .meta-divider {
    display: none;
  }
  
  .gallery-container {
    float: none;
    width: 100%;
    margin: 0 0 20px;
  }
}
</style>
