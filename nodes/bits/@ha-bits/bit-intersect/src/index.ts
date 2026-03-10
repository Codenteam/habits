/**
 * @ha-bits/bit-intersect
 * 
 * Intersect AI integration bit module for the Habits workflow system.
 * This module imports from @ha-bits/cortex.
 */

import {
  createBit,
  createCustomApiCallAction,
  BitCategory,
} from '@ha-bits/cortex';

import { askAssistant } from './lib/actions/ask-assistant';
import { generateImage } from './lib/actions/generate-image';
import { askOpenAI } from './lib/actions/send-prompt';
import { textToSpeech } from './lib/actions/text-to-speech';
import { transcribeAction } from './lib/actions/transcriptions';
import { translateAction } from './lib/actions/translation';
import { visionPrompt } from './lib/actions/vision-prompt';``
import { getIntersectBaseUrl, intersectAuth, openaiAuth } from './lib/common/common';
import { extractStructuredDataAction } from './lib/actions/extract-structure-data.action';

import { createVideo } from './lib/actions/create-video';
import { textToVoice } from './lib/actions/text-to-voice';
import { createCanvas } from './lib/actions/create-canvas';

// Re-export auth for backwards compatibility
export { intersectAuth, openaiAuth };

export const intersect = createBit({
  displayName: 'Intersect',
  description: 'Use Intersect AI tools including ChatGPT, Gemini, Claude for text generaiton, image generation, Website Generation, Document drafts generations, Vector designs and more.',
  minimumSupportedRelease: '0.63.0',
  logoUrl: 'lucide:Sparkles',
  categories: [],
  auth: intersectAuth,
  actions: [
    askOpenAI,
    askAssistant,
    generateImage,
    visionPrompt,
    textToSpeech,
    transcribeAction,
    translateAction,
    extractStructuredDataAction,
    createVideo,
    textToVoice,
    createCanvas,
    createCustomApiCallAction({
      auth: intersectAuth as any,
      baseUrl: (auth) => getIntersectBaseUrl((auth as unknown as { host: string }).host),
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

// Keep for backwards compatibility
export const openai = intersect;

// Default export
export default intersect;
