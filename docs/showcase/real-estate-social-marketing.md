---
title: "Real Estate Social Marketing"
description: "Turn property listing URLs into AI-generated LinkedIn and Twitter posts, schedule publishing, and automate multi-platform social marketing."
aside: false
---

<script setup>
import { Brain, Tag, Zap, Layout } from 'lucide-vue-next'

const images = [
    { img: '/showcase/real-estate-social-marketing/real-estate-social-marketing-1.webp', caption: 'Real Estate Social Marketing' },
    { img: '/showcase/real-estate-social-marketing/real-estate-social-marketing-2.webp', caption: 'Real Estate Social Marketing' },
    { img: '/showcase/real-estate-social-marketing/real-estate-social-marketing-3.webp', caption: 'Real Estate Social Marketing' },
    { img: '/showcase/real-estate-social-marketing/real-estate-social-marketing-4.webp', caption: 'Real Estate Social Marketing' },
    { img: '/showcase/real-estate-social-marketing/real-estate-social-marketing-5.webp', caption: 'Real Estate Social Marketing' },
    { img: '/showcase/real-estate-social-marketing/real-estate-social-marketing-7.webp', caption: 'Real Estate Social Marketing' },
    { img: '/showcase/real-estate-social-marketing/real-estate-social-merketing-6.webp', caption: 'Real Estate Social Marketing' }
]

const habitTabs = [
    { label: 'add-property', url: '/showcase/real-estate-social-marketing/add-property.yaml' },
    { label: 'extract-property-details', url: '/showcase/real-estate-social-marketing/extract-property-details.yaml' },
    { label: 'generate-property-posts', url: '/showcase/real-estate-social-marketing/generate-property-posts.yaml' },
    { label: 'list-properties', url: '/showcase/real-estate-social-marketing/list-properties.yaml' },
    { label: 'get-property', url: '/showcase/real-estate-social-marketing/get-property.yaml' },
    { label: 'delete-property', url: '/showcase/real-estate-social-marketing/delete-property.yaml' },
    { label: 'set-property-schedule', url: '/showcase/real-estate-social-marketing/set-property-schedule.yaml' },
    { label: 'return-property-to-draft', url: '/showcase/real-estate-social-marketing/return-property-to-draft.yaml' },
    { label: 'publish-social-post', url: '/showcase/real-estate-social-marketing/publish-social-post.yaml' },
    { label: 'publish-property-now', url: '/showcase/real-estate-social-marketing/publish-property-now.yaml' },
    { label: 'get-scheduled-properties', url: '/showcase/real-estate-social-marketing/get-scheduled-properties.yaml' },
    { label: 'check-pending-posts', url: '/showcase/real-estate-social-marketing/check-pending-posts.yaml' }
]
</script>

# Real Estate Social Marketing

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-intermediate">
        <span class="difficulty-dot"></span>
        Intermediate
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-ai"><component :is="Brain" :size="12" /> ai</span> <span class="showcase-tag tag-real-estate"><component :is="Tag" :size="12" /> real-estate</span> <span class="showcase-tag tag-social-media"><component :is="Tag" :size="12" /> social-media</span> <span class="showcase-tag tag-twitter"><component :is="Tag" :size="12" /> twitter</span> <span class="showcase-tag tag-linkedin"><component :is="Tag" :size="12" /> linkedin</span> <span class="showcase-tag tag-automation"><component :is="Zap" :size="12" /> automation</span> <span class="showcase-tag tag-scheduling"><component :is="Tag" :size="12" /> scheduling</span> <span class="showcase-tag tag-frontend"><component :is="Layout" :size="12" /> frontend</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="real-estate-social-marketing" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>



<p class="showcase-description">Turn property listing URLs into AI-generated LinkedIn and Twitter posts, schedule publishing, and automate multi-platform social marketing.</p>

**Real Estate Social Marketing** is a full-stack showcase that extracts listing details from
a property URL, generates platform-specific social posts with OpenAI, and publishes
to Twitter/X and LinkedIn on demand or on a schedule.

## What it does

- **Property extraction** : `add-property` fetches the listing page and uses OpenAI to extract structured property details via `extract-property-details`
- **Social content generation** : `generate-property-posts` crafts tailored Twitter/X and LinkedIn posts for each property
- **Queue management** : Browse draft properties, review generated posts, publish immediately, or schedule for later
- **Automated publishing** : `check-pending-posts` runs every 3 minutes and publishes due items via `publish-social-post`

## Environment variables

| Variable | Purpose |
|---|---|
| `HABITS_OPENAI_API_KEY` | OpenAI API key for extraction and post generation |
| `HABITS_TWITTER_CLIENT_ID` | Twitter/X OAuth 2.0 Client ID |
| `HABITS_LINKEDIN_CLIENT_ID` | LinkedIn OAuth 2.0 Client ID |
| `HABITS_LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth 2.0 Client Secret |
| `HABITS_LINKEDIN_ORGANIZATION_ID` | LinkedIn Company Page / Organization ID |

## How to run

1. Copy `.env.example` to `.env` and fill in credentials.
2. Run `pnpm habits dev showcase/real-estate-social-marketing/stack.yaml`
3. Open http://localhost:13000 and paste a property listing URL.
4. Review generated posts on the Process page and publish or schedule.




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

- OPENAI_API_KEY
- TWITTER_CLIENT_ID
- LINKEDIN_CLIENT_ID
- LINKEDIN_CLIENT_SECRET
- LINKEDIN_ORGANIZATION_ID

## Quick Start

<ExampleRunner examplePath="real-estate-social-marketing" />

<DownloadExample examplePath="real-estate-social-marketing" />


<ContactForm
  heading="Want this habit running in your environment?"
  subtext="This habit is a starting point. Tell us about your stack and we'll help you get it working exactly the way your team needs."
/>

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

.showcase-taxonomy {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0 20px;
}

.taxonomy-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.taxonomy-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--vp-c-text-3);
  min-width: 90px;
}

.taxonomy-values {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.taxonomy-pill {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  text-transform: capitalize;
  text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}

a.taxonomy-pill:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.showcase-notice {
  margin: 24px 0;
  padding: 16px 18px;
  background: color-mix(in srgb, var(--vp-c-brand-1) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 30%, transparent);
  border-radius: 10px;
}

.showcase-notice-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0 0 4px;
}

.showcase-notice-text {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.55;
  margin: 0;
}

.habits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin: 24px 0;
  clear: both;
}

.habit-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s;
}

.habit-card:hover {
  border-color: var(--vp-c-brand-2);
}

.habit-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.habit-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  margin: 0;
  border: none;
  padding: 0;
}

.habit-description {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.bit-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.bit-badge {
  font-size: 0.68rem;
  font-family: var(--vp-font-family-mono);
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(100, 150, 255, 0.08);
  color: var(--vp-c-brand-1);
  border: 1px solid rgba(100, 150, 255, 0.2);
  white-space: nowrap;
}

.trigger-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 9999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.trigger-scheduler {
  background: rgba(124, 58, 237, 0.15);
  color: #a78bfa;
  border: 1px solid rgba(124, 58, 237, 0.3);
}

.trigger-webhook {
  background: rgba(37, 99, 235, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(37, 99, 235, 0.3);
}

.trigger-email {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.trigger-manual {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
  border: 1px solid rgba(245, 158, 11, 0.3);
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
