# Local AI Showcase

Run AI models locally without external APIs using llama.cpp via node-llama-cpp.

## Features

| Feature | Status | Notes |
|---------|--------|-------|
| **Text Generation** | ✅ Working | Uses qwen2.5-0.5b or any GGUF model |
| **Data Extraction** | ✅ Working | Extract structured JSON from text |
| **Vision/Image-to-Text** | ⚠️ Limited | node-llama-cpp v3.x doesn't support multimodal yet |
| **Image Generation** | ⚠️ Limited | Requires native SD bindings (not available in npm) |

## Quick Start

```bash
# Start the server
pnpm nx dev @ha-bits/cortex --config showcase/local-ai/stack.yaml

# Server runs on http://localhost:13000
```

## Workflows

### 1. Ask Local AI (Text Generation)
Generate text responses using a local LLM.

```bash
curl -X POST http://localhost:13000/api/ask-local-ai \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 2+2?"}'
```

### 2. Extract Data (Structured Output)
Extract structured data from text content.

```bash
curl -X POST http://localhost:13000/api/extract-data \
  -H "Content-Type: application/json" \
  -d '{
    "content": "John Smith is 35 and lives in New York",
    "schema": "{ \"name\": \"string\", \"age\": \"number\", \"city\": \"string\" }"
  }'
```

### 3. Vision Prompt (Image-to-Text)
**Status: Limited** - Returns informative message about node-llama-cpp limitations.

```bash
curl -X POST http://localhost:13000/api/vision-prompt \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64>", "prompt": "What do you see?"}'
```

**Alternatives for vision tasks:**
- Use Ollama with LLaVA models
- Use OpenAI-compatible APIs with vision support
- Run llama.cpp server directly with `--mmproj` flag

### 4. Generate Image (Text-to-Image)
**Status: Limited** - Requires native Stable Diffusion bindings not available in npm.

```bash
curl -X POST http://localhost:13000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a cute cat"}'
```

## Models

Models are stored in `~/.habits/models/`. The following models are recommended:

| Model | Size | Purpose |
|-------|------|---------|
| `qwen2.5-0.5b.gguf` | ~491MB | Text generation (fast, lightweight) |
| `Qwen3.5-0.8B-Q4_K_M.gguf` | ~533MB | Multimodal (vision not yet exposed in bindings) |

### Installing Models

```bash
# List available models
curl http://localhost:13000/api/list-models

# Or manually download from Hugging Face
cd ~/.habits/models
wget https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf
```

## Technical Details

### Dependencies
- **node-llama-cpp v3.18.1**: Core LLM inference
- **Hardware**: Supports Metal (macOS), CUDA, Vulkan acceleration

### Known Limitations

1. **Vision/Multimodal**: node-llama-cpp doesn't expose multimodal APIs yet
   - Models like Qwen3.5-0.8B have vision capabilities but they aren't accessible
   - Track progress: https://github.com/withcatai/node-llama-cpp

2. **Image Generation**: Requires native stable-diffusion.cpp bindings
   - No npm package currently provides these bindings
   - SD models are downloaded but can't be used without native code

## Configuration

Edit `stack.yaml` to customize:
- Models to use
- Default parameters
- Frontend settings

## Frontend

A simple web UI is served at `http://localhost:13000/` for interactive testing.
