---
title: "List Models"
description: "Local AI inference services with OpenAI-compatible interface. Run LLMs, Stable Diffusion, Whisper, and more entirely on your machine."
aside: false
---

<script setup>
import { Package } from 'lucide-vue-next'
</script>

# <component :is="Package" :size="32" class="inline-icon" /> List Models

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-local-ai`</span>
  <span class="bit-version">v0.1.0</span>
  
  <span class="bit-categories"><span class="bit-category">local-ai</span> <span class="bit-category">llm</span> <span class="bit-category">whisper</span> <span class="bit-category">stable-diffusion</span> <span class="bit-category">text-generation</span></span>
</div>

Local AI inference services with OpenAI-compatible interface. Run LLMs, Stable Diffusion, Whisper, and more entirely on your machine.

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-local-ai-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-local-ai"
    action: "ask_local_llm"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Ask Local LLM** | Generate text responses using a local LLM model. |
| **Generate Image** | Generate images from text prompts using local Stable Diffusion models. Similar to DALL-E but runs on your machine. |
| **Transcribe Audio** | Transcribe audio files to text using local Whisper models. Similar to OpenAI Whisper API but runs on your machine. |
| **Text-to-Speech** | Generate spoken audio from text using local MetaVoice models. Similar to OpenAI TTS but runs on your machine. |
| **Caption Image** | Generate descriptions for images using local BLIP models. Similar to GPT-4 Vision but runs on your machine. |
| **Vision Prompt** | Analyze images and answer questions about them using vision-capable local models. Similar to GPT-4 Vision. |
| **Extract Structured Data** | Extract structured JSON data from text using a schema definition. Useful for parsing invoices, receipts, documents, etc. |
| **Install Model** | Download and install an AI model. Provide a known model name (e.g.,  |
| **List Models** | List locally available AI models. |
| **Get System Info** | Get information about the local AI environment (device support, version, etc.). |

## Used In Showcases

- [local-ai](/showcase/local-ai)

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
