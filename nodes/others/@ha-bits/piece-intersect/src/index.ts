import {
  createCustomApiCallAction,
} from '@activepieces/pieces-common';
import { createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { askAssistant } from './lib/actions/ask-assistant';
import { generateImage } from './lib/actions/generate-image';
import { askOpenAI } from './lib/actions/send-prompt';
import { textToSpeech } from './lib/actions/text-to-speech';
import { transcribeAction } from './lib/actions/transcriptions';
import { translateAction } from './lib/actions/translation';
import { visionPrompt } from './lib/actions/vision-prompt';
import { getIntersectBaseUrl, intersectAuth, openaiAuth } from './lib/common/common';
import { extractStructuredDataAction } from './lib/actions/extract-structure-data.action';

import { createVideo } from './lib/actions/create-video';
import { textToVoice } from './lib/actions/text-to-voice';
import { createCanvas } from './lib/actions/create-canvas';

// Re-export auth for backwards compatibility
export { intersectAuth, openaiAuth };

export const intersect = createPiece({
  displayName: 'Intersect',
  description: 'Use Intersect AI tools including ChatGPT, Gemini, Claude for text generaiton, image generation, Website Generation, Document drafts generations, Vector designs and more.',
  minimumSupportedRelease: '0.63.0',
  logoUrl: 'https://codenteam.com/assets/logos/Icon-Round-Dark.png',
  categories: [PieceCategory.ARTIFICIAL_INTELLIGENCE],
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
      authMapping: async (auth) => {
        return {
          Authorization: `Bearer ${(auth as unknown as { apiKey: string }).apiKey}`,
        };
      },
    }) as any,
  ],
  authors: [
    'Codenteam'
  ],
  triggers: [],
});

// Keep for backwards compatibility
export const openai = intersect;
