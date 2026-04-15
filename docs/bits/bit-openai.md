---
title: "List Models"
description: "OpenAI AI services including ChatGPT, GPT-4, Assistants, DALL-E, and more. Implements the @ha-bits/bit-ai interface."
aside: false
---

<script setup>
import { Sparkles } from 'lucide-vue-next'
</script>

# <component :is="Sparkles" :size="32" class="inline-icon" /> List Models

<div class="bit-meta">
  <span class="bit-package">`@ha-bits/bit-openai`</span>
  <span class="bit-version">v0.1.11</span>
  
  <span class="bit-categories"><span class="bit-category">openai</span> <span class="bit-category">openai</span> <span class="bit-category">ai</span></span>
</div>

OpenAI AI services including ChatGPT, GPT-4, Assistants, DALL-E, and more. Implements the @ha-bits/bit-ai interface.

## Usage

```yaml
# In your habit YAML
nodes:
  - id: my-bit-openai-node
    type: bit
    framework: bits
    module: "@ha-bits/bit-openai"
    action: "ask_chatgpt"
    data:
      # action properties...
```

## Actions

| Action | Description |
|--------|-------------|
| **Ask ChatGPT** | Ask ChatGPT anything you want! |
| **Ask Assistant** | Ask a GPT assistant anything you want! |
| **List Models** | List available OpenAI models for your account. |
| **Generate Image** | Generate an image using DALL-E |
| **Vision Prompt** | Ask GPT a question about an image |
| **Text-to-Speech** | Generate an audio recording from text |
| **Transcribe Audio** | Transcribe audio to text using whisper-1 model |
| **Translate Audio** | Translate audio to text using whisper-1 model |
| **Extract Structured Data from Text** | Returns structured data from provided unstructured text. |

## Used In Showcases

- [resume-analyzer](/showcase/resume-analyzer)

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
