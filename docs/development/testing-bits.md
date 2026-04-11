# Testing Bits

Habits provides a lightweight testing framework for bits that focuses on **Input → Output** validation without needing to mock entire servers or frameworks.

## Overview

The `@ha-bits/testing` package provides:
- **YAML-based tests** (`.test.yaml`) - Simple, declarative test definitions
- **TypeScript tests** (`.test.ts`) - For complex mocking scenarios
- **Fetch-level mocking** - HTTP request interception
- **Store mocking** - For testing stateful bits
- **Module mocking** - For SDK-level mocking

## Test Schema

The complete YAML schema for test files:

<<< @/../schemas/test.schema.yaml

## Quick Start

### 1. Create a Test File

Place a `.test.yaml` file next to your bit source:

```
my-bit/
├── src/
│   ├── index.ts
│   └── index.test.yaml    # ← Test file here
```

### 2. Write Tests

```yaml
bit: ./index.ts
tests:
  - name: "basic operation"
    action: myAction
    auth: { apiKey: "sk-test-key" }
    input:
      param1: "value1"
      param2: 42
    mocks:
      fetch:
        - url: "*/api/endpoint"
          response:
            result: "success"
    expect:
      output: "success"
```

### 3. Run Tests

```bash
# Run all bit tests
npx bits-test

# Run tests for specific bit
npx bits-test -f bit-openai

# Verbose output
npx bits-test -v
```

## Test File Structure

### Bit Test File (`.test.yaml`)

```yaml
# Path to the bit source file
bit: ./index.ts

# Default action for all tests (optional)
action: myDefaultAction

# Test cases
tests:
  - name: "test name"
    action: specificAction      # Override default action
    auth:                       # Authentication credentials
      apiKey: "sk-test"
    input:                      # Input parameters (propsValue)
      prompt: "Hello"
    mocks:                      # Mocks configuration
      modules: {...}            # Module mocks (object or array format)
      fetch: [...]
      store: { initial: {} }
    expect: "expected output"   # Expected result
    expectStore: {}             # Expected store state after test
    expectError: "error msg"    # Expected error (for error tests)
```

## Mocking

### Module Mocking (Recommended for SDKs)

For bits that use SDKs like OpenAI, Anthropic, etc., mock the module directly using the **object format**:

```yaml
mocks:
  modules:
    openai:
      chat.completions.create:
        choices:
          - message: { content: "Hello!", role: "assistant" }
```

This is cleaner than fetch mocking because:
- No need to match exact URLs
- Works regardless of how the SDK makes HTTP calls
- Automatically handles ES module interop

#### Method Paths

Specify the full method path using dot notation:

```yaml
mocks:
  modules:
    openai:
      chat.completions.create: { ... }      # For chat
      images.generate: { ... }               # For images
      embeddings.create: { ... }             # For embeddings
    anthropic:
      messages.create: { ... }               # Anthropic SDK
```

### Fetch Mocking

For bits that make direct HTTP calls (not through an SDK):

```yaml
mocks:
  fetch:
    - url: "*/chat/completions"
      method: POST
      response:
        choices:
          - message: { content: "Hello!", role: "assistant" }
      status: 200
```

#### URL Patterns

- `*` - Match any URL
- `*/endpoint` - Match URLs ending with `/endpoint`
- `https://api.example.com/*` - Match specific domain

#### Asserting Request Body

```yaml
mocks:
  fetch:
    - url: "*/completions"
      assertRequest:
        model: "gpt-4"
        temperature: 0.7
      response: { ... }
```

### Module Clearing

For SDKs that need to reload with mocked fetch:

```yaml
mocks:
  clearModules: [openai, anthropic]
  fetch:
    - url: "*/completions"
      response: { ... }
```

This clears the module from Node's cache so it reloads and picks up the mocked global fetch.

### Store Mocking

For bits that use persistent storage:

```yaml
tests:
  - name: "with memory"
    input:
      prompt: "Remember: Alice"
      memoryKey: "session-1"
    mocks:
      store:
        initial: {}
    expect: "I'll remember that!"
    expectStore:
      "session-1":
        - role: user
          content: "Remember: Alice"
        - role: assistant
          content: "I'll remember that!"
```

## TypeScript Tests (`.test.ts`)

For complex scenarios requiring custom mocks or logic:

```typescript
// my-action.sdk.test.ts
class MockOpenAI {
  constructor(config: any) {}
  chat = {
    completions: {
      create: async () => ({
        choices: [{ message: { content: 'Response', role: 'assistant' } }],
      }),
    },
  };
}

export default [
  {
    name: 'with mocked SDK',
    action: 'myAction',
    mocks: {
      modules: [
        {
          moduleName: 'openai',
          exports: {
            default: MockOpenAI,
          },
        },
      ],
    },
    auth: { apiKey: 'sk-test' },
    input: { prompt: 'Hello' },
    expect: 'Response',
  },
];
```

## Complete Example

Here's a full example testing an OpenAI-based bit with module mocking:

```yaml
# bit-intersect/src/lib/actions/send-prompt.test.yaml
bit: ./send-prompt.ts
action: ask_chatgpt
tests:
  - name: "basic prompt"
    auth:
      apiKey: "sk-test"
      host: "api.openai.com"
    input:
      model: gpt-5
      prompt: "What is 2+2?"
      maxTokens: 100
    mocks:
      modules:
        openai:
          chat.completions.create:
            choices:
              - message: { content: "4", role: "assistant" }
    expect: "4"

  - name: "with memory key stores conversation"
    auth:
      apiKey: "sk-test"
      host: "api.openai.com"
    input:
      model: gpt-5
      prompt: "Remember my name is Alice"
      maxTokens: 100
      memoryKey: "session-1"
    mocks:
      modules:
        openai:
          chat.completions.create:
            choices:
              - message: { content: "I'll remember that!", role: "assistant" }
      store:
        initial: {}
    expect: "I'll remember that!"
    expectStore:
      "session-1":
        - role: user
          content: "Remember my name is Alice"
        - role: assistant
          content: "I'll remember that!"
```

### Alternative: Fetch Mocking

For bits that don't use SDKs, you can mock at the fetch level:

```yaml
# bit-openai/src/index.test.yaml
bit: ./index.ts
tests:
  - name: "chatCompletion"
    action: chatCompletion
    auth: { apiKey: "sk-test-key" }
    input:
      model: gpt-4o-mini
      userMessage: "Hello"
      systemPrompt: "You are helpful"
      temperature: 0.7
      maxTokens: 100
    mocks:
      clearModules: [openai]
      fetch:
        - url: "*/chat/completions"
          response:
            choices:
              - message: { content: "Hi there!", role: "assistant" }
                finish_reason: "stop"
            model: "gpt-4o-mini"
            usage: { prompt_tokens: 10, completion_tokens: 5 }
    expect:
      content: "Hi there!"
      finishReason: "stop"
      model: "gpt-4o-mini"
```

## Testing Workflows

You can also test entire workflows/habits:

```yaml
# workflow.test.yaml
workflow: ./my-workflow.yaml
tests:
  - name: "end-to-end flow"
    trigger:
      body: { message: "Hello" }
    mocks:
      bits:
        - bit: "bit-openai"
          action: "chatCompletion"
          response: { content: "Hi!" }
    expect:
      response: "Hi!"
```

## CLI Reference

```bash
bits-test [options]

Options:
  -f, --file <pattern>   Run tests matching file pattern
  -a, --action <name>    Only run tests for specific action
  -v, --verbose          Show detailed output
  -h, --help             Show help

Examples:
  bits-test                           # Run all tests
  bits-test -f bit-openai             # Run bit-openai tests
  bits-test -f intersect -a send      # Run specific action tests
  bits-test -v                        # Verbose output
```

## Best Practices

### 1. Test Happy Paths First
Focus on expected behavior before edge cases:

```yaml
tests:
  - name: "returns valid response"
    input: { prompt: "Hello" }
    expect: { content: "Hi!" }
```

### 2. Use Descriptive Names
Test names should describe the scenario:

```yaml
tests:
  - name: "with memory key stores conversation"
  - name: "handles empty input gracefully"
  - name: "returns error for invalid API key"
```

### 3. Mock at the Right Level
- **Module mocking (object format)** - For bits using SDKs (OpenAI, Anthropic, etc.) - declarative in YAML
- **Module mocking (array format)** - When full control over a module is needed - for TypeScript tests
- **Fetch mocking** - For bits making direct HTTP calls - use `mocks.fetch`
- **Store mocking** - For stateful operations - use `mocks.store`

### 4. Test Error Cases

```yaml
tests:
  - name: "handles API error"
    input: { prompt: "Hello" }
    mocks:
      fetch:
        - url: "*/completions"
          status: 500
          response: { error: "Internal error" }
    expectError: "Internal error"
```

### 5. Keep Tests Independent
Each test should be self-contained with its own mocks:

```yaml
tests:
  - name: "test 1"
    mocks:
      store: { initial: {} }
    # ...

  - name: "test 2"
    mocks:
      store: { initial: { key: "value" } }
    # ...
```

## Troubleshooting

### "No mock found for URL"
Ensure your URL pattern matches the actual request:

```yaml
# Too specific - might not match
- url: "https://api.openai.com/v1/chat/completions"

# Better - uses wildcard
- url: "*/chat/completions"
```

### Module Not Clearing
Add the module to `clearModules`:

```yaml
mocks:
  clearModules: [openai, @anthropic-ai/sdk]
```

### Store State Not Persisting
Ensure `store.initial` is defined:

```yaml
mocks:
  store:
    initial: {}  # Required for store to work
```
