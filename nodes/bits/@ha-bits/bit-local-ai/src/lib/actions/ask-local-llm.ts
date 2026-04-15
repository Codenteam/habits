/**
 * Ask Local LLM Action
 * 
 * Generate text responses using local LLM models.
 * Uses the driver for model resolution and backend communication.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: any;

import { createAction, Property, StoreScope } from '@ha-bits/cortex-core';
import { localAiAuth, LocalAiAuthValue, TextGenModels, DeviceType } from '../common/common';
import { generateText } from '../driver';

export const askLocalLlm = createAction({
  auth: localAiAuth,
  name: 'ask_local_llm',
  displayName: 'Ask Local LLM',
  description: 'Generate text responses using a local LLM model.',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'The local LLM model to use.',
      defaultValue: 'qwen2-0.5b',
      options: { disabled: false, options: TextGenModels },
    }),
    customModelPath: Property.ShortText({
      displayName: 'Custom Model Path',
      required: false,
      description: 'Path to GGUF model (only used when Model is Custom)',
    }),
    customTokenizerPath: Property.ShortText({
      displayName: 'Custom Tokenizer Path',
      required: false,
      description: 'Path to tokenizer.json (only used when Model is Custom)',
    }),
    prompt: Property.LongText({
      displayName: 'Question',
      required: true,
      description: 'The prompt or question to send to the LLM.',
    }),
    systemPrompt: Property.LongText({
      displayName: 'System Prompt',
      required: false,
      description: 'Optional system prompt.',
      defaultValue: 'You are a helpful assistant.',
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      description: 'Controls randomness (0-1). Default: 0.7',
      defaultValue: 0.7,
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      required: true,
      description: 'Maximum tokens to generate.',
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
      description: 'Key to maintain conversation history. Empty = stateless.',
    }),
  },
  async run({ auth, propsValue, store }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    const env = typeof process !== 'undefined' ? process.env : {};
    const device = authValue.device || (env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    // Build prompt with system message and history
    let fullPrompt = '';
    if (propsValue.systemPrompt) {
      fullPrompt += `<|system|>\n${propsValue.systemPrompt}\n`;
    }
    
    // Load conversation history
    if (propsValue.memoryKey && store) {
      try {
        const history = await store.get<string[]>(propsValue.memoryKey, StoreScope.FLOW);
        if (history?.length) fullPrompt += history.join('');
      } catch { /* No history yet */ }
    }
    
    fullPrompt += `<|user|>\n${propsValue.prompt}\n<|assistant|>\n`;
    
    // Generate text via driver
    const result = await generateText(propsValue.model, fullPrompt, {
      maxTokens: propsValue.maxTokens || 512,
      temperature: propsValue.temperature ?? 0.7,
      seed: propsValue.seed,
      device,
      customModelPath: propsValue.customModelPath,
      customTokenizerPath: propsValue.customTokenizerPath,
    });
    
    // Save conversation history
    if (propsValue.memoryKey && store) {
      try {
        const history = await store.get<string[]>(propsValue.memoryKey, StoreScope.FLOW) || [];
        history.push(`<|user|>\n${propsValue.prompt}\n`, `<|assistant|>\n${result.text}\n`);
        await store.put(propsValue.memoryKey, history, StoreScope.FLOW);
      } catch { /* Failed to save, not critical */ }
    }
    
    return {
      text: result.text,
      tokensGenerated: result.tokensGenerated,
      model: result.model,
      finishReason: 'stop',
    };
  },
});
