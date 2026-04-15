---
title: "QR Code"
description: "QR code generation and reading bit - supports text, URLs, vCard, WiFi, and calendar data formats"
aside: false
---

<script setup>
import { Package } from 'lucide-vue-next'
</script>

# <component :is="Package" :size="32" class="inline-icon" /> QR Code

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-qr`</span>
  <span class="bit-version">v1.0.0</span>
  
  <span class="bit-categories"><span class="bit-category">qr</span> <span class="bit-category">qrcode</span> <span class="bit-category">barcode</span> <span class="bit-category">scanner</span> <span class="bit-category">generator</span></span>
</div>

QR code generation and reading bit - supports text, URLs, vCard, WiFi, and calendar data formats

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-qr-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-qr"
    action: "action_name"
    data:
      # action properties...
```

## Used In Showcases

- [qr-database](/showcase/qr-database)

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
