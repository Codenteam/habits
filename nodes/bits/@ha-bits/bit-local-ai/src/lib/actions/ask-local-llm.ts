/**
 * Ask Local LLM Action
 * 
 * Similar to OpenAI's ask_chatgpt - generates text responses using local LLM models.
 * Supports GGUF format models (Qwen2, Llama, Mistral, Phi, etc.)
 */

import { createAction, Property, StoreScope } from '@ha-bits/cortex-core';
import { localAiAuth, LocalAiAuthValue, TextGenModels, getModelPath, getModelsBasePath, DeviceType } from '../common/common';
import { TextGenConfig } from '../common/models';
import { getBackend } from '../stubs';

export const askLocalLlm = createAction({
  auth: localAiAuth,
  name: 'ask_local_llm',
  displayName: 'Ask Local LLM',
  description: 'Generate text responses using a local LLM model. Similar to ChatGPT but runs entirely on your machine.',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'The local LLM model to use for text generation.',
      defaultValue: 'qwen2-0.5b',
      options: {
        disabled: false,
        options: TextGenModels,
      },
    }),
    customModelPath: Property.ShortText({
      displayName: 'Custom Model Path',
      required: false,
      description: 'Path to custom GGUF model file (only used when Model is set to Custom)',
    }),
    customTokenizerPath: Property.ShortText({
      displayName: 'Custom Tokenizer Path',
      required: false,
      description: 'Path to tokenizer.json file (only used when Model is set to Custom)',
    }),
    prompt: Property.LongText({
      displayName: 'Question',
      required: true,
      description: 'The prompt or question to send to the LLM.',
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      required: false,
      description: 'Optional system prompt to set the behavior of the assistant.',
      defaultValue: 'You are a helpful assistant.',
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      description: 'Controls randomness (0 = deterministic, 1 = creative). Default is 0.7.',
      defaultValue: 0.7,
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      required: true,
      description: 'Maximum number of tokens to generate.',
      defaultValue: 512,
    }),
    seed: Property.Number({
      displayName: 'Seed',
      required: false,
      description: 'Random seed for reproducible outputs.',
    }),
    memoryKey: Property.ShortText({
      displayName: 'Memory Key',
      required: false,
      description: 'A key to maintain conversation history across runs. Leave empty for stateless operation.',
    }),
  },
  async run({ auth, propsValue, store }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    const backend = getBackend();
    
    // Get environment variables safely (browser-compatible)
    const env = typeof process !== 'undefined' ? process.env : {};
    
    // Get models base path (handles Tauri app data directory automatically)
    const resolvedBasePath = await getModelsBasePath(authValue);
    const device = authValue.device || (env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    // Determine model paths
    let modelPath: string;
    let tokenizerPath: string;
    
    if (propsValue.model === 'custom') {
      if (!propsValue.customModelPath || !propsValue.customTokenizerPath) {
        throw new Error('Custom model requires both model path and tokenizer path to be specified');
      }
      modelPath = propsValue.customModelPath;
      tokenizerPath = propsValue.customTokenizerPath;
    } else if (propsValue.model.includes('/') || propsValue.model.endsWith('.gguf')) {
      // Model is a full path (e.g., from list-models path field) - use it directly
      modelPath = propsValue.model;
      // Derive tokenizer path: look for tokenizer.json in same directory
      const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));
      const modelFileName = modelPath.substring(modelPath.lastIndexOf('/') + 1);
      
      // Check if this is a structured model path (has text-gen/ in path)
      if (modelPath.includes('/text-gen/')) {
        // Structured: models/text-gen/qwen2-0.5b/model.gguf -> models/text-gen/qwen2-0.5b/tokenizer.json
        tokenizerPath = `${modelDir}/tokenizer.json`;
      } else if (modelDir.endsWith('/models')) {
        // Legacy: models/qwen2.5-0.5b.gguf - try to find matching structured model
        const modelName = modelFileName.replace('.gguf', '').replace(/-instruct|-q[0-9]+_[0-9]+/g, '');
        // First try exact match in text-gen folder
        tokenizerPath = `${modelDir}/text-gen/${modelName}/tokenizer.json`;
        // Also try without extra suffixes (qwen2.5-0.5b -> qwen2-0.5b)
        const simplifiedName = modelName.replace(/\./g, '').replace(/([0-9]+)-([0-9]+)b/, '$1-$2b');
        const altTokenizerPath = `${modelDir}/text-gen/${simplifiedName}/tokenizer.json`;
        // Use qwen2-0.5b as fallback if no matching tokenizer found
        if (modelName.startsWith('qwen')) {
          tokenizerPath = `${modelDir}/text-gen/qwen2-0.5b/tokenizer.json`;
        }
        console.log(`[ask-local-llm] Legacy model detected: ${modelFileName}, using tokenizer: ${tokenizerPath}`);
      } else {
        // Unknown structure - try same directory
        tokenizerPath = `${modelDir}/tokenizer.json`;
      }
    } else {
      // Model is an ID (e.g., 'qwen2-0.5b') - construct paths from base path
      modelPath = getModelPath(resolvedBasePath, 'text-gen', propsValue.model, 'model.gguf');
      tokenizerPath = getModelPath(resolvedBasePath, 'text-gen', propsValue.model, 'tokenizer.json');
    }
    
    // Build the full prompt with system message and conversation history
    let fullPrompt = '';
    
    // Add system prompt
    if (propsValue.systemPrompt) {
      fullPrompt += `<|system|>\n${propsValue.systemPrompt}\n`;
    }
    
    // Handle memory/conversation history
    if (propsValue.memoryKey && store) {
      try {
        const history = await store.get<string[]>(propsValue.memoryKey, StoreScope.FLOW);
        if (history && Array.isArray(history)) {
          for (const entry of history) {
            fullPrompt += entry;
          }
        }
      } catch (e) {
        // No history yet, that's fine
      }
    }
    
    // Add current user prompt
    fullPrompt += `<|user|>\n${propsValue.prompt}\n<|assistant|>\n`;
    
    // Configure text generation
    const config: TextGenConfig = {
      modelPath,
      tokenizerPath,
      maxTokens: propsValue.maxTokens || 512,
      temperature: propsValue.temperature ?? 0.7,
      seed: propsValue.seed,
      device: device as DeviceType,
    };
    
    // Generate text with proper error handling
    let result;
    try {
      result = await backend.generateText(config, fullPrompt);
    } catch (error: any) {
      // Return error with debug info so users can see what went wrong
      const errorMsg = error?.message || String(error);
      throw new Error(
        `Text generation failed: ${errorMsg}\n` +
        `Model: ${modelPath}\n` +
        `Tokenizer: ${tokenizerPath}\n` +
        `Device: ${device}`
      );
    }
    
    // Store conversation history if memory key is set
    if (propsValue.memoryKey && store) {
      try {
        const history = await store.get<string[]>(propsValue.memoryKey, StoreScope.FLOW) || [];
        history.push(`<|user|>\n${propsValue.prompt}\n`);
        history.push(`<|assistant|>\n${result.text}\n`);
        await store.put(propsValue.memoryKey, history, StoreScope.FLOW);
      } catch (e) {
        // Failed to save history, not critical
        console.warn('Failed to save conversation history:', e);
      }
    }
    
    return {
      text: result.text,
      tokensGenerated: result.tokensGenerated,
      model: propsValue.model,
      finishReason: 'stop',
    };
  },
});
