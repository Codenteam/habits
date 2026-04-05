# @ha-bits/bit-local-ai

Local AI inference bit module for Habits workflows. Provides OpenAI-compatible interface for local AI models.

## Features

- **Text Generation** (ChatGPT-like): Generate text using local LLM models (GGUF format)
- **Image Generation** (DALL-E-like): Generate images using Stable Diffusion
- **Audio Transcription** (Whisper-like): Transcribe audio to text using Whisper models
- **Text-to-Speech** (TTS-like): Synthesize speech from text using MetaVoice
- **Image Captioning** (Vision-like): Generate captions for images using BLIP

## Installation

```bash
npm install @ha-bits/bit-local-ai
```

## Requirements

This bit requires the local-ai-rust bindings. It can run in two modes:

### Node.js Mode
Requires `@local-ai/node` native addon:
```bash
npm install @local-ai/node
```

### Tauri Mode
When running inside a Tauri application, it uses the `tauri-plugin-local-ai` plugin which must be installed in your Tauri app.

## Authentication

Configure the bit with paths to your local models:

```yaml
auth:
  modelsBasePath: /path/to/models
  device: auto  # Options: auto, cpu, metal, cuda
```

## Actions

### Ask Local LLM
Similar to OpenAI's ChatGPT - generates text responses.

### Generate Image
Similar to DALL-E - generates images from text prompts using Stable Diffusion.

### Transcribe Audio
Similar to Whisper API - transcribes audio files to text.

### Text-to-Speech
Similar to OpenAI TTS - converts text to speech audio.

### Caption Image
Similar to GPT-4 Vision - generates descriptions of images.

## Model Support

- **Text Generation**: GGUF models (Qwen2, Llama, etc.)
- **Image Generation**: Stable Diffusion safetensors
- **Transcription**: Whisper models (tiny, base, small, medium, large)
- **Text-to-Speech**: MetaVoice models
- **Image Captioning**: BLIP models

## Level

This is an **L1 bit** that implements the `@ha-bits/bit-ai` interface for local AI inference.
