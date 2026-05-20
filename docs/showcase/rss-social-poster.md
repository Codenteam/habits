---
title: "RSS Social Poster"
description: "Monitor any RSS/Atom feed, generate platform-optimised posts for Twitter/X and LinkedIn with AI, and publish them automatically — every time a new article drops."
aside: false
---

<script setup>
import { Brain, Tag, Zap } from 'lucide-vue-next'

const images = [
    { img: '/showcase/rss-social-poster/rss-social-poster-1.webp', caption: 'RSS Social Poster' },
    { img: '/showcase/rss-social-poster/rss-social-poster-2.webp', caption: 'RSS Social Poster' }
]

const habitTabs = [
    { label: 'fetch-rss', url: '/showcase/rss-social-poster/fetch-rss.yaml' },
    { label: 'generate-social-posts', url: '/showcase/rss-social-poster/generate-social-posts.yaml' },
    { label: 'post-to-social', url: '/showcase/rss-social-poster/post-to-social.yaml' }
]
</script>

# RSS Social Poster

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-intermediate">
        <span class="difficulty-dot"></span>
        Intermediate
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-ai"><component :is="Brain" :size="12" /> ai</span> <span class="showcase-tag tag-rss"><component :is="Tag" :size="12" /> rss</span> <span class="showcase-tag tag-social-media"><component :is="Tag" :size="12" /> social-media</span> <span class="showcase-tag tag-twitter"><component :is="Tag" :size="12" /> twitter</span> <span class="showcase-tag tag-linkedin"><component :is="Tag" :size="12" /> linkedin</span> <span class="showcase-tag tag-automation"><component :is="Zap" :size="12" /> automation</span> <span class="showcase-tag tag-scheduling"><component :is="Tag" :size="12" /> scheduling</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="rss-social-poster" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>



<p class="showcase-description">Monitor any RSS/Atom feed, generate platform-optimised posts for Twitter/X and LinkedIn with AI, and publish them automatically — every time a new article drops.</p>

**RSS Social Poster** is an automation that polls any RSS or Atom feed on a 3-minute schedule,
uses OpenAI to craft platform-specific posts for each new article, and publishes them to
Twitter/X and LinkedIn without any manual intervention.

## What it does

- **RSS monitoring** — Polls any RSS/Atom feed URL every 3 minutes for new items via `fetch-rss`; normalises each article into a standard format
- **AI content generation** — Passes each article to OpenAI to produce a concise tweet and a longer professional LinkedIn post via `generate-social-posts`
- **Multi-platform publishing** — Posts the tweet to Twitter/X and the LinkedIn post to your organisation page sequentially via `post-to-social`

## Environment variables (`.env` / keyring on apps)

| Variable | Purpose |
|---|---|
| `HABITS_OPENAI_API_KEY` | OpenAI API key for social post generation |
| `HABITS_TWITTER_CLIENT_ID` | Twitter/X OAuth 2.0 Client ID |
| `HABITS_LINKEDIN_CLIENT_ID` | LinkedIn OAuth 2.0 Client ID |
| `HABITS_LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth 2.0 Client Secret |
| `HABITS_LINKEDIN_ORG_ID` | LinkedIn Organization ID for page posts |
| `HABITS_RSS_FEED_URL` | RSS/Atom feed URL to monitor |

## How to set up

1. Copy `.env.example` to `.env` and fill in your credentials.
2. Create a Twitter Developer App with **Read and Write** permissions and add `http://localhost:13000/oauth/bit-twitter/callback` as the callback URL; copy the Client ID.
3. Create a LinkedIn Developer App linked to your Company Page; copy the Client ID, Client Secret, and Organization ID.
4. Set any RSS/Atom feed URL in `HABITS_RSS_FEED_URL`.
5. Start the server — `fetch-rss` will automatically poll the feed every 3 minutes and publish new articles to both platforms.

## Tech stack

- **habits framework** for workflow orchestration and cron scheduling
- **OpenAI** (`@ha-bits/bit-openai`) for platform-tailored social content generation
- **RSS** (`@ha-bits/bit-rss`) for feed polling and new-item detection
- **Twitter/X** (`@ha-bits/bit-twitter`) for tweet publishing via OAuth 2.0
- **LinkedIn** (`@ha-bits/bit-linkedin`) for LinkedIn post publishing via OAuth 2.0




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

- HABITS_OPENAI_API_KEY — OpenAI API key
- HABITS_TWITTER_CLIENT_ID — Twitter/X OAuth 2.0 Client ID
- HABITS_LINKEDIN_CLIENT_ID — LinkedIn OAuth 2.0 Client ID
- HABITS_LINKEDIN_CLIENT_SECRET — LinkedIn OAuth 2.0 Client Secret
- HABITS_LINKEDIN_ORG_ID — LinkedIn Organization ID
- HABITS_RSS_FEED_URL — RSS/Atom feed URL to monitor

## Key Files

::: code-group
<<< @/../showcase/rss-social-poster/stack.yaml [stack.yaml]

<<< @/../showcase/rss-social-poster/.env.example [.env.example]

<<< @/../showcase/rss-social-poster/habits/fetch-rss.yaml [fetch-rss.yaml]

<<< @/../showcase/rss-social-poster/habits/generate-social-posts.yaml [generate-social-posts.yaml]

<<< @/../showcase/rss-social-poster/habits/post-to-social.yaml [post-to-social.yaml]
:::

## Quick Start

<ExampleRunner examplePath="rss-social-poster" />

<DownloadExample examplePath="rss-social-poster" />


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
