---
title: "Hello World Habit"
description: "Simple Habit to showcase the possible methods and ways to consume bits and read from both env and input."
aside: false
---

<script setup>
import { Layout, Server, Tag } from 'lucide-vue-next'

const images = [
    { img: '/showcase/hello-world/1.webp', caption: 'Hello World Habit' }
]

const habitTabs = [
    { label: 'habit', url: '/showcase/hello-world/habit.yaml' },
    { label: 'habit-env', url: '/showcase/hello-world/habit-env.yaml' }
]
</script>

# Hello World Habit

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-beginner">
        <span class="difficulty-dot"></span>
        Beginner
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-frontend"><component :is="Layout" :size="12" /> frontend</span> <span class="showcase-tag tag-backend"><component :is="Server" :size="12" /> backend</span> <span class="showcase-tag tag-creative"><component :is="Tag" :size="12" /> creative</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="hello-world" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<p class="showcase-description">Simple Habit to showcase the possible methods and ways to consume bits and read from both env and input.</p>

This habit demonstrates a minimal "Hello World" automation using the habits framework. It shows how to:

- Access environment variables (e.g., `PARAM1`), which are kept in keyring on apps (iOS, Android, MacOS, Linux, Windows) and in .env on servers
- Read user input parameters
- Output results to both logs (Servers) and the UI (Apps)
- Structure a habit YAML according to the habits.schema.yaml

Use this as a starting point for building more complex automations that interact with both backend and frontend components. All code and configuration follow the project’s minimalistic, mobile-first, and dark mode UI guidelines.



<hr style="clear:both;">

## Run Your .habit File

<Checklist name="dot-habit/mobile" title="Run on Mobile" icon="smartphone">

<!--@include: ../getting-started/checklists/dot-habit/mobile.md{3,}-->

</Checklist>

<Checklist name="dot-habit/desktop" title="Run on Desktop" icon="monitor">

<!--@include: ../getting-started/checklists/dot-habit/desktop.md{3,}-->

</Checklist>

<Checklist name="dot-habit/server" title="Run on Server" icon="server">

<!--@include: ../getting-started/checklists/dot-habit/server.md{3,}-->

</Checklist>

<Checklist name="dot-habit/serverless" title="Run Serverless" icon="cloud">

<!--@include: ../getting-started/checklists/dot-habit/serverless.md{3,}-->

</Checklist>

## Workflow Visualization

<HabitViewerTabs :tabs="habitTabs" :height="450" />

## Requirements

- PARAM1 environment key

## Key Files

::: code-group
<<< @/../showcase/hello-world/stack.yaml [stack.yaml]

<<< @/../showcase/hello-world/habit.yaml [habit.yaml]
:::

## Quick Start

<ExampleRunner examplePath="hello-world" />

<DownloadExample examplePath="hello-world" />
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
