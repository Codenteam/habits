---
title: "LinkedIn"
description: "LinkedIn integration bit for posting content and managing professional presence"
aside: false
---

<script setup>
import { Package } from 'lucide-vue-next'
</script>

# <component :is="Package" :size="32" class="inline-icon" /> LinkedIn

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-linkedin`</span>
  <span class="bit-version">v1.0.0</span>
  <span class="bit-downloads">📥 60 downloads</span>
  <span class="bit-categories"><span class="bit-category">linkedin</span> <span class="bit-category">social-media</span> <span class="bit-category">posts</span> <span class="bit-category">professional-network</span></span>
</div>

LinkedIn integration bit for posting content and managing professional presence

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-linkedin-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-linkedin"
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
