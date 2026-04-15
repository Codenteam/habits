---
title: "Telegram"
description: "Telegram Bot integration bit for sending messages and notifications"
aside: false
---

<script setup>
import { Send } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useData } from 'vitepress'

onMounted(async () => {
  try {
    const { site } = useData()
    const base = site.value.base || '/'
    const res = await fetch(`${base}bits-stats.json`)
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats['@ha-bits/bit-telegram']
      if (stats) {
        const el = document.querySelector('[data-package="@ha-bits/bit-telegram"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="Send" :size="32" class="inline-icon" /> Telegram

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-telegram`</span>
  <span class="bit-version">v1.0.2</span>
  <span class="bit-downloads" data-package="@ha-bits/bit-telegram">📥 <span class="download-count">328</span> downloads</span>
  <span class="bit-categories"><span class="bit-category">telegram</span> <span class="bit-category">bot</span> <span class="bit-category">messaging</span> <span class="bit-category">notifications</span></span>
</div>

Telegram Bot integration bit for sending messages and notifications

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-telegram-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-telegram"
    action: "action_name"
    data:
      # action properties...
```

<style>
.bit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0 24px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.bit-package {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
}

.bit-version {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
}

.bit-downloads {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
  background: var(--vp-c-bg-alt);
  padding: 4px 10px;
  border-radius: 12px;
}

.bit-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.bit-category {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
}

.inline-icon {
  display: inline;
  vertical-align: middle;
  margin-right: 8px;
}

.vp-doc h2 {
  border-top-width: 0px;
}
</style>
