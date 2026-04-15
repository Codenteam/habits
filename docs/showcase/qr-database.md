---
title: "QR Code Manager"
description: "Full-stack QR code application with generation, scanning, and persistent database storage. Includes a futuristic mobile-friendly frontend for managing your QR code library."
aside: false
---

<script setup>
import { Database, Layout, Tag } from 'lucide-vue-next'

const images = [
    { img: '/showcase/qr-database/1.webp', caption: 'QR Code Manager' },
    { img: '/showcase/qr-database/2.webp', caption: 'QR Code Manager' }
]

const habitTabs = [
    { label: 'create-qr', url: '/showcase/qr-database/create-qr.yaml' },
    { label: 'scan-qr', url: '/showcase/qr-database/scan-qr.yaml' },
    { label: 'list-qrs', url: '/showcase/qr-database/list-qrs.yaml' },
    { label: 'get-qr', url: '/showcase/qr-database/get-qr.yaml' },
    { label: 'delete-qr', url: '/showcase/qr-database/delete-qr.yaml' }
]

const downloads = [
    { filename: 'QR Database Habit Mac (Unsigned).dmg', platform: 'mac', size: 5819255, displaySize: '5.5 MB' },
    { filename: 'QR Database Habit Android (Self-Signed).apk', platform: 'android', size: 12493971, displaySize: '11.9 MB' }
]
</script>

# QR Code Manager

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-beginner">
        <span class="difficulty-dot"></span>
        Beginner
      </span>
      <span class="meta-divider"></span>
      <div class="tags"><span class="showcase-tag tag-database"><component :is="Database" :size="12" /> database</span> <span class="showcase-tag tag-frontend"><component :is="Layout" :size="12" /> frontend</span> <span class="showcase-tag tag-utility"><component :is="Tag" :size="12" /> utility</span> <span class="showcase-tag tag-full-stack"><component :is="Tag" :size="12" /> full-stack</span></div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="qr-database" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<p class="showcase-description">Full-stack QR code application with generation, scanning, and persistent database storage. Includes a futuristic mobile-friendly frontend for managing your QR code library.</p>

A complete QR code management application demonstrating full-stack Habits capabilities
with a polished frontend and SQLite persistence.

## What It Does

- **Generate QR Codes**: Create QR codes from text, URLs, WiFi credentials, vCards, and more
- **Scan QR Codes**: Upload images to decode and extract QR code data
- **Database Storage**: Persist all QR codes in SQLite for future reference
- **CRUD Operations**: Full create, read, update, delete functionality
- **Frontend**: Modern UI for browsing and managing your QR code library

## Why It's Included

Demonstrates how to build a complete full-stack application with Habits including:
- Custom frontend integration
- Database persistence with SQL
- Multiple workflows working together
- Tauri desktop app packaging support


## App Downloads

<DownloadBuilds :downloads="downloads" basePath="/showcase/qr-database/downloads" />


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

- No external API keys required (uses local SQLite)

## Key Files

::: code-group
<<< @/../showcase/qr-database/stack.yaml [stack.yaml]

<<< @/../showcase/qr-database/.env.example [.env.example]
:::

## Quick Start

<ExampleRunner examplePath="qr-database" />

<DownloadExample examplePath="qr-database" />
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
