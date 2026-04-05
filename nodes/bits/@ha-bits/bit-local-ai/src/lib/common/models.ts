/**
 * Type definitions for local AI modules
 * 
 * These types mirror the interfaces from local-ai-rust/local-ai-node
 * and tauri-plugin-local-ai for compatibility
 */

import { DeviceType, WhisperTask } from './common';

// ============================================================================
// Text Generation Types
// ============================================================================

export interface TextGenConfig {
  /** Path to the GGUF model file */
  modelPath: string;
  /** Path to tokenizer.json */
  tokenizerPath: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0 = greedy) */
  temperature?: number;
  /** Random seed */
  seed?: number;
  /** Device to use */
  device?: DeviceType;
}

export interface TextGenResult {
  /** Generated text */
  text: string;
  /** Number of tokens generated */
  tokensGenerated: number;
}

// ============================================================================
// Image Captioning Types
// ============================================================================

export interface ImageCaptionConfig {
  /** Path to the model file */
  modelPath: string;
  /** Path to tokenizer.json */
  tokenizerPath: string;
  /** Random seed */
  seed?: number;
  /** Device to use */
  device?: DeviceType;
}

export interface ImageCaptionResult {
  /** Generated caption */
  caption: string;
  /** Number of tokens generated */
  tokensGenerated: number;
}

// ============================================================================
// Image Generation Types
// ============================================================================

export interface ImageGenConfig {
  /** Path to UNet weights (.safetensors) */
  unetPath: string;
  /** Path to VAE weights (.safetensors) */
  vaePath: string;
  /** Path to CLIP text encoder weights (.safetensors) */
  clipPath: string;
  /** Path to tokenizer.json */
  tokenizerPath: string;
  /** Image height (must be multiple of 8) */
  height?: number;
  /** Image width (must be multiple of 8) */
  width?: number;
  /** Number of diffusion steps */
  steps?: number;
  /** Guidance scale */
  guidanceScale?: number;
  /** Random seed */
  seed?: number;
  /** Device to use */
  device?: DeviceType;
}

export interface ImageGenResult {
  /** Path where image was saved */
  outputPath: string | null;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** Number of steps performed */
  steps: number;
}

// ============================================================================
// Transcription Types
// ============================================================================

export interface TranscribeConfig {
  /** Path to model weights (.safetensors or .gguf) */
  modelPath: string;
  /** Path to tokenizer.json */
  tokenizerPath: string;
  /** Path to config.json */
  configPath: string;
  /** Use quantized model */
  quantized?: boolean;
  /** Language for transcription */
  language?: string;
  /** Task: transcribe or translate */
  task?: WhisperTask;
  /** Show timestamps */
  timestamps?: boolean;
  /** Random seed */
  seed?: number;
  /** Device to use */
  device?: DeviceType;
}

export interface TranscriptionSegment {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Transcribed text */
  text: string;
}

export interface TranscriptionResult {
  /** Full transcribed text */
  text: string;
  /** Segments with timing */
  segments: TranscriptionSegment[];
  /** Language detected or specified */
  language: string | null;
}

// ============================================================================
// Text-to-Voice Types
// ============================================================================

export interface TextToVoiceConfig {
  /** Path to first stage model weights */
  firstStagePath: string;
  /** Path to first stage meta JSON */
  firstStageMetaPath: string;
  /** Path to second stage model weights */
  secondStagePath: string;
  /** Path to Encodec model weights */
  encodecPath: string;
  /** Path to speaker embedding file */
  spkEmbPath: string;
  /** Use quantized first stage model */
  quantized?: boolean;
  /** Guidance scale */
  guidanceScale?: number;
  /** Temperature for sampling */
  temperature?: number;
  /** Maximum tokens for first stage */
  maxTokens?: number;
  /** Random seed */
  seed?: number;
  /** Device to use */
  device?: DeviceType;
}

export interface TextToVoiceResult {
  /** Path where audio was saved */
  outputPath: string | null;
  /** Sample rate of output audio */
  sampleRate: number;
  /** Duration in seconds */
  durationSeconds: number;
}

// ============================================================================
// OpenAI-Compatible Types (for interface compatibility)
// ============================================================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'length' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ImageCreateRequest {
  prompt: string;
  n?: number;
  size?: string;
  response_format?: 'url' | 'b64_json';
}

export interface ImageCreateResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

export interface TranscriptionRequest {
  file: Buffer | string;
  model: string;
  language?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface TranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
}

export interface SpeechRequest {
  model: string;
  input: string;
  voice: string;
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
  speed?: number;
}
