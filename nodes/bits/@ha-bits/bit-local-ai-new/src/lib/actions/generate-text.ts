/**
 * Generate Text Action
 *
 * Generate text from a prompt array using a local LLM.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { generateText, isSupported } from '@ha-bits/bit-local-ai-new/driver';
import { ChatMessage, ModelRegistry } from '../common/common';

// Build dropdown options from registry
const modelOptions = Object.entries(ModelRegistry).map(([id, entry]) => ({
  label: `${entry.label} (${entry.size})`,
  value: id,
}));

export const generateTextAction = createAction({
  name: 'generate-text',
  displayName: 'Generate Text',
  description: 'Generate text from a prompt array using a local LLM.',
  props: {
    prompts: Property.Json({
      displayName: 'Prompts',
      description: 'Array of chat messages: [{role: "system"|"user"|"assistant", content: "..."}]',
      required: true,
      defaultValue: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ],
    }),
    modelId: Property.StaticDropdown({
      displayName: 'Model',
      description: 'The model to use (must be installed first)',
      required: false,
      defaultValue: 'qwen2-0.5b',
      options: {
        disabled: false,
        options: modelOptions,
      },
    }),
    maxTokens: Property.Number({
      displayName: 'Max Tokens',
      description: 'Maximum number of tokens to generate',
      required: false,
      defaultValue: 256,
    }),
  },
  async run({ propsValue }) {
    const prompts = propsValue.prompts as ChatMessage[];
    const modelId = propsValue.modelId || 'qwen2-0.5b';
    const maxTokens = propsValue.maxTokens || 256;

    console.log('[generate-text] run() called, modelId:', modelId);

    console.log('[generate-text] checking isSupported...');
    const supported = await isSupported();
    console.log('[generate-text] isSupported result:', supported);
    if (!supported) {
      return { success: false, supported: false, message: 'Local AI is not supported on this platform' };
    }

    // Validate prompts
    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error('prompts must be a non-empty array of chat messages');
    }

    for (const msg of prompts) {
      if (!msg.role || !msg.content) {
        throw new Error('Each message must have "role" and "content" fields');
      }
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        throw new Error(`Invalid role: ${msg.role}. Must be "system", "user", or "assistant"`);
      }
    }

    console.log('[generate-text] calling generateText() with', prompts.length, 'messages, modelId:', modelId, 'maxTokens:', maxTokens);
    try {
      const result = await generateText(prompts, modelId, maxTokens);
      console.log('[generate-text] generateText() returned, tokens:', result.tokensGenerated);
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[generate-text] generateText() threw:', msg);
      throw e;
    }
  },
});
