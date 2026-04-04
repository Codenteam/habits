# @ha-bits/bit-ai

L0 (Level 0) base bit for AI/LLM services.

This bit defines common interfaces, types, and in-memory stub implementations for AI operations. It should be replaced by concrete implementations:

- `@ha-bits/bit-openai`: OpenAI GPT models (ChatGPT, GPT-4, Assistants)
- `@ha-bits/bit-local-ai`: Local LLM inference via llama.cpp

## Level: L0 (Abstract base)

This bit provides fallback in-memory implementations for testing and development. For production use, configure a concrete L1 implementation.

## Actions

### ask_ai
Send a chat completion request to an AI model.

**Props:**
- `model` (string): Model identifier
- `prompt` (string): User message/question
- `systemPrompt` (string, optional): System instructions
- `temperature` (number, optional): Randomness control (0-1)
- `maxTokens` (number, optional): Maximum response tokens
- `memoryKey` (string, optional): Key for conversation history persistence

### list_models
List available AI models.

**Returns:** Array of model metadata objects

### install_model
Install/download a model (implementation varies by L1 bit).

**Props:**
- `modelUrl` (string): URL to download model from
- `modelName` (string): Name for the installed model
- `destination` (string, optional): Installation path

## Types

This bit exports common types for AI operations:

- `ChatMessage` - Message with role and content
- `ChatCompletionParams` - Parameters for chat completion
- `ChatCompletionResult` - Response from chat completion
- `ModelInfo` - Model metadata
- `ModelInstallParams` - Model installation parameters
- `ModelInstallResult` - Installation result

## Usage

```yaml
nodes:
  - id: ask-ai
    type: action
    data:
      framework: bits
      module: "@ha-bits/bit-ai"  # or @ha-bits/bit-openai, @ha-bits/bit-local-ai
      operation: ask_ai
      params:
        model: "gpt-4"
        prompt: "Hello, how are you?"
```
