---
title: "Ask AI"
description: "L0 base bit for AI/LLM services. Provides common interfaces and simple random responses. Use @ha-bits/bit-openai or @ha-bits/bit-local-ai for real AI functionality."
aside: false
---

<script setup>
import { Brain } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useData } from 'vitepress'

onMounted(async () => {
  try {
    const { site } = useData()
    const base = site.value.base || '/'
    const res = await fetch(`${base}bits-stats.json`)
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats['@ha-bits/bit-ai']
      if (stats) {
        const el = document.querySelector('[data-package="@ha-bits/bit-ai"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="Brain" :size="32" class="inline-icon" /> Ask AI

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-ai`</span>
  <span class="bit-version">v1.0.0</span>
  <span class="bit-downloads" data-package="@ha-bits/bit-ai">📥 <span class="download-count">-</span> downloads</span>
  <span class="bit-categories"><span class="bit-category">ai</span> <span class="bit-category">llm</span> <span class="bit-category">chat</span> <span class="bit-category">base</span> <span class="bit-category">l0</span></span>
</div>

L0 base bit for AI/LLM services. Provides common interfaces and simple random responses. Use @ha-bits/bit-openai or @ha-bits/bit-local-ai for real AI functionality.

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-ai-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-ai"
    action: "ask_ai"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Ask AI** | Send a chat completion request to an AI model. |
| **Ask Assistant** | Ask an AI assistant with persistent conversation. |
| **List Models** | List available AI models. |
| **Install Model** | Download and install an AI model. |

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
