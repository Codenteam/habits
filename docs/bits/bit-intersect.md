---
title: "Intersect"
description: "Use Intersect AI tools including ChatGPT, Gemini, Claude for text generaiton, image generation, Website Generation, Document drafts generations, Vector designs and more."
aside: false
---

<script setup>
import { Sparkles } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useData } from 'vitepress'

onMounted(async () => {
  try {
    const { site } = useData()
    const base = site.value.base || '/'
    const res = await fetch(`${base}bits-stats.json`)
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats['@ha-bits/bit-intersect']
      if (stats) {
        const el = document.querySelector('[data-package="@ha-bits/bit-intersect"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="Sparkles" :size="32" class="inline-icon" /> Intersect

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-intersect`</span>
  <span class="bit-version">v0.1.14</span>
  <span class="bit-downloads" data-package="@ha-bits/bit-intersect">📥 <span class="download-count">1.4K</span> downloads</span>
  <span class="bit-categories"><span class="bit-category">intersect</span> <span class="bit-category">openai</span> <span class="bit-category">ai</span></span>
</div>

Use Intersect AI tools including ChatGPT, Gemini, Claude for text generaiton, image generation, Website Generation, Document drafts generations, Vector designs and more.

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-intersect-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-intersect"
    action: "ask_chatgpt"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Ask ChatGPT** | Ask ChatGPT anything you want! |
| **Ask Assistant** | Ask a GPT assistant anything you want! |
| **Generate Image** | Generate an image using DALL-E |
| **Vision Prompt** | Ask GPT a question about an image |
| **Text-to-Speech** | Generate an audio recording from text |
| **Transcribe Audio** | Transcribe audio to text using whisper-1 model |
| **Translate Audio** | Translate audio to text using whisper-1 model |
| **Extract Structured Data from Text** | Returns structured data from provided unstructured text. |
| **Create Video** | Create a video using VideoCanvas with AI |
| **Text to Voice** | Convert text to voice using AI voice synthesis |
| **Create Canvas** | Create a canvas of any type using AI. Returns a link and generated output. |

## Used In Showcases

- [marketing-campaign](/showcase/marketing-campaign)
- [ai-journal](/showcase/ai-journal)
- [ai-cookbook](/showcase/ai-cookbook)

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
