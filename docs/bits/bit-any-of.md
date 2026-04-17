---
title: "Any Of (Race)"
description: "Any-of flow control bit - continues when any one incoming edge completes without waiting for others"
aside: false
---

<script setup>
import { GitBranch } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useData } from 'vitepress'

onMounted(async () => {
  try {
    const { site } = useData()
    const base = site.value.base || '/'
    const res = await fetch(`${base}bits-stats.json`)
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats['@ha-bits/bit-any-of']
      if (stats) {
        const el = document.querySelector('[data-package="@ha-bits/bit-any-of"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="GitBranch" :size="32" class="inline-icon" /> Any Of (Race)

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-any-of`</span>
  <span class="bit-version">v1.0.1</span>
  <span class="bit-downloads" data-package="@ha-bits/bit-any-of">📥 <span class="download-count">226</span> downloads</span>
  <span class="bit-categories"><span class="bit-category">any-of</span> <span class="bit-category">race</span> <span class="bit-category">flow-control</span> <span class="bit-category">first-to-finish</span> <span class="bit-category">parallel</span></span>
</div>

Any-of flow control bit - continues when any one incoming edge completes without waiting for others

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-any-of-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-any-of"
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
