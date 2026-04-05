/**
 * @ha-bits/bit-openai
 * 
 * L1 bit for OpenAI AI services.
 * Implements the @ha-bits/bit-ai interface for OpenAI GPT models.
 * 
 * Level: L1 (Implements @ha-bits/bit-ai)
 */

import {
  createBit,
  createAction,
  createCustomApiCallAction,
  BitCategory,
  Property,
} from '@ha-bits/cortex-core';

// Re-export types from L0 bit-ai for interface compatibility
export type {
  ChatRole,
  ChatMessage,
  ModelInfo,
  ChatCompletionParams,
  ChatCompletionResult,
  AssistantParams,
  AssistantResult,
  ListModelsParams,
  ListModelsResult,
} from '@ha-bits/bit-ai';

import { askAssistant } from './lib/actions/ask-assistant';
import { generateImage } from './lib/actions/generate-image';
import { askOpenAI } from './lib/actions/send-prompt';
import { textToSpeech } from './lib/actions/text-to-speech';
import { transcribeAction } from './lib/actions/transcriptions';
import { translateAction } from './lib/actions/translation';
import { visionPrompt } from './lib/actions/vision-prompt';
import { baseUrl, openaiAuth, openaiAuthValue, notLLMs } from './lib/common/common';
import { extractStructuredDataAction } from './lib/actions/extract-structure-data.action';
import OpenAI from 'openai';

// Re-export auth for backwards compatibility
export { openaiAuth };

/**
 * List Available Models - Lists OpenAI models available to the account
 */
const listModels = createAction({
  auth: openaiAuth,
  name: 'list_models',
  displayName: 'List Models',
  description: 'List available OpenAI models for your account.',
  props: {
    includeAll: Property.Checkbox({
      displayName: 'Include All Models',
      description: 'Include non-chat models (TTS, Whisper, DALL-E, embeddings)',
      required: false,
      defaultValue: false,
    }),
  },
  async run({ auth, propsValue }) {
    const authValue = auth as unknown as openaiAuthValue;
    const openai = new OpenAI({
      apiKey: authValue.apiKey,
      dangerouslyAllowBrowser: true,
    });
    
    const response = await openai.models.list();
    
    let models = response.data;
    
    // Filter to chat models only if not including all
    if (!propsValue.includeAll) {
      models = models.filter(model => !notLLMs.includes(model.id));
    }
    
    // Map to ModelInfo format
    const modelInfos = models.map(model => ({
      id: model.id,
      name: model.id,
      provider: 'openai',
      supports: {
        chat: !notLLMs.includes(model.id),
        completion: true,
      },
    }));
    
    return {
      models: modelInfos,
      totalCount: modelInfos.length,
    };
  },
});

export const openai = createBit({
  displayName: 'OpenAI',
  description: 'OpenAI AI services including ChatGPT, GPT-4, Assistants, DALL-E, and more. Implements the @ha-bits/bit-ai interface.',
  minimumSupportedRelease: '0.63.0',
  logoUrl: 'lucide:Sparkles',
  categories: [BitCategory.ARTIFICIAL_INTELLIGENCE],
  auth: openaiAuth,
  actions: [
    askOpenAI,
    askAssistant,
    listModels,
    generateImage,
    visionPrompt,
    textToSpeech,
    transcribeAction,
    translateAction,
    extractStructuredDataAction,
    createCustomApiCallAction({
      auth: openaiAuth as any,
      baseUrl: (auth) => baseUrl,
      authMapping: async (auth) => ({
        headers: {
          Authorization: `Bearer ${(auth as unknown as { apiKey: string }).apiKey}`,
        },
      }),
    }) as any,
  ],
  authors: [
   'Codenteam'
  ],
  triggers: [],
});

// Default export
export default openai;
