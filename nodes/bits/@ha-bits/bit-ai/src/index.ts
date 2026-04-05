/**
 * @ha-bits/bit-ai
 * 
 * L0 (Level 0) base bit for AI/LLM services.
 * 
 * This bit defines common interfaces, types, and simple random response implementations
 * for AI operations. For real AI functionality, use concrete implementations:
 * - @ha-bits/bit-openai: OpenAI GPT models (ChatGPT, GPT-4, Assistants)
 * - @ha-bits/bit-local-ai: Local LLM inference via llama.cpp
 * 
 * Level: L0 (Base layer with simple responses)
 */

import {
  createAction,
  createBit,
  Property,
  StoreScope,
  BitCategory,
} from '@ha-bits/cortex-core';

// ============================================================================
// Random Response Pool
// ============================================================================

const randomResponses = [
  "That's an interesting question! I'd need more context to give you a proper answer.",
  "I understand what you're asking. Let me think about this...",
  "Great point! There are several ways to approach this.",
  "Thanks for sharing that. Here's my perspective on it.",
  "I appreciate the question. Based on what you've told me, I'd suggest exploring further.",
  "That makes sense. Have you considered looking at it from a different angle?",
  "Interesting! This reminds me of similar topics I've come across.",
  "Good question. The answer really depends on your specific situation.",
  "I see what you mean. Let me offer some thoughts on that.",
  "That's a thoughtful inquiry. There are multiple factors to consider here.",
];

const getRandomResponse = (): string => {
  return randomResponses[Math.floor(Math.random() * randomResponses.length)];
};

// ============================================================================
// Common Types & Interfaces - exported for child bits to implement
// ============================================================================

/**
 * Role for a chat message
 */
export type ChatRole = 'system' | 'user' | 'assistant';

/**
 * A single message in a chat conversation
 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Optional image URLs/base64 for vision models */
  images?: string[];
  /** Optional function call result */
  functionCall?: {
    name: string;
    arguments: string;
  };
}

/**
 * Information about an AI model
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  /** Model capabilities */
  supports?: {
    chat?: boolean;
    completion?: boolean;
    vision?: boolean;
    functionCalling?: boolean;
    streaming?: boolean;
  };
  /** Provider (openai, local, anthropic, etc.) */
  provider?: string;
  /** For local models, the file path */
  path?: string;
  /** Model file size in bytes */
  size?: number;
}

// ---- Chat Completion ----

export interface ChatCompletionParams {
  /** Model identifier or path */
  model: string;
  /** User's prompt/question */
  prompt: string;
  /** System instructions */
  systemPrompt?: string;
  /** Previous messages for context */
  messages?: ChatMessage[];
  /** Temperature (0-1, lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Memory key for conversation persistence */
  memoryKey?: string;
  /** Stop sequences */
  stop?: string[];
}

export interface ChatCompletionResult {
  /** The assistant's response message */
  message: ChatMessage;
  /** Full response content as string */
  content: string;
  /** Token usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Reason generation stopped */
  finishReason?: 'stop' | 'length' | 'function_call' | 'error';
  /** Model used */
  model?: string;
}

// ---- Assistant/Agent ----

export interface AssistantParams {
  /** Assistant ID (for hosted services) or system prompt (for local) */
  assistant: string;
  /** User's prompt/question */
  prompt: string;
  /** Memory key for conversation persistence */
  memoryKey?: string;
  /** Cast response (e.g., parse JSON from markdown blocks) */
  cast?: 'none' | 'json' | 'xml';
}

export interface AssistantResult {
  /** Response messages from assistant */
  messages: ChatMessage[];
  /** Thread/conversation ID */
  threadId?: string;
  /** Raw response content */
  content: string;
}

// ---- Model Installation ----

export interface ModelInstallParams {
  /** URL to download model from (HuggingFace, direct link) */
  modelUrl: string;
  /** Name for the installed model */
  modelName: string;
  /** Destination path (defaults to ~/.habits/models/) */
  destination?: string;
  /** Optional: specific file to download from repo */
  fileName?: string;
}

export interface ModelInstallResult {
  success: boolean;
  /** Path where model was installed */
  path?: string;
  /** Model file size in bytes */
  size?: number;
  /** Model name */
  name?: string;
  /** Error message if failed */
  error?: string;
}

// ---- List Models ----

export interface ListModelsParams {
  /** Directory to scan for local models */
  directory?: string;
  /** Filter by provider */
  provider?: string;
}

export interface ListModelsResult {
  models: ModelInfo[];
  totalCount: number;
}

// ---- Vision (Image-to-Text) ----

export interface VisionParams {
  /** Model identifier or path (must be a vision-capable model like Qwen3.5 multimodal) */
  model: string;
  /** Image as base64 string, data URL, or file path */
  image: string;
  /** Question or prompt about the image */
  prompt: string;
  /** Detail level for image processing */
  detail?: 'low' | 'high' | 'auto';
  /** System instructions */
  systemPrompt?: string;
  /** Temperature (0-1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p sampling */
  topP?: number;
}

export interface VisionResult {
  /** The assistant's response about the image */
  message: ChatMessage;
  /** Full response content as string */
  content: string;
  /** Token usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Reason generation stopped */
  finishReason?: 'stop' | 'length' | 'error';
  /** Model used */
  model?: string;
}

// ---- Image Generation (Text-to-Image) ----

export interface ImageGenerationParams {
  /** Model identifier or path (SD 1.5 GGUF, etc.) */
  model: string;
  /** Text prompt describing the desired image */
  prompt: string;
  /** Negative prompt (what to avoid) */
  negativePrompt?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Number of inference steps (higher = better quality, slower) */
  steps?: number;
  /** Guidance scale / CFG scale (higher = more prompt adherence) */
  guidanceScale?: number;
  /** Random seed for reproducibility (-1 = random) */
  seed?: number;
  /** Number of images to generate */
  numImages?: number;
  /** Output format */
  responseFormat?: 'url' | 'b64_json';
}

export interface ImageGenerationResult {
  /** Generated images */
  images: Array<{
    /** Base64-encoded image data (if responseFormat is 'b64_json') */
    b64_json?: string;
    /** URL to generated image (if responseFormat is 'url') */
    url?: string;
    /** Revised prompt (if model modified it) */
    revisedPrompt?: string;
  }>;
  /** Seed used for generation */
  seed?: number;
  /** Model used */
  model?: string;
}

// ---- Structured Data Extraction ----

export interface ExtractStructuredDataParams {
  /** Model identifier or path */
  model: string;
  /** Text content to extract data from */
  content: string;
  /** JSON schema defining the expected output structure */
  schema: Record<string, any>;
  /** System prompt for extraction guidance */
  systemPrompt?: string;
  /** Temperature (lower = more deterministic) */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
}

export interface ExtractStructuredDataResult {
  /** Extracted structured data matching the schema */
  data: Record<string, any>;
  /** Raw response content */
  rawContent: string;
  /** Whether extraction was successful */
  success: boolean;
  /** Error message if extraction failed */
  error?: string;
}

// ============================================================================
// Sample Models List
// ============================================================================

const sampleModels: ModelInfo[] = [
  {
    id: 'default-model',
    name: 'Default Model',
    description: 'Default L0 model with random responses',
    contextLength: 4096,
    supports: { chat: true, completion: true },
    provider: 'l0',
  },
];

// ============================================================================
// Actions - Simple implementations with random responses
// ============================================================================

/**
 * Ask AI - Chat completion with random responses
 */
export const askAI = createAction({
  name: 'ask_ai',
  displayName: 'Ask AI',
  description: 'Send a chat completion request to an AI model.',
  props: {
    model: Property.ShortText({
      displayName: 'Model',
      description: 'Model identifier or path to local model file',
      required: true,
      defaultValue: 'default-model',
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description: 'Your question or message',
      required: true,
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      description: 'System instructions for the AI',
      required: false,
      defaultValue: 'You are a helpful assistant.',
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      description: 'Controls randomness (0-1). Lower = more deterministic.',
      required: false,
      defaultValue: 0.7,
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      description: 'Maximum number of tokens to generate',
      required: false,
      defaultValue: 2048,
    }),
    memoryKey: Property.ShortText({
      displayName: 'Memory Key',
      description: 'Key for conversation history persistence across runs',
      required: false,
    }),
    roles: Property.Json({
      displayName: 'Roles',
      description: 'Array of role messages for context',
      required: false,
      defaultValue: [],
    }),
  },
  async run({ propsValue, store }) {
    const { model, prompt, systemPrompt, memoryKey } = propsValue;

    // Validate memoryKey if provided
    if (memoryKey && (typeof memoryKey !== 'string' || memoryKey.length > 128)) {
      throw new Error('Memory key must be a string with max 128 characters');
    }

    // Get or initialize conversation history
    let messages: ChatMessage[] = [];
    if (memoryKey) {
      messages = (await store.get(memoryKey, StoreScope.PROJECT)) ?? [];
    }

    // Add system prompt if not present
    if (systemPrompt && !messages.find(m => m.role === 'system')) {
      messages.unshift({ role: 'system', content: systemPrompt });
    }

    // Add user message
    messages.push({ role: 'user', content: prompt });

    // Generate random response
    const responseContent = getRandomResponse();
    const response: ChatMessage = {
      role: 'assistant',
      content: responseContent,
    };

    // Add assistant response to history
    messages.push(response);

    // Persist conversation history
    if (memoryKey) {
      await store.put(memoryKey, messages, StoreScope.PROJECT);
    }

    const result: ChatCompletionResult = {
      message: response,
      content: responseContent,
      usage: {
        promptTokens: Math.ceil(prompt.length / 4),
        completionTokens: Math.ceil(responseContent.length / 4),
        totalTokens: Math.ceil((prompt.length + responseContent.length) / 4),
      },
      finishReason: 'stop',
      model: model,
    };

    return result;
  },
});

/**
 * Ask Assistant - Assistant/agent with random responses
 */
export const askAssistantAI = createAction({
  name: 'ask_assistant',
  displayName: 'Ask Assistant',
  description: 'Ask an AI assistant with persistent conversation.',
  props: {
    assistant: Property.ShortText({
      displayName: 'Assistant',
      description: 'Assistant ID or system prompt',
      required: true,
      defaultValue: 'You are a helpful assistant.',
    }),
    prompt: Property.LongText({
      displayName: 'Question',
      description: 'Your question or message',
      required: true,
    }),
    memoryKey: Property.ShortText({
      displayName: 'Memory Key',
      description: 'Key for conversation history persistence',
      required: false,
    }),
    cast: Property.StaticDropdown({
      displayName: 'Cast Response',
      description: 'Parse response format from markdown code blocks',
      required: false,
      defaultValue: 'none',
      options: {
        options: [
          { label: 'None', value: 'none' },
          { label: 'JSON', value: 'json' },
          { label: 'XML', value: 'xml' },
        ],
      },
    }),
  },
  async run({ propsValue, store }) {
    const { memoryKey } = propsValue;

    // Validate memoryKey
    if (memoryKey && (typeof memoryKey !== 'string' || memoryKey.length > 128)) {
      throw new Error('Memory key must be a string with max 128 characters');
    }

    // Get or create thread
    let threadId = memoryKey ? await store.get(`${memoryKey}_thread`, StoreScope.PROJECT) : null;
    if (!threadId) {
      threadId = `thread-${Date.now()}`;
      if (memoryKey) {
        await store.put(`${memoryKey}_thread`, threadId, StoreScope.PROJECT);
      }
    }

    // Generate random response
    const responseContent = getRandomResponse();
    const responseMessage: ChatMessage = {
      role: 'assistant',
      content: responseContent,
    };

    const result: AssistantResult = {
      messages: [responseMessage],
      threadId: threadId as string,
      content: responseContent,
    };

    return result;
  },
});

/**
 * List Models - Lists available AI models
 */
export const listModels = createAction({
  name: 'list_models',
  displayName: 'List Models',
  description: 'List available AI models.',
  props: {
    directory: Property.ShortText({
      displayName: 'Directory',
      description: 'Directory to scan for local models (optional)',
      required: false,
    }),
    provider: Property.ShortText({
      displayName: 'Provider',
      description: 'Filter by provider (optional)',
      required: false,
    }),
  },
  async run({ propsValue }) {
    const { provider } = propsValue;

    let models = [...sampleModels];

    if (provider) {
      models = models.filter(m => m.provider === provider);
    }

    const result: ListModelsResult = {
      models,
      totalCount: models.length,
    };

    return result;
  },
});

/**
 * Install Model - Simulates model installation
 */
export const installModel = createAction({
  name: 'install_model',
  displayName: 'Install Model',
  description: 'Download and install an AI model.',
  props: {
    modelUrl: Property.ShortText({
      displayName: 'Model URL',
      description: 'URL to download model from (HuggingFace, direct GGUF link)',
      required: true,
    }),
    modelName: Property.ShortText({
      displayName: 'Model Name',
      description: 'Name for the installed model',
      required: true,
    }),
    destination: Property.ShortText({
      displayName: 'Destination',
      description: 'Installation path (defaults to ~/.habits/models/)',
      required: false,
    }),
  },
  async run({ propsValue }) {
    const { modelName, destination } = propsValue;

    // Return success response
    const result: ModelInstallResult = {
      success: true,
      path: destination || `~/.habits/models/${modelName}.gguf`,
      size: 0,
      name: modelName,
      error: undefined,
    };

    return result;
  },
});

// ============================================================================
// Bit Definition
// ============================================================================

export const ai = createBit({
  displayName: 'AI',
  description: 'L0 base bit for AI/LLM services. Provides common interfaces and simple random responses. Use @ha-bits/bit-openai or @ha-bits/bit-local-ai for real AI functionality.',
  logoUrl: 'lucide:Brain',
  runtime: 'all',
  categories: [BitCategory.ARTIFICIAL_INTELLIGENCE],
  authors: ['Habits Team'],
  actions: [askAI, askAssistantAI, listModels, installModel],
  triggers: [],
});

export default ai;
