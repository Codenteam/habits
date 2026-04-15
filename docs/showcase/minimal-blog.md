---
title: "Minimal Blog"
description: "A complete blog API backend with authentication, CRUD endpoints, and database integration using Habits bits."
aside: false
---

<script setup>
import { Server, Database } from 'lucide-vue-next'

const images = [
    { img: '/showcase/minimal-blog/1.webp', caption: 'Minimal Blog' }
]

const habitTabs = [
    { label: 'create-post', url: '/showcase/minimal-blog/create-post.yaml' },
    { label: 'delete-post', url: '/showcase/minimal-blog/delete-post.yaml' },
    { label: 'get-post', url: '/showcase/minimal-blog/get-post.yaml' }
]
</script>

# Minimal Blog

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-beginner">
        <span class="difficulty-dot"></span>
        Beginner
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-api"><component :is="Server" :size="12" /> api</span> <span class="showcase-tag tag-database"><component :is="Database" :size="12" /> database</span> <span class="showcase-tag tag-backend"><component :is="Server" :size="12" /> backend</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="minimal-blog" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<p class="showcase-description">A complete blog API backend with authentication, CRUD endpoints, and database integration using Habits bits.</p>

Build a production-ready blog API in minutes with the Minimal Blog example.
This showcases how Habits can create full backend applications with minimal code.

## Features

- **User Authentication**: JWT-based login and registration
- **Blog Posts CRUD**: Create, read, update, and delete posts
- **Database Integration**: SQLite/PostgreSQL with automatic migrations
- **API Documentation**: Well-structured RESTful endpoints

Perfect for learning how to build API backends with Habits, or as a starter
template for your own content management systems.



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

- Node.js 18+

## Key Files

::: code-group
<<< @/../showcase/minimal-blog/stack.yaml [stack.yaml]

<<< @/../showcase/minimal-blog/.env.example [.env.example]

<<< @/../showcase/minimal-blog/habits/create-post.yaml [create-post.yaml]

<<< @/../showcase/minimal-blog/habits/delete-post.yaml [delete-post.yaml]

<<< @/../showcase/minimal-blog/habits/get-post.yaml [get-post.yaml]
:::

## Quick Start

<ExampleRunner examplePath="minimal-blog" />

<DownloadExample examplePath="minimal-blog" />
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
