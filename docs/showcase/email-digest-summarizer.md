---
title: "Email Digest Summarizer"
description: "Fetch unread Gmail emails, summarize each with AI, and post a curated digest to a Slack channel in one click."
aside: false
---

<script setup>
import { Brain, Mail, Tag, Zap } from 'lucide-vue-next'

const images = [
    { img: '/showcase/email-digest-summarizer/email-digest-summarizer-1.webp', caption: 'Email Digest Summarizer' },
    { img: '/showcase/email-digest-summarizer/email-digest-summarizer-2.webp', caption: 'Email Digest Summarizer' },
    { img: '/showcase/email-digest-summarizer/email-digest-summarizer-3.webp', caption: 'Email Digest Summarizer' }
]

const habitTabs = [
    { label: 'content-digest', url: '/showcase/email-digest-summarizer/content-digest.yaml' },
    { label: 'process-content', url: '/showcase/email-digest-summarizer/process-content.yaml' },
    { label: 'fetch-emails', url: '/showcase/email-digest-summarizer/fetch-emails.yaml' },
    { label: 'summarize-content', url: '/showcase/email-digest-summarizer/summarize-content.yaml' },
    { label: 'send-digest', url: '/showcase/email-digest-summarizer/send-digest.yaml' }
]
</script>

# Email Digest Summarizer

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-beginner">
        <span class="difficulty-dot"></span>
        Beginner
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-ai"><component :is="Brain" :size="12" /> ai</span> <span class="showcase-tag tag-email"><component :is="Mail" :size="12" /> email</span> <span class="showcase-tag tag-slack"><component :is="Tag" :size="12" /> slack</span> <span class="showcase-tag tag-productivity"><component :is="Tag" :size="12" /> productivity</span> <span class="showcase-tag tag-automation"><component :is="Zap" :size="12" /> automation</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="email-digest-summarizer" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>



<p class="showcase-description">Fetch unread Gmail emails, summarize each with AI, and post a curated digest to a Slack channel in one click.</p>

**Email Digest Summarizer** is an automation that fetches unread emails from your Gmail inbox via IMAP,
uses OpenAI to summarise each message, and delivers a clean digest report to a Slack channel.

## What it does

- **Email fetching**: Retrieves unread Gmail messages via IMAP with `fetch-emails`
- **AI summarisation**: Passes each email through OpenAI (`gpt-4o-mini`) for a concise summary via `summarize-content`
- **Content processing**: `process-content` orchestrates the fetch → summarise loop for all emails
- **Slack delivery**: Formats all summaries into a rich Slack message and posts it to a channel via `send-digest`
- **Full pipeline**: `content-digest` ties everything together: process all emails then send the digest

## Environment variables (`.env` / keyring on apps)

| Variable | Purpose |
|---|---|
| `HABITS_OPENAI_API_KEY` | OpenAI API key for content summarisation |
| `HABITS_GMAIL_IMAP_HOST` | IMAP host (e.g. `imap.gmail.com`) |
| `HABITS_GMAIL_IMAP_PORT` | IMAP port (typically `993` for SSL) |
| `HABITS_GMAIL_IMAP_USER` | Gmail address to read emails from |
| `HABITS_GMAIL_IMAP_APP_PASSWORD` | Gmail App Password for the IMAP account |
| `HABITS_SLACK_BOT_TOKEN` | Slack Bot User OAuth Token (`xoxb-...`) |
| `HABITS_SLACK_DIGEST_CHANNEL` | Slack channel ID to post the digest to |

## How to set up

1. Copy `.env.example` to `.env` and fill in your credentials.
2. For Gmail, enable 2-Step Verification and generate a 16-character App Password for `HABITS_GMAIL_IMAP_APP_PASSWORD`.
3. Create a Slack app, add `chat:write` and `channels:read` bot scopes, install it to your workspace, and copy the `xoxb-` token.
4. Invite the bot to your target channel and copy the Channel ID into `HABITS_SLACK_DIGEST_CHANNEL`.
5. Run `content-digest` for a full email digest, or enable auto-fetch for continuous monitoring.

## Tech stack

- **habits framework** for workflow orchestration
- **OpenAI** (`@ha-bits/bit-openai`) for natural-language email summarisation
- **IMAP** (`@ha-bits/bit-email`) for Gmail inbox access
- **Slack** (`@ha-bits/bit-slack`) for digest delivery




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

- OPENAI_API_KEY (OpenAI API key)
- GMAIL_IMAP_HOST (IMAP host for Gmail)
- GMAIL_IMAP_PORT (IMAP port for Gmail)
- GMAIL_IMAP_USER (Gmail address to read emails from)
- GMAIL_IMAP_APP_PASSWORD (Gmail App Password for the IMAP account)
- SLACK_BOT_TOKEN (Slack Bot User OAuth Token)
- SLACK_DIGEST_CHANNEL (Slack channel ID to post the digest to)

## Quick Start

<ExampleRunner examplePath="email-digest-summarizer" />

<DownloadExample examplePath="email-digest-summarizer" />


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
