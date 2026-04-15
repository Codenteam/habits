---
title: "Email Send & Receive Demo"
description: "Complete email workflow demonstration with IMAP polling and SMTP sending capabilities."
aside: false
---

<script setup>
import { Mail, Zap, Tag } from 'lucide-vue-next'

const images = [
    { img: '/showcase/email-demo/1.webp', caption: 'Email Send & Receive Demo' }
]
</script>

# Email Send & Receive Demo

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-beginner">
        <span class="difficulty-dot"></span>
        Beginner
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-email"><component :is="Mail" :size="12" /> email</span> <span class="showcase-tag tag-imap"><component :is="Mail" :size="12" /> imap</span> <span class="showcase-tag tag-smtp"><component :is="Mail" :size="12" /> smtp</span> <span class="showcase-tag tag-automation"><component :is="Zap" :size="12" /> automation</span> <span class="showcase-tag tag-communication"><component :is="Tag" :size="12" /> communication</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="email-demo" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<p class="showcase-description">Complete email workflow demonstration with IMAP polling and SMTP sending capabilities.</p>

The Email Demo showcases the `@ha-bits/bit-email` module's capabilities for
building email-powered workflows, especially on mobile. 

## What It Does

- **Send Email**: Send emails via SMTP to any recipient
- **Poll Inbox**: Fetch and display emails from IMAP inbox
- **Round-Trip Test**: Send an email to yourself and verify receipt
- **Auto-Polling**: Continuously monitor inbox for new messages
- **Real-time UI**: Interactive web interface for testing email operations

## Features

- ✉️ SMTP email sending with customizable recipient, subject, and body
- 📥 IMAP inbox polling with unread/all message filtering
- 🔄 Complete round-trip testing (send → receive verification)
- ⚡ Auto-refresh polling for inbox monitoring
- 🎨 Clean, modern dark-mode UI

Perfect for understanding email automation, building notification systems,
or creating email-based workflows with Habits.


## Requirements

- Email account with IMAP/SMTP access (Gmail, Outlook, etc.)
- App password for Gmail users

## Key Files

::: code-group
<<< @/../showcase/email-demo/stack.yaml [stack.yaml]

<<< @/../showcase/email-demo/habit.yaml [habit.yaml]

<<< @/../showcase/email-demo/.env.example [.env.example]
:::

## Quick Start

<ExampleRunner examplePath="email-demo" />

<DownloadExample examplePath="email-demo" />
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
