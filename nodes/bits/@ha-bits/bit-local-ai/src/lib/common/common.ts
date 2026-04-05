/**
 * Common utilities for bit-local-ai
 * 
 * This module provides shared utilities, authentication, and constants
 * for the local AI bit module.
 */

import { BitAuth, Property } from '@ha-bits/cortex-core';

/**
 * Device type for inference
 */
export enum DeviceType {
  Cpu = 'Cpu',
  Metal = 'Metal',
  Cuda = 'Cuda',
  Auto = 'Auto'
}

/**
 * Whisper task type
 */
export enum WhisperTask {
  Transcribe = 'Transcribe',
  Translate = 'Translate'
}

/**
 * Type for local AI authentication/configuration
 */
export interface LocalAiAuthValue {
  /** Base path where models are stored */
  modelsBasePath: string;
  /** Device to use for inference */
  device: DeviceType;
  /** Optional API endpoint for remote inference */
  apiEndpoint?: string;
}

/**
 * Local AI authentication configuration
 */
export const localAiAuth = BitAuth.CustomAuth({
  description: 'Configure Local AI models path and device',
  required: true,
  props: {
    modelsBasePath: BitAuth.SecretText({
      displayName: 'Models Base Path',
      description: 'Base path where your AI models are stored (e.g., /path/to/models)',
      required: true,
    }),
    device: Property.StaticDropdown({
      displayName: 'Device',
      description: 'Hardware device to use for inference',
      required: true,
      defaultValue: 'Auto',
      options: {
        disabled: false,
        options: [
          { label: 'Auto (Best Available)', value: 'Auto' },
          { label: 'CPU', value: 'Cpu' },
          { label: 'Metal (macOS GPU)', value: 'Metal' },
          { label: 'CUDA (NVIDIA GPU)', value: 'Cuda' },
        ],
      },
    }) as any,
    apiEndpoint: Property.ShortText({
      displayName: 'API Endpoint (Optional)',
      description: 'Optional API endpoint for remote local-ai server',
      required: false,
    }) as any,
  },
  validate: async ({ auth }) => {
    const { modelsBasePath } = auth as LocalAiAuthValue;
    if (!modelsBasePath || modelsBasePath.trim() === '') {
      return {
        valid: false,
        error: 'Models base path is required',
      };
    }
    return { valid: true };
  },
});

/**
 * Available languages for transcription
 */
export const Languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ru', label: 'Russian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'th', label: 'Thai' },
  { value: 'id', label: 'Indonesian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'cs', label: 'Czech' },
  { value: 'ro', label: 'Romanian' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'el', label: 'Greek' },
  { value: 'he', label: 'Hebrew' },
];

/**
 * Text generation model presets
 */
export const TextGenModels = [
  { value: 'qwen2-0.5b', label: 'Qwen2 0.5B (Fast)' },
  { value: 'qwen2-1.5b', label: 'Qwen2 1.5B (Balanced)' },
  { value: 'qwen2-7b', label: 'Qwen2 7B (Quality)' },
  { value: 'llama-7b', label: 'Llama 7B' },
  { value: 'llama-13b', label: 'Llama 13B' },
  { value: 'mistral-7b', label: 'Mistral 7B' },
  { value: 'phi-2', label: 'Phi-2 (2.7B)' },
  { value: 'custom', label: 'Custom Model Path' },
];

/**
 * Whisper model sizes
 */
export const WhisperModels = [
  { value: 'tiny', label: 'Tiny (39M)' },
  { value: 'base', label: 'Base (74M)' },
  { value: 'small', label: 'Small (244M)' },
  { value: 'medium', label: 'Medium (769M)' },
  { value: 'large', label: 'Large (1.5B)' },
  { value: 'large-v2', label: 'Large V2 (1.5B)' },
  { value: 'large-v3', label: 'Large V3 (1.5B)' },
];

/**
 * Stable Diffusion model presets
 */
export const StableDiffusionModels = [
  { value: 'sd-1.5', label: 'Stable Diffusion 1.5' },
  { value: 'sd-2.1', label: 'Stable Diffusion 2.1' },
  { value: 'sdxl-base', label: 'SDXL Base' },
  { value: 'sdxl-turbo', label: 'SDXL Turbo (Fast)' },
  { value: 'custom', label: 'Custom Model Path' },
];

/**
 * Image resolutions
 */
export const ImageResolutions = [
  { value: '256x256', label: '256x256' },
  { value: '512x512', label: '512x512' },
  { value: '768x768', label: '768x768' },
  { value: '1024x1024', label: '1024x1024' },
  { value: '1024x768', label: '1024x768 (Landscape)' },
  { value: '768x1024', label: '768x1024 (Portrait)' },
];

/**
 * TTS voice presets
 */
export const VoicePresets = [
  { value: 'default', label: 'Default Voice' },
  { value: 'male-1', label: 'Male Voice 1' },
  { value: 'male-2', label: 'Male Voice 2' },
  { value: 'female-1', label: 'Female Voice 1' },
  { value: 'female-2', label: 'Female Voice 2' },
];

/**
 * Audio output formats
 */
export const AudioFormats = [
  { value: 'wav', label: 'WAV' },
  { value: 'mp3', label: 'MP3' },
  { value: 'flac', label: 'FLAC' },
  { value: 'ogg', label: 'OGG' },
];

/**
 * Helper to construct model paths from base path
 */
export function getModelPath(basePath: string, modelName: string, ...subPaths: string[]): string {
  const parts = [basePath, modelName, ...subPaths].filter(Boolean);
  return parts.join('/').replace(/\/+/g, '/');
}

/**
 * Parse resolution string to width/height
 */
export function parseResolution(resolution: string): { width: number; height: number } {
  const [width, height] = resolution.split('x').map(Number);
  return { width: width || 512, height: height || 512 };
}
