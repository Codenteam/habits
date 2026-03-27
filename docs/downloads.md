---
title: "Downloads"
description: "Download the Cortex App to run .habit files on your desktop or mobile device"
aside: false
---

<script setup>
import { ref } from 'vue'

const downloads = ref([
  {
    platform: 'Android',
    icon: 'android',
    filename: 'habits-cortex.apk',
    version: '1.0.0',
    size: 'Coming Soon',
    description: 'Android 8.0+ (ARM64)',
    available: false
  },
  {
    platform: 'Windows',
    icon: 'windows', 
    filename: 'habits-cortex.exe',
    version: '1.0.0',
    size: 'Coming Soon',
    description: 'Windows 10/11 (x64)',
    available: false
  },
  {
    platform: 'macOS',
    icon: 'mac',
    filename: 'habits-cortex.dmg',
    version: '1.0.0',
    size: 'Coming Soon',
    description: 'macOS 11+ (Intel & Apple Silicon)',
    available: false
  },
  {
    platform: 'Linux',
    icon: 'linux',
    filename: 'habits-cortex.AppImage',
    version: '1.0.0',
    size: 'Coming Soon',
    description: 'Linux (x64)',
    available: false
  }
])
</script>

# Download Cortex App

The Cortex App lets you run `.habit` files directly on your device - no server setup required. Import, run, and manage your habits with a native experience.

## Desktop & Mobile Apps

<div class="downloads-grid">
  <div v-for="item in downloads" :key="item.platform" class="download-card" :class="{ disabled: !item.available }">
    <div class="platform-icon">
      <!-- Android -->
      <svg v-if="item.icon === 'android'" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.523 15.34a.69.69 0 01-.69.69.69.69 0 01-.69-.69.69.69 0 01.69-.69.69.69 0 01.69.69m-10.356 0a.69.69 0 01-.69.69.69.69 0 01-.69-.69.69.69 0 01.69-.69.69.69 0 01.69.69m10.631-4.64l1.893-3.28a.394.394 0 00-.144-.537.394.394 0 00-.537.144L17.102 10.3a9.05 9.05 0 00-5.101-1.51 9.05 9.05 0 00-5.101 1.51L5.002 7.018a.394.394 0 00-.537-.144.394.394 0 00-.144.537l1.893 3.28C3.177 12.5 1 15.84 1 19.65h22c0-3.81-2.177-7.15-5.202-8.95"/>
      </svg>
      <!-- Windows -->
      <svg v-else-if="item.icon === 'windows'" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm17 .25V22l-10-1.91V13.1l10 .15z"/>
      </svg>
      <!-- macOS -->
      <svg v-else-if="item.icon === 'mac'" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <!-- Linux -->
      <svg v-else-if="item.icon === 'linux'" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.504 0c-.155 0-.315.01-.475.03-.545.055-1.09.205-1.585.41-.495.205-.955.475-1.35.805-.395.33-.73.73-.995 1.175-.265.445-.46.94-.565 1.46-.105.52-.12 1.07-.035 1.605.085.535.265 1.05.53 1.52.265.47.615.89 1.035 1.235.42.345.895.615 1.41.785.515.17 1.06.235 1.605.185.545-.05 1.07-.21 1.55-.47.48-.26.91-.615 1.27-1.045.36-.43.64-.93.825-1.47.185-.54.27-1.11.245-1.67-.025-.56-.155-1.11-.385-1.62-.23-.51-.555-.965-.955-1.345-.4-.38-.87-.68-1.385-.875-.515-.195-1.06-.29-1.61-.29l-.03-.005zm3.425 4.9c.16.01.315.07.435.18.12.11.2.26.22.425.02.165-.03.33-.135.465-.105.135-.26.225-.43.25-.17.025-.34-.015-.48-.115-.14-.1-.235-.245-.27-.41-.035-.165.005-.335.115-.47.11-.135.27-.22.45-.235l.095-.09zm-6.84.3c.16.01.315.07.435.18.12.11.2.26.22.425.02.165-.03.33-.135.465-.105.135-.26.225-.43.25-.17.025-.34-.015-.48-.115-.14-.1-.235-.245-.27-.41-.035-.165.005-.335.115-.47.11-.135.27-.22.45-.235l.095-.09zM8.365 8.56a1.115 1.115 0 01.3.055c.21.06.405.17.565.32.16.15.28.34.345.55.065.21.075.435.03.65-.045.215-.145.41-.29.575-.145.165-.33.29-.535.36-.205.07-.425.085-.635.04-.21-.045-.405-.145-.565-.29-.16-.145-.28-.33-.35-.535-.07-.205-.085-.425-.045-.635.04-.21.135-.405.275-.565.14-.16.32-.28.52-.35.105-.035.215-.055.325-.06l.06-.115zm7.27 0a1.115 1.115 0 01.3.055c.21.06.405.17.565.32.16.15.28.34.345.55.065.21.075.435.03.65-.045.215-.145.41-.29.575-.145.165-.33.29-.535.36-.205.07-.425.085-.635.04-.21-.045-.405-.145-.565-.29-.16-.145-.28-.33-.35-.535-.07-.205-.085-.425-.045-.635.04-.21.135-.405.275-.565.14-.16.32-.28.52-.35.105-.035.215-.055.325-.06l.06-.115zM12 10c.95 0 1.725.775 1.725 1.725S12.95 13.45 12 13.45s-1.725-.775-1.725-1.725S11.05 10 12 10zm-4.43 3.66c.31-.13.66-.08.93.13.27.21.41.55.35.88-.06.33-.28.61-.58.74-.3.13-.65.09-.92-.11-.27-.2-.42-.53-.37-.86.05-.33.26-.62.56-.77l.03.01zm8.86 0c.31-.13.66-.08.93.13.27.21.41.55.35.88-.06.33-.28.61-.58.74-.3.13-.65.09-.92-.11-.27-.2-.42-.53-.37-.86.05-.33.26-.62.56-.77l.03.01zM6.725 16.5c.61-.26 1.32-.14 1.85.31.53.45.77 1.15.62 1.8-.15.65-.62 1.18-1.23 1.38-.61.2-1.29.07-1.78-.35-.49-.42-.73-1.08-.61-1.71.12-.63.55-1.16 1.12-1.41l.03-.02zm10.55 0c.61-.26 1.32-.14 1.85.31.53.45.77 1.15.62 1.8-.15.65-.62 1.18-1.23 1.38-.61.2-1.29.07-1.78-.35-.49-.42-.73-1.08-.61-1.71.12-.63.55-1.16 1.12-1.41l.03-.02zM12 17.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/>
      </svg>
    </div>
    <div class="download-info">
      <h3>{{ item.platform }}</h3>
      <p class="description">{{ item.description }}</p>
      <p class="version">Version {{ item.version }} · {{ item.size }}</p>
    </div>
    <a v-if="item.available" :href="`/downloads/${item.filename}`" class="download-btn" download>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
      Download
    </a>
    <span v-else class="coming-soon">Coming Soon</span>
  </div>
</div>

## How to run .habit files?



<Checklist name="dot-habit/mobile" title="How to Run on Mobile" icon="smartphone">

<!--@include: ./getting-started/checklists/dot-habit/mobile.md{3,}-->

</Checklist>

<Checklist name="dot-habit/desktop" title="How to Run on Desktop" icon="monitor">

<!--@include: ./getting-started/checklists/dot-habit/desktop.md{3,}-->

</Checklist>

<Checklist name="dot-habit/server" title="How to Run on Server" icon="server">

<!--@include: ./getting-started/checklists/dot-habit/server.md{3,}-->

</Checklist>

<Checklist name="dot-habit/serverless" title="How to Run Serverless" icon="cloud">

<!--@include: ./getting-started/checklists/dot-habit/serverless.md{3,}-->

</Checklist>


## Alternative: Run via CLI

If you prefer not to install the app, you can run `.habit` files directly using the Cortex CLI:

```bash
# Run any .habit file as a server
npx @ha-bits/cortex --config ./your-app.habit
```


## What's a .habit file?

A `.habit` file is a self-contained portable package that includes:
- **Frontend** - The user interface (HTML, CSS, JS)
- **Workflows** - Backend logic and automations  
- **Configuration** - App settings and metadata

You can generate `.habit` files from any Habits project using:
```bash
npx habits pack --format habit --config ./stack.yaml
```

<style>
.downloads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.download-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem 1.5rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition: all 0.2s;
}

.download-card:not(.disabled):hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.download-card.disabled {
  opacity: 0.6;
}

.platform-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-2);
  margin-bottom: 1rem;
}

.download-card:not(.disabled):hover .platform-icon {
  color: #3b82f6;
}

.download-info h3 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.download-info .description {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  color: var(--vp-c-text-2);
}

.download-info .version {
  margin: 0 0 1rem;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.2s;
}

.download-btn:hover {
  background: #1d4ed8;
}

.coming-soon {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-3);
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
