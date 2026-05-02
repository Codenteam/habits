/**
 * Browser Speech Listener
 *
 * Wraps the Web Speech API (SpeechRecognition) for continuous voice capture.
 * Runs in the browser/WebView context. Manages speech detection, silence
 * tracking, wake word matching, and event emission.
 *
 * This module is designed to be loaded in the Tauri webview and communicates
 * with the bit-voice trigger via the app's event bus.
 */

import {
  DEFAULT_SILENCE_TIMEOUT,
  DEFAULT_LANGUAGE,
  VOICE_COMMAND_EVENT,
  TRIGGER_REASON,
  type VoiceCommandEvent,
} from '../common/common';

/** Configuration for the speech listener */
export interface SpeechListenerConfig {
  silenceTimeout: number;
  wakeWords: string[];
  language: string;
  continuous: boolean;
}

/** Global speech listener instance (singleton per webview) */
let globalListener: SpeechListener | null = null;

/**
 * SpeechListener manages the lifecycle of the Web Speech API.
 * It handles starting/stopping recognition, tracking speech segments,
 * detecting silence, matching wake words, and emitting events.
 */
export class SpeechListener {
  private recognition: any; // SpeechRecognition instance
  private config: SpeechListenerConfig;
  private isListening: boolean = false;
  private speechStartTime: number = 0;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private fullTranscript: string = '';
  private interimTranscript: string = '';
  private hasSpeech: boolean = false;
  private emitCallback: (event: VoiceCommandEvent) => void;

  constructor(
    config: SpeechListenerConfig,
    emitCallback: (event: VoiceCommandEvent) => void
  ) {
    this.config = config;
    this.emitCallback = emitCallback;
    this.recognition = this.createRecognition();
  }

  /**
   * Create a SpeechRecognition instance with the configured settings.
   * Handles both standard and webkit-prefixed APIs.
   */
  private createRecognition(): any {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      throw new Error(
        'SpeechRecognition API is not available in this browser. ' +
          'Voice trigger requires a browser with Web Speech API support (Chrome, Edge, Safari).'
      );
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = this.config.language || DEFAULT_LANGUAGE;

    // ---- Event Handlers ----
    debugger;
    recognition.onstart = () => {
      this.isListening = true;
      console.log('[Voice] Speech recognition started');
    };

    recognition.onend = () => {
      this.isListening = false;
      console.log('[Voice] Speech recognition ended');

      // Auto-restart if continuous mode is enabled
      if (this.config.continuous && this.recognition) {
        setTimeout(() => {
          if (!this.isListening) {
            this.start();
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice] Speech recognition error:', event.error, event.message);

      // Don't restart on 'aborted' (intentional stop) or 'no-speech' (normal silence)
      if (
        event.error === 'aborted' ||
        event.error === 'no-speech'
      ) {
        return;
      }

      // Auto-restart on transient errors if continuous
      if (this.config.continuous) {
        setTimeout(() => {
          if (!this.isListening) {
            this.start();
          }
        }, 500);
      }
    };

    recognition.onspeechstart = () => {
      console.log('[Voice] Speech started');
      this.speechStartTime = Date.now();
      this.hasSpeech = true;

      // Clear any pending silence timer
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
    };

    recognition.onspeechend = () => {
      console.log('[Voice] Speech ended');
      // Start silence timer — if no more speech comes in within
      // silenceTimeout, emit the captured transcript
      this.startSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      console.log('[Voice] Recognition result received, results count:', event.results.length);
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += text + ' ';
        } else {
          interimTranscript += text;
        }
      }

      if (finalTranscript) {
        this.fullTranscript += finalTranscript;
      }
      this.interimTranscript = interimTranscript;

      // Check for wake words in the latest results
      const latestText = (finalTranscript + interimTranscript).toLowerCase().trim();
      if (latestText && this.config.wakeWords.length > 0) {
        const matchedWord = this.config.wakeWords.find((word) =>
          latestText.includes(word.toLowerCase())
        );
        if (matchedWord) {
          // Wake word detected — emit immediately
          this.emitCommand(TRIGGER_REASON.WAKE_WORD, matchedWord);
          this.resetTranscript();
          return;
        }
      }
    };

    return recognition;
  }

  /**
   * Start listening to the microphone.
   */
  start(): void {
    if (this.isListening) return;

    try {
      this.recognition.start();
    } catch (error: any) {
      // SpeechRecognition may throw if already started
      console.warn('[Voice] Could not start recognition:', error.message);
    }
  }

  /**
   * Stop listening and clean up.
   */
  stop(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    try {
      this.recognition.stop();
    } catch (_error) {
      // Ignore errors when stopping
    }

    this.isListening = false;
  }

  /**
   * Abort recognition immediately (no onend event).
   */
  abort(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    try {
      this.recognition.abort();
    } catch (_error) {
      // Ignore errors when aborting
    }

    this.isListening = false;
  }

  /**
   * Update configuration without restarting.
   */
  updateConfig(config: Partial<SpeechListenerConfig>): void {
    if (config.silenceTimeout !== undefined) {
      this.config.silenceTimeout = config.silenceTimeout;
    }
    if (config.wakeWords !== undefined) {
      this.config.wakeWords = config.wakeWords;
    }
    if (config.language !== undefined) {
      this.config.language = config.language;
      this.recognition.lang = config.language;
    }
    if (config.continuous !== undefined) {
      this.config.continuous = config.continuous;
    }
  }

  /**
   * Start the silence timer. When it expires, emit the captured transcript.
   */
  private startSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }

    this.silenceTimer = setTimeout(() => {
      if (this.hasSpeech && this.fullTranscript.trim()) {
        this.emitCommand(TRIGGER_REASON.SILENCE, null);
        this.resetTranscript();
      }
      this.silenceTimer = null;
    }, this.config.silenceTimeout);
  }

  /**
   * Emit a voice command event.
   */
  private emitCommand(
    reason: typeof TRIGGER_REASON[keyof typeof TRIGGER_REASON],
    matchedWakeWord: string | null
  ): void {
    const transcript = (this.fullTranscript + this.interimTranscript).trim();
    if (!transcript) return;

    const event: VoiceCommandEvent = {
      transcript,
      isFinal: true,
      confidence: 0.9, // Web Speech API doesn't expose per-utterance confidence easily
      triggerReason: reason,
      matchedWakeWord,
      durationMs: Date.now() - this.speechStartTime,
      timestamp: new Date().toISOString(),
    };

    this.emitCallback(event);
  }

  /**
   * Reset the accumulated transcript.
   */
  private resetTranscript(): void {
    this.fullTranscript = '';
    this.interimTranscript = '';
    this.hasSpeech = false;
    this.speechStartTime = 0;
  }
}

/**
 * Initialize the global speech listener singleton.
 * Should be called once when the app starts or when the first voice trigger is enabled.
 */
export function initSpeechListener(
  config: SpeechListenerConfig,
  emitCallback: (event: VoiceCommandEvent) => void
): SpeechListener {
  if (globalListener) {
    globalListener.updateConfig(config);
    return globalListener;
  }

  globalListener = new SpeechListener(config, emitCallback);
  globalListener.start();
  return globalListener;
}

/**
 * Stop and destroy the global speech listener.
 */
export function destroySpeechListener(): void {
  if (globalListener) {
    globalListener.stop();
    globalListener = null;
  }
}

/**
 * Get the current speech listener instance (may be null).
 */
export function getSpeechListener(): SpeechListener | null {
  return globalListener;
}