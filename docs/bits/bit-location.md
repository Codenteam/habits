---
title: "Get Current Position"
description: "Device location and geofencing for mobile/desktop apps"
aside: false
---

<script setup>
import { Package } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useData } from 'vitepress'

onMounted(async () => {
  try {
    const { site } = useData()
    const base = site.value.base || '/'
    const res = await fetch(`${base}bits-stats.json`)
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats['@ha-bits/bit-location']
      if (stats) {
        const el = document.querySelector('[data-package="@ha-bits/bit-location"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="Package" :size="32" class="inline-icon" /> Get Current Position

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-location`</span>
  <span class="bit-version">v1.0.0</span>
  <span class="bit-downloads" data-package="@ha-bits/bit-location">📥 <span class="download-count">-</span> downloads</span>
  <span class="bit-categories"><span class="bit-category">location</span> <span class="bit-category">geolocation</span> <span class="bit-category">geofence</span> <span class="bit-category">gps</span> <span class="bit-category">tauri</span></span>
</div>

Device location and geofencing for mobile/desktop apps

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-location-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-location"
    action: "getCurrentPosition"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Get Current Position** | Get the current GPS position of the device |
| **Add Geofence** | Register a circular geofence region to monitor |
| **Remove Geofence** | Remove a registered geofence |
| **List Geofences** | Get all registered geofences |
| **Check Geofence Status** | Check current position against all registered geofences |
| **Calculate Distance** | Calculate distance between two GPS coordinates in meters |

## Triggers

| Trigger | Description |
|---------|-------------|
| **On Geofence Enter** | Triggered when device enters a registered geofence |
| **On Geofence Exit** | Triggered when device exits a registered geofence |
| **On Location Change** | Triggered when device location changes significantly |

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
