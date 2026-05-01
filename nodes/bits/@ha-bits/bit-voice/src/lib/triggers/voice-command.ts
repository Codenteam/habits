/**
 * Voice Command Trigger
 *
 * STREAMING trigger that continuously listens to the microphone via the
 * browser's Web Speech API. Fires when the user stops talking (silence
 * detected) or when a specific wake word/phrase is spoken.
 *
 * Lifecycle: onEnable starts the mic stream → events are pushed via run()
 * as they arrive → onDisable stops the mic stream.
 */

import { createTrigger, Property } from '@ha-bits/cortex-core';
import { initSpeechListener, destroySpeechListener } from '../browser';
import {
  DEFAULT_SILENCE_TIMEOUT,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  VOICE_COMMAND_EVENT,
  TRIGGER_REASON,
  type VoiceCommandEvent,
} from '../common/common';

export const voiceCommand = createTrigger({
  name: 'voice_command',
  displayName: 'Voice Command',
  description:
    'Continuously listens to the microphone. Triggers when you stop talking (silence detected) or when a specific wake phrase is spoken. Uses the browser Web Speech API for real-time transcription.',
  type: 'STREAMING' as any,

  props: {
    silenceTimeout: Property.Number({
      displayName: 'Silence Timeout (ms)',
      description:
        'How long to wait after speech ends before triggering the workflow. Lower values trigger faster, higher values wait for longer pauses.',
      required: false,
      defaultValue: DEFAULT_SILENCE_TIMEOUT,
    }),

    wakeWords: Property.ShortText({
      displayName: 'Wake Words',
      description:
        'Comma-separated phrases that trigger immediately when spoken (e.g., "hey assistant, ok computer"). Leave empty to only trigger on silence.',
      required: false,
      defaultValue: '',
    }),

    language: Property.StaticDropdown({
      displayName: 'Language',
      description: 'Speech recognition language.',
      required: false,
      defaultValue: DEFAULT_LANGUAGE,
      options: {
        options: SUPPORTED_LANGUAGES,
      },
    }),

    continuous: Property.Checkbox({
      displayName: 'Continuous Listening',
      description:
        'When enabled, the trigger keeps listening after each command. When disabled, it stops after the first trigger.',
      required: false,
      defaultValue: true,
    }),
  },

  async onEnable(context) {
    const { silenceTimeout, wakeWords, language, continuous } = context.propsValue;
    const { executor, workflowId, nodeId } = context;

    initSpeechListener(
      {
        silenceTimeout: silenceTimeout || DEFAULT_SILENCE_TIMEOUT,
        wakeWords: wakeWords ? wakeWords.split(',').map((w: string) => w.trim()).filter(Boolean) : [],
        language: language || DEFAULT_LANGUAGE,
        continuous: continuous !== false,
      },
      async (voiceEvent: VoiceCommandEvent) => {
        if (executor && workflowId) {
          await executor.executeWorkflow(workflowId, {
            initialContext: {
              'habits.input': voiceEvent,
              __streamingTrigger: true,
              __streamingNodeId: nodeId,
            },
          });
        }
      }
    );
  },

  async onDisable(_context) {
    destroySpeechListener();
  },

  async run(context) {
    const payload = context.payload as VoiceCommandEvent | undefined;

    if (!payload) {
      return [];
    }

    return [
      {
        transcript: payload.transcript,
        isFinal: payload.isFinal,
        confidence: payload.confidence,
        triggerReason: payload.triggerReason,
        matchedWakeWord: payload.matchedWakeWord,
        durationMs: payload.durationMs,
        timestamp: payload.timestamp,
      },
    ];
  },

  async test(_context) {
    return [
      {
        transcript: 'This is a sample voice command for testing.',
        isFinal: true,
        confidence: 0.98,
        triggerReason: TRIGGER_REASON.SILENCE,
        matchedWakeWord: null,
        durationMs: 2500,
        timestamp: new Date().toISOString(),
      },
    ];
  },

  sampleData: {
    transcript: 'What is the weather today?',
    isFinal: true,
    confidence: 0.95,
    triggerReason: 'silence',
    matchedWakeWord: null,
    durationMs: 1800,
    timestamp: '2026-05-01T12:00:00.000Z',
  },
});