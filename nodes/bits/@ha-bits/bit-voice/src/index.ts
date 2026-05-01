/**
 * @ha-bits/bit-voice
 *
 * Always-listening voice trigger bit.
 * Continuously captures microphone audio, transcribes speech in real-time,
 * and triggers workflows when the user stops talking or says a specific phrase.
 */

import { createBit } from '@ha-bits/cortex-core';
import { voiceCommand } from './lib/triggers/voice-command';

export const bitVoice = createBit({
  displayName: 'Voice',
  description: 'Always-listening voice trigger. Captures speech via microphone and triggers workflows when you stop talking or say a specific phrase.',
  logoUrl: 'lucide:Mic',
  runtime: 'app',
  minimumSupportedRelease: '0.0.1',
  authors: [],
  actions: [],
  triggers: [voiceCommand],
});

export default bitVoice;