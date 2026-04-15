---
title: "Discover Devices"
description: "Control Matter-compatible smart home devices (lights, switches, outlets)"
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
      const stats = data.stats['@ha-bits/bit-smart-home']
      if (stats) {
        const el = document.querySelector('[data-package="@ha-bits/bit-smart-home"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="Package" :size="32" class="inline-icon" /> Discover Devices

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-smart-home`</span>
  <span class="bit-version">v0.0.1</span>
  <span class="bit-downloads" data-package="@ha-bits/bit-smart-home">📥 <span class="download-count">-</span> downloads</span>
  <span class="bit-categories"><span class="bit-category">smart-home</span> <span class="bit-category">matter</span> <span class="bit-category">homekit</span> <span class="bit-category">google-home</span> <span class="bit-category">lights</span></span>
</div>

Control Matter-compatible smart home devices (lights, switches, outlets)

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-smart-home-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-smart-home"
    action: "discoverDevices"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Discover Devices** | Discover Matter devices on the network |
| **Get All Devices** | Get all known smart home devices |
| **Get Lights** | Get all light devices |
| **Get Device State** | Get the current state of a device |
| **Turn On** | Turn a device on |
| **Turn Off** | Turn a device off |
| **Toggle** | Toggle a device on/off |
| **Set Brightness** | Set the brightness level of a light |
| **Set Color** | Set the color of a light (hue/saturation or color temperature) |
| **Set Light** | Set brightness and optionally color of a light |
| **Turn All Lights Off** | Turn off all lights |
| **Turn All Lights On** | Turn on all lights |
| **Set Warm Light** | Set a light to warm white (2700K) |
| **Set Cool Light** | Set a light to cool white (5000K) |
| **Add Device** | Commission a new Matter device using pairing code |
| **Remove Device** | Remove a device from the Matter fabric |

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
