/**
 * @ha-bits/bit-local-ai
 * 
 * L1 bit for local AI/LLM inference using llama.cpp.
 * 
 * Uses node-llama-cpp for Node.js and a custom Tauri plugin for desktop/mobile.
 * Replaces the L0 @ha-bits/bit-ai base bit with real local model inference.
 * 
 * Level: L1 (Implements @ha-bits/bit-ai)
 */

import {
  createAction,
  createBit,
  Property,
  StoreScope,
  BitCategory,
} from '@ha-bits/cortex-core';

// Re-export types from L0 bit-ai
export type {
  ChatRole,
  ChatMessage,
  ModelInfo,
  ChatCompletionParams,
  ChatCompletionResult,
  AssistantParams,
  AssistantResult,
  ModelInstallParams,
  ModelInstallResult,
  ListModelsParams,
  ListModelsResult,
} from '@ha-bits/bit-ai';

import type {
  ChatMessage,
  ChatCompletionResult,
  AssistantResult,
  ModelInstallResult,
  ListModelsResult,
} from '@ha-bits/bit-ai';

// Import driver (will be stubbed for Tauri)
import * as driver from './driver';

// ============================================================================
// Actions - Local AI implementations
// ============================================================================

/**
 * Ask AI - Local chat completion
 */
export const askAI = createAction({
  name: 'ask_ai',
  displayName: 'Ask Local AI',
  description: 'Send a chat completion request to a local GGUF model.',
  props: {
    model: Property.ShortText({
      displayName: 'Model Path',
      description: 'Path to the local GGUF model file (e.g., ~/.habits/models/llama-3.2-1b.gguf)',
      required: true,
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
    topP: Property.Number({
      displayName: 'Top P',
      description: 'Nucleus sampling parameter (0-1)',
      required: false,
      defaultValue: 1.0,
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
    gpuLayers: Property.Number({
      displayName: 'GPU Layers',
      description: 'Number of layers to offload to GPU (0 = CPU only, -1 = auto)',
      required: false,
      defaultValue: -1,
    }),
  },
  async run({ propsValue, store }) {
    const { 
      model, 
      prompt, 
      systemPrompt, 
      temperature, 
      maxTokens, 
      topP,
      memoryKey,
      roles,
      gpuLayers,
    } = propsValue;

    // Sanitize memoryKey - ignore unresolved template expressions
    const cleanMemoryKey = memoryKey && !memoryKey.includes('habits.input') ? memoryKey : undefined;

    // Validate memoryKey if provided
    if (cleanMemoryKey && (typeof cleanMemoryKey !== 'string' || cleanMemoryKey.length > 128)) {
      throw new Error('Memory key must be a string with max 128 characters');
    }

    // Get or initialize conversation history
    let messages: ChatMessage[] = [];
    if (cleanMemoryKey && store) {
      messages = (await store.get(cleanMemoryKey, StoreScope.PROJECT)) ?? [];
    }

    // Add system prompt if not present
    if (systemPrompt && !messages.find(m => m.role === 'system')) {
      messages.unshift({ role: 'system', content: systemPrompt });
    }

    // Add role messages if provided
    if (roles && Array.isArray(roles)) {
      for (const roleMsg of roles) {
        if (roleMsg.role && roleMsg.content) {
          // Only add if not already present
          const exists = messages.find(m => m.role === roleMsg.role && m.content === roleMsg.content);
          if (!exists) {
            messages.push({ role: roleMsg.role, content: roleMsg.content });
          }
        }
      }
    }

    // Add user message
    messages.push({ role: 'user', content: prompt });

    // Call the driver to run inference
    const result = await driver.chat({
      modelPath: model,
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      topP,
      gpuLayers,
    });

    // Add assistant response to history
    messages.push(result.message);

    // Persist conversation history
    if (cleanMemoryKey && store) {
      await store.put(cleanMemoryKey, messages, StoreScope.PROJECT);
    }

    return result;
  },
});

/**
 * Ask Assistant - Local assistant with system prompt
 */
export const askAssistantAI = createAction({
  name: 'ask_assistant',
  displayName: 'Ask Local Assistant',
  description: 'Ask a local AI assistant with a custom system prompt.',
  props: {
    assistant: Property.LongText({
      displayName: 'Assistant System Prompt',
      description: 'System prompt defining the assistant\'s behavior',
      required: true,
      defaultValue: 'You are a helpful assistant.',
    }),
    model: Property.ShortText({
      displayName: 'Model Path',
      description: 'Path to the local GGUF model file',
      required: true,
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
    temperature: Property.Number({
      displayName: 'Temperature',
      description: 'Controls randomness (0-1)',
      required: false,
      defaultValue: 0.7,
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      description: 'Maximum tokens to generate',
      required: false,
      defaultValue: 2048,
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
    const { 
      assistant, 
      model, 
      prompt, 
      memoryKey, 
      temperature, 
      maxTokens,
      cast,
    } = propsValue;

    // Validate memoryKey
    if (memoryKey && (typeof memoryKey !== 'string' || memoryKey.length > 128)) {
      throw new Error('Memory key must be a string with max 128 characters');
    }

    // Get or initialize conversation history
    let messages: ChatMessage[] = [];
    if (memoryKey) {
      messages = (await store.get(memoryKey, StoreScope.PROJECT)) ?? [];
    }

    // System prompt as assistant definition
    if (assistant && !messages.find(m => m.role === 'system')) {
      messages.unshift({ role: 'system', content: assistant });
    }

    // Add user message
    messages.push({ role: 'user', content: prompt });

    // Generate thread ID
    let threadId = memoryKey ? await store.get(`${memoryKey}_thread`, StoreScope.PROJECT) : null;
    if (!threadId) {
      threadId = `local-thread-${Date.now()}`;
      if (memoryKey) {
        await store.put(`${memoryKey}_thread`, threadId, StoreScope.PROJECT);
      }
    }

    // Call the driver
    const completion = await driver.chat({
      modelPath: model,
      messages,
      systemPrompt: assistant,
      temperature,
      maxTokens,
    });

    // Add response to history
    messages.push(completion.message);

    // Persist history
    if (memoryKey) {
      await store.put(memoryKey, messages, StoreScope.PROJECT);
    }

    // Cast response if requested
    let content = completion.content;
    if (cast === 'json') {
      // Extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          content = JSON.parse(jsonMatch[1].trim());
        } catch {
          // Keep original if parsing fails
        }
      }
    } else if (cast === 'xml') {
      // Extract XML from markdown code blocks
      const xmlMatch = content.match(/```(?:xml)?\s*([\s\S]*?)```/);
      if (xmlMatch) {
        content = xmlMatch[1].trim();
      }
    }

    const result: AssistantResult = {
      messages: [completion.message],
      threadId: threadId as string,
      content: typeof content === 'string' ? content : JSON.stringify(content),
    };

    return result;
  },
});

/**
 * List Models - List locally installed models
 */
export const listModels = createAction({
  name: 'list_models',
  displayName: 'List Local Models',
  description: 'List locally installed GGUF models.',
  props: {
    directory: Property.ShortText({
      displayName: 'Directory',
      description: 'Directory to scan for models (defaults to ~/.habits/models/)',
      required: false,
    }),
  },
  async run({ propsValue }) {
    const { directory } = propsValue;

    const models = await driver.listLocalModels(directory);

    const result: ListModelsResult = {
      models,
      totalCount: models.length,
    };

    return result;
  },
});

/**
 * Install Model - Download and install a model
 */
export const installModel = createAction({
  name: 'install_model',
  displayName: 'Install Model',
  description: 'Download and install a GGUF model from HuggingFace or direct URL.',
  props: {
    modelUrl: Property.ShortText({
      displayName: 'Model URL',
      description: 'URL to download model from (HuggingFace or direct GGUF link)',
      required: true,
    }),
    modelName: Property.ShortText({
      displayName: 'Model Name',
      description: 'Name for the installed model (will be used as filename)',
      required: true,
    }),
    destination: Property.ShortText({
      displayName: 'Destination',
      description: 'Installation path (defaults to ~/.habits/models/)',
      required: false,
    }),
  },
  async run({ propsValue }) {
    const { modelUrl, modelName, destination } = propsValue;

    // Check if model already exists
    const existingModels = await driver.listLocalModels(destination);
    const fileName = modelName.endsWith('.gguf') ? modelName : `${modelName}.gguf`;
    const alreadyInstalled = existingModels.some(m => m.id === fileName);

    if (alreadyInstalled) {
      const existing = existingModels.find(m => m.id === fileName)!;
      console.log(`[LocalAI] Model already installed: ${existing.path}`);
      return {
        success: true,
        path: existing.path,
        size: existing.size,
        skipped: true,
        message: 'Model already installed',
      };
    }

    console.log(`[LocalAI] Installing model: ${modelName} from ${modelUrl}`);

    let lastLog = 0;
    const result = await driver.installModel({
      modelUrl,
      modelName,
      destination,
      onProgress: (percent) => {
        if(percent != lastLog){
            lastLog = percent;
            console.log(`[LocalAI] Download progress: ${percent}%`);
        }
      },
    });

    return result;
  },
});

/**
 * Unload Model - Free model from memory
 */
export const unloadModel = createAction({
  name: 'unload_model',
  displayName: 'Unload Model',
  description: 'Unload a model from memory to free resources.',
  props: {
    modelPath: Property.ShortText({
      displayName: 'Model Path',
      description: 'Path to the model to unload',
      required: true,
    }),
  },
  async run({ propsValue }) {
    const { modelPath } = propsValue;

    await driver.unloadModel(modelPath);

    return {
      success: true,
      message: `Model unloaded: ${modelPath}`,
    };
  },
});

/**
 * Get Model Info - Get information about a model without loading it
 */
export const getModelInfo = createAction({
  name: 'get_model_info',
  displayName: 'Get Model Info',
  description: 'Get information about a local model file.',
  props: {
    modelPath: Property.ShortText({
      displayName: 'Model Path',
      description: 'Path to the GGUF model file',
      required: true,
    }),
  },
  async run({ propsValue }) {
    const { modelPath } = propsValue;

    const info = await driver.getModelInfo(modelPath);

    if (!info) {
      throw new Error(`Model not found: ${modelPath}`);
    }

    return info;
  },
});

// ============================================================================
// Bit Definition
// ============================================================================

export const localAI = createBit({
  displayName: 'Local AI',
  description: 'Run AI models locally using llama.cpp. Supports GGUF models with GPU acceleration on macOS (Metal), Windows/Linux (CUDA, Vulkan).',
  logoUrl: 'lucide:Cpu',
  categories: [BitCategory.ARTIFICIAL_INTELLIGENCE],
  authors: ['Habits Team'],
  actions: [askAI, askAssistantAI, listModels, installModel, unloadModel, getModelInfo],
  triggers: [],
});

export default localAI;
