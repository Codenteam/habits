---
title: "Database / Storage (MySQL)"
description: "MySQL database storage bit - replaces @ha-bits/bit-database"
aside: false
---

<script setup>
import { Database } from 'lucide-vue-next'
</script>

# <component :is="Database" :size="32" class="inline-icon" /> Database / Storage (MySQL)

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-database-mysql`</span>
  <span class="bit-version">v1.0.0</span>
  
  <span class="bit-categories"><span class="bit-category">database</span> <span class="bit-category">storage</span> <span class="bit-category">mysql</span></span>
</div>

MySQL database storage bit - replaces @ha-bits/bit-database

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-database-mysql-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-database-mysql"
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
