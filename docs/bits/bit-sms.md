---
title: "Send SMS"
description: "Send and read SMS messages on mobile devices"
aside: false
---

<script setup>
import { Type } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useData } from 'vitepress'

onMounted(async () => {
  try {
    const { site } = useData()
    const base = site.value.base || '/'
    const res = await fetch(`${base}bits-stats.json`)
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats['@ha-bits/bit-sms']
      if (stats) {
        const el = document.querySelector('[data-package="@ha-bits/bit-sms"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="Type" :size="32" class="inline-icon" /> Send SMS

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-sms`</span>
  <span class="bit-version">v1.0.0</span>
  <span class="bit-downloads" data-package="@ha-bits/bit-sms">📥 <span class="download-count">-</span> downloads</span>
  <span class="bit-categories"><span class="bit-category">sms</span> <span class="bit-category">messaging</span> <span class="bit-category">mobile</span> <span class="bit-category">text</span> <span class="bit-category">tauri</span></span>
</div>

Send and read SMS messages on mobile devices

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-sms-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-sms"
    action: "sendSms"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Send SMS** | Send an SMS message to a phone number |
| **Send Alert SMS** | Send a pre-formatted alert SMS |
| **Read Messages** | Read SMS messages from the device (Android only) |
| **Get Unread Count** | Get the count of unread SMS messages (Android only) |
| **Check Permissions** | Check SMS permissions status |
| **Request Permissions** | Request SMS permissions from the user |
| **Format Phone Number** | Format a phone number to E.164 format |

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
