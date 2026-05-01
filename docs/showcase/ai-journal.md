---
title: "AI Journal"
description: "Your personal AI-powered journaling companion that analyzes entries, tracks mood patterns, and provides compassionate weekly insights."
aside: false
---

<script setup>
import { Brain, Tag, Layout } from 'lucide-vue-next'

const images = [
    { img: '/showcase/ai-journal/1.png', caption: 'AI Journal' },
    { img: '/showcase/ai-journal/2.png', caption: 'AI Journal' }
]

const habitTabs = [
    { label: 'save-entry', url: '/showcase/ai-journal/save-entry.yaml' },
    { label: 'weekly-insights', url: '/showcase/ai-journal/weekly-insights.yaml' }
]
</script>

# AI Journal

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-beginner">
        <span class="difficulty-dot"></span>
        Beginner
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-ai"><component :is="Brain" :size="12" /> ai</span> <span class="showcase-tag tag-health"><component :is="Tag" :size="12" /> health</span> <span class="showcase-tag tag-productivity"><component :is="Tag" :size="12" /> productivity</span> <span class="showcase-tag tag-frontend"><component :is="Layout" :size="12" /> frontend</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="ai-journal" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<p class="showcase-description">Your personal AI-powered journaling companion that analyzes entries, tracks mood patterns, and provides compassionate weekly insights.</p>

Meet your new journaling companion, an AI-powered personal journal that goes beyond
simple note-taking. AI Journal understands your emotions, tracks your mental well-being,
and provides supportive, non-judgmental feedback like having a compassionate therapist
in your pocket.

## Why AI Journal?

- **Emotional Intelligence**: Advanced sentiment analysis detects mood, energy levels, and stress indicators
- **Theme Tracking**: Automatically identifies recurring topics, concerns, and gratitudes
- **Supportive Responses**: Warm, validating feedback that encourages self-reflection
- **Weekly Insights**: Aggregated mood trends, patterns, and personalized encouragement
- **Privacy First**: Your entries stay on your device, processed locally

Whether you're practicing mindfulness, working through challenges, or simply want
to build a journaling habit, AI Journal makes the experience more meaningful and insightful.



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

- OpenAI API key (for GPT-4o)

## Key Files

::: code-group
<<< @/../showcase/ai-journal/stack.yaml [stack.yaml]

<<< @/../showcase/ai-journal/habits/get-entries.yaml [get-entries.yaml]

<<< @/../showcase/ai-journal/habits/get-entry.yaml [get-entry.yaml]

<<< @/../showcase/ai-journal/habits/save-entry.yaml [save-entry.yaml]
:::

## Quick Start

<ExampleRunner examplePath="ai-journal" />

<DownloadExample examplePath="ai-journal" />
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
