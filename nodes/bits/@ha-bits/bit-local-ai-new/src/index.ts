/**
 * bit-local-ai-new
 *
 * Simplified local AI bit with model installation and text generation.
 */

import { createBit } from '@ha-bits/cortex-core';
import { installModelAction, generateTextAction } from './lib/actions';

export const bitLocalAiNew = createBit({
  displayName: 'Local AI (Simple)',
  description: 'Simple local AI with model installation and text generation',
  logoUrl: 'lucide:Brain',
  minimumSupportedRelease: '0.0.1',
  authors: [],
  actions: [installModelAction, generateTextAction],
  triggers: [],
});

export default bitLocalAiNew;

// Re-export types
export * from './lib/common/common';
