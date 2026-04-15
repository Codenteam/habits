---
title: "Get Current Network"
description: "Monitor Wi-Fi network connections and trigger actions on network changes"
aside: false
---

<script setup>
import { Package } from 'lucide-vue-next'
</script>

# <component :is="Package" :size="32" class="inline-icon" /> Get Current Network

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-wifi`</span>
  <span class="bit-version">v1.0.0</span>
  
  <span class="bit-categories"><span class="bit-category">wifi</span> <span class="bit-category">network</span> <span class="bit-category">mobile</span> <span class="bit-category">tauri</span></span>
</div>

Monitor Wi-Fi network connections and trigger actions on network changes

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-wifi-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-wifi"
    action: "getCurrentNetwork"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Get Current Network** | Get information about the currently connected Wi-Fi network |
| **Is Connected** | Check if device is connected to Wi-Fi |
| **Is Connected To Network** | Check if device is connected to a specific Wi-Fi network |
| **List Saved Networks** | Get a list of saved Wi-Fi network names |
| **Check Permissions** | Check Wi-Fi related permissions status |
| **Request Permissions** | Request Wi-Fi related permissions |

## Triggers

| Trigger | Description |
|---------|-------------|
| **On Network Change** | Triggered when the Wi-Fi network changes |
| **On Connect To Network** | Triggered when connecting to a specific Wi-Fi network |
| **On Disconnect From Network** | Triggered when disconnecting from a specific Wi-Fi network |

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
