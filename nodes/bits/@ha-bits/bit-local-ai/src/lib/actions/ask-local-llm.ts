/**
 * Ask Local LLM Action
 * 
 * Similar to OpenAI's ask_chatgpt - generates text responses using local LLM models.
 * Supports GGUF format models (Qwen2, Llama, Mistral, Phi, etc.)
 */

import { createAction, Property, StoreScope } from '@ha-bits/cortex-core';
import { localAiAuth, LocalAiAuthValue, TextGenModels, getModelPath, DeviceType } from '../common/common';
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
    
    // Use defaults if auth not configured
    const modelsBasePath = authValue.modelsBasePath || process.env.LOCAL_AI_MODELS_PATH || '~/.habits/models';
    const device = authValue.device || (process.env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    // Resolve home directory
    const resolvedBasePath = modelsBasePath.startsWith('~') 
      ? modelsBasePath.replace('~', process.env.HOME || '/tmp')
      : modelsBasePath;
    
    // Determine model paths
    let modelPath: string;
    let tokenizerPath: string;
    
    if (propsValue.model === 'custom') {
      if (!propsValue.customModelPath || !propsValue.customTokenizerPath) {
        throw new Error('Custom model requires both model path and tokenizer path to be specified');
      }
      modelPath = propsValue.customModelPath;
      tokenizerPath = propsValue.customTokenizerPath;
    } else {
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
    
    // Generate text
    const result = await backend.generateText(config, fullPrompt);
    
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
