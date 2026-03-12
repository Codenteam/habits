/**
 * @ha-bits/bit-openai
 * 
 * openai AI integration bit module for the Habits workflow system.
 * This module imports from @ha-bits/cortex.
 */

import {
  createBit,
  createCustomApiCallAction,
  BitCategory,
} from '@ha-bits/cortex-core';

import { askAssistant } from './lib/actions/ask-assistant';
import { generateImage } from './lib/actions/generate-image';
import { askOpenAI } from './lib/actions/send-prompt';
import { textToSpeech } from './lib/actions/text-to-speech';
import { transcribeAction } from './lib/actions/transcriptions';
import { translateAction } from './lib/actions/translation';
import { visionPrompt } from './lib/actions/vision-prompt';
import { baseUrl, openaiAuth } from './lib/common/common';
import { extractStructuredDataAction } from './lib/actions/extract-structure-data.action';


// Re-export auth for backwards compatibility
export { openaiAuth };

export const openai = createBit({
  displayName: 'openai',
  description: 'Use openai AI tools including ChatGPT, image generation, and canvas features.',
  minimumSupportedRelease: '0.63.0',
  logoUrl: 'lucide:Sparkles',
  categories: [BitCategory.ARTIFICIAL_INTELLIGENCE],
  auth: openaiAuth,
  actions: [
    askOpenAI,
    askAssistant,
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
