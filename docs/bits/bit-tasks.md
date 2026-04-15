---
title: "Tasks / Tickets"
description: "Task management bit for Jira, Asana, and generic ticket systems"
aside: false
---

<script setup>
import { Package } from 'lucide-vue-next'
</script>

# <component :is="Package" :size="32" class="inline-icon" /> Tasks / Tickets

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-tasks`</span>
  <span class="bit-version">v1.0.1</span>
  <span class="bit-downloads">📥 217 downloads</span>
  <span class="bit-categories"><span class="bit-category">tasks</span> <span class="bit-category">jira</span> <span class="bit-category">asana</span> <span class="bit-category">tickets</span></span>
</div>

Task management bit for Jira, Asana, and generic ticket systems

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-tasks-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-tasks"
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
