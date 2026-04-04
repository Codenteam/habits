# @ha-bits/bit-local-ai

L1 bit for local AI/LLM inference using llama.cpp.

This bit enables running AI models locally on your device without requiring cloud services. It uses:
- **Node.js**: [node-llama-cpp](https://github.com/withcatai/node-llama-cpp) - Pre-built bindings with GPU support
- **Tauri (Desktop/Mobile)**: Custom Rust plugin using [llama-cpp-2](https://crates.io/crates/llama-cpp-2) crate

## Level: L1 (Implements @ha-bits/bit-ai)

This bit replaces the L0 `@ha-bits/bit-ai` base bit with real local model inference.

## Features

- Run LLMs locally on CPU, Metal (macOS), CUDA (NVIDIA), or Vulkan
- Support for GGUF model format (llama.cpp standard)
- Download models from HuggingFace or direct URLs
- Conversation memory persistence
- Works on desktop (macOS, Windows, Linux) and mobile (iOS, Android via Tauri)

## Actions

### ask_ai
Send a chat completion request to a local model.

**Props:**
- `model` (string): Path to local GGUF model file
- `prompt` (string): User message/question
- `systemPrompt` (string, optional): System instructions
- `temperature` (number, optional): Randomness control (0-1)
- `maxTokens` (number, optional): Maximum response tokens
- `memoryKey` (string, optional): Key for conversation history persistence
- `gpuLayers` (number, optional): Number of layers to offload to GPU

### ask_assistant
Ask an assistant with a persistent system prompt.

**Props:**
- `assistant` (string): System prompt for the assistant
- `prompt` (string): User message
- `memoryKey` (string, optional): Conversation persistence key

### list_models
List locally installed GGUF models.

**Props:**
- `directory` (string, optional): Directory to scan (defaults to ~/.habits/models/)

### install_model
Download and install a GGUF model.

**Props:**
- `modelUrl` (string): HuggingFace URL or direct GGUF link
- `modelName` (string): Name for the model
- `destination` (string, optional): Installation directory

## Supported Models

Any GGUF format model works. Recommended models:

| Model | Size | Use Case |
|-------|------|----------|
| Llama 3.2 1B | ~1.3GB | Fast responses, mobile |
| Llama 3.2 3B | ~2.5GB | Balanced performance |
| Phi-3 Mini | ~2.4GB | Efficient, good for code |
| Mistral 7B | ~4GB | High quality, desktop |

## Usage

```yaml
nodes:
  - id: local-chat
    type: action
    data:
      framework: bits
      module: "@ha-bits/bit-local-ai"
      operation: ask_ai
      params:
        model: "~/.habits/models/llama-3.2-1b-instruct-q4_k_m.gguf"
        prompt: "{{habits.input.question}}"
        systemPrompt: "You are a helpful assistant."
        temperature: 0.7
        maxTokens: 1024
```

## Model Installation

Download a model using the `install_model` action or via CLI:

```yaml
nodes:
  - id: download-model
    type: action
    data:
      framework: bits
      module: "@ha-bits/bit-local-ai"
      operation: install_model
      params:
        modelUrl: "https://huggingface.co/lmstudio-community/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf"
        modelName: "llama-3.2-1b"
```

## Platform Support

| Platform | Runtime | GPU Support |
|----------|---------|-------------|
| macOS | Node.js | Metal |
| macOS | Tauri | Metal |
| Windows | Node.js | CUDA, Vulkan |
| Windows | Tauri | CUDA, Vulkan |
| Linux | Node.js | CUDA, Vulkan |
| Linux | Tauri | CUDA, Vulkan |
| iOS | Tauri | Metal |
| Android | Tauri | Vulkan |
