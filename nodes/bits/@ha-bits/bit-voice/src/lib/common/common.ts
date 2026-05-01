/**
 * Shared constants and types for bit-voice
 */

/** Default silence timeout in milliseconds before triggering */
export const DEFAULT_SILENCE_TIMEOUT = 1500;

/** Default speech recognition language */
export const DEFAULT_LANGUAGE = 'en-US';

/** Supported languages for speech recognition */
export const SUPPORTED_LANGUAGES = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'English (UK)', value: 'en-GB' },
  { label: 'Spanish', value: 'es-ES' },
  { label: 'French', value: 'fr-FR' },
  { label: 'German', value: 'de-DE' },
  { label: 'Italian', value: 'it-IT' },
  { label: 'Japanese', value: 'ja-JP' },
  { label: 'Korean', value: 'ko-KR' },
  { label: 'Portuguese', value: 'pt-BR' },
  { label: 'Chinese (Simplified)', value: 'zh-CN' },
  { label: 'Arabic', value: 'ar-SA' },
  { label: 'Russian', value: 'ru-RU' },
];

/** Event name emitted when voice command is captured */
export const VOICE_COMMAND_EVENT = 'voice:command';

/** Trigger reason constants */
export const TRIGGER_REASON = {
  SILENCE: 'silence',
  WAKE_WORD: 'wake_word',
} as const;

/** Shape of a voice command event */
export interface VoiceCommandEvent {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  triggerReason: typeof TRIGGER_REASON[keyof typeof TRIGGER_REASON];
  matchedWakeWord: string | null;
  durationMs: number;
  timestamp: string;
}