---
title: "Get Volume"
description: "Control device system settings like volume, ringer mode, Bluetooth, and DND"
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
      const stats = data.stats['@ha-bits/bit-system-settings']
      if (stats) {
        const el = document.querySelector('[data-package="@ha-bits/bit-system-settings"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="Package" :size="32" class="inline-icon" /> Get Volume

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-system-settings`</span>
  <span class="bit-version">v1.0.0</span>
  <span class="bit-downloads" data-package="@ha-bits/bit-system-settings">📥 <span class="download-count">-</span> downloads</span>
  <span class="bit-categories"><span class="bit-category">system</span> <span class="bit-category">settings</span> <span class="bit-category">volume</span> <span class="bit-category">bluetooth</span> <span class="bit-category">dnd</span></span>
</div>

Control device system settings like volume, ringer mode, Bluetooth, and DND

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-system-settings-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-system-settings"
    action: "getVolume"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Get Volume** | Get the current volume level for a stream |
| **Set Volume** | Set the volume level for a stream (Android only) |
| **Mute** | Mute an audio stream (Android only) |
| **Unmute** | Unmute an audio stream (Android only) |
| **Get Ringer Mode** | Get the current ringer mode |
| **Set Ringer Mode** | Set the ringer mode (Android only) |
| **Set Silent Mode** | Enable silent mode (no sound or vibration) |
| **Set Vibrate Mode** | Enable vibrate mode (vibration only) |
| **Set Normal Mode** | Enable normal ringer mode (sounds enabled) |
| **Get Bluetooth State** | Get the current Bluetooth state |
| **Enable Bluetooth** | Enable Bluetooth (opens settings on newer Android/iOS) |
| **Disable Bluetooth** | Disable Bluetooth (opens settings on newer Android/iOS) |
| **Get Do Not Disturb State** | Get the current Do Not Disturb state (Android only) |
| **Enable Do Not Disturb** | Enable Do Not Disturb mode (Android only) |
| **Disable Do Not Disturb** | Disable Do Not Disturb mode (Android only) |
| **Set Focus Mode** | Enable focus mode (mute media, enable DND, set vibrate) |
| **Clear Focus Mode** | Disable focus mode (unmute, disable DND, set normal) |

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
