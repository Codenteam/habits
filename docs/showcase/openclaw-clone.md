---
title: "OpenClaw Clone"
description: "A full-stack legal document analysis platform with AI-powered contract review, clause extraction, and risk assessment."
aside: false
---

<script setup>
import { Brain, Layout, Tag, Database } from 'lucide-vue-next'

import habit0 from '../../showcase/openclaw-clone/habits/browse-web.yaml?raw'
import habit1 from '../../showcase/openclaw-clone/habits/chat.yaml?raw'
import habit2 from '../../showcase/openclaw-clone/habits/complete-task.yaml?raw'

const images = [
    { img: '/showcase/openclaw-clone/fullstack-default.svg', caption: 'OpenClaw Clone' }
]

const habitTabs = [
    { label: 'browse-web', content: habit0 },
    { label: 'chat', content: habit1 },
    { label: 'complete-task', content: habit2 }
]
</script>

# OpenClaw Clone
<div class="showcase-meta">
  <span class="difficulty-badge difficulty-advanced"><span class="showcase-difficulty difficulty-advanced">Advanced</span></span>
  <span class="tags"><span class="showcase-tag tag-ai"><component :is="Brain" :size="14" /> ai</span> <span class="showcase-tag tag-frontend"><component :is="Layout" :size="14" /> frontend</span> <span class="showcase-tag tag-business"><component :is="Tag" :size="14" /> business</span> <span class="showcase-tag tag-database"><component :is="Database" :size="14" /> database</span></span>
  <DownloadExample examplePath="openclaw-clone" />
</div>

> A full-stack legal document analysis platform with AI-powered contract review, clause extraction, and risk assessment.
<div>
<ShowcaseHero :images="images" />
</div>
Build a complete legal tech platform with the OpenClaw Clone example.
This demonstrates how Habits can power sophisticated full-stack applications.

## Features

- **Contract Analysis**: AI-powered review of legal documents
- **Clause Extraction**: Automatically identify key contract clauses
- **Risk Assessment**: Flag potentially problematic terms
- **Frontend UI**: Complete React-based interface
- **Database Storage**: Persist documents and analysis results

This is a comprehensive example showing how to build production-ready
SaaS applications with Habits.


## Workflow Visualization

<HabitViewerTabs :tabs="habitTabs" :height="450" />

## Requirements

- OpenAI API key
- PostgreSQL database

## Key Files

::: code-group
<<< @/../showcase/openclaw-clone/stack.yaml [stack.yaml]

<<< @/../showcase/openclaw-clone/.env.example [.env.example]

<<< @/../showcase/openclaw-clone/habits/browse-web.yaml [browse-web.yaml]

<<< @/../showcase/openclaw-clone/habits/chat.yaml [chat.yaml]

<<< @/../showcase/openclaw-clone/habits/complete-task.yaml [complete-task.yaml]
:::

## Quick Start

<ExampleRunner examplePath="openclaw-clone" />

<DownloadExample examplePath="openclaw-clone" />

<style>
.showcase-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0 24px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  justify-content: space-between;
}
.showcase-tag {
    display: flex;
    gap: 5px;
    align-items: center;
  }
.difficulty-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85em;
}

.difficulty-beginner {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.difficulty-intermediate {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}

.difficulty-advanced {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tags code {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
}
</style>
