/**
 * Node.js Stubs for bit-voice
 *
 * The voice trigger requires browser APIs (Web Speech API) and only works
 * in the Tauri app (WebView). In Node.js/server environments, these stubs
 * provide no-op implementations that log warnings.
 */

import type { VoiceCommandEvent } from '../common/common';

/**
 * Stub SpeechListener for Node.js environments.
 * Logs a warning that voice recognition is not available.
 */
export class SpeechListener {
  constructor(_config: any, _emitCallback: (event: VoiceCommandEvent) => void) {
    console.warn(
      '[Voice] SpeechListener is not available in Node.js. ' +
        'The voice trigger only works in the Tauri app (browser/WebView environment).'
    );
  }

  start(): void {
    // No-op in Node.js
  }

  stop(): void {
    // No-op in Node.js
  }

  abort(): void {
    // No-op in Node.js
  }

  updateConfig(_config: any): void {
    // No-op in Node.js
  }
}

/**
 * Stub init function for Node.js.
 */
export function initSpeechListener(
  _config: any,
  _emitCallback: (event: VoiceCommandEvent) => void
): SpeechListener {
  console.warn(
    '[Voice] Voice recognition is not available in Node.js. ' +
      'Deploy this habit to the Tauri app for voice trigger support.'
  );
  return new SpeechListener(_config, _emitCallback);
}

/**
 * Stub destroy function for Node.js.
 */
export function destroySpeechListener(): void {
  // No-op in Node.js
}

/**
 * Stub getter for Node.js.
 */
export function getSpeechListener(): SpeechListener | null {
  return null;
}