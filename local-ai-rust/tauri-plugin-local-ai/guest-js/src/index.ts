/**
 * Tauri v2 Plugin for Local AI inference
 * 
 * This plugin provides local AI capabilities including:
 * - Text generation (Qwen2)
 * - Image captioning (BLIP)
 * - Image generation (Stable Diffusion)
 * - Audio transcription (Whisper)
 * - Text-to-voice (MetaVoice)
 */

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Types
// ============================================================================

export type InstanceId = string;

export enum DeviceType {
  Auto = 'auto',
  Cpu = 'cpu',
  Metal = 'metal',
  Cuda = 'cuda',
}

export enum WhisperTask {
  Transcribe = 'transcribe',
  Translate = 'translate',
}

// ============================================================================
// Text Generation
// ============================================================================

export interface TextGenConfig {
  modelPath: string;
  tokenizerPath: string;
  maxTokens?: number;
  temperature?: number;
  seed?: number;
  device?: DeviceType;
}

export interface TextGenResult {
  text: string;
  tokens_generated: number;
}

/**
 * Generate text using a one-off call
 */
export async function generateText(
  modelPath: string,
  tokenizerPath: string,
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    seed?: number;
    device?: DeviceType;
  }
): Promise<TextGenResult> {
  return invoke('plugin:local-ai|generate_text', {
    modelPath,
    tokenizerPath,
    prompt,
    maxTokens: options?.maxTokens,
    temperature: options?.temperature,
    seed: options?.seed,
    device: options?.device,
  });
}

/**
 * Text generator for reuse across multiple prompts
 */
export class TextGenerator {
  private instanceId: InstanceId | null = null;

  private constructor() {}

  static async create(config: TextGenConfig): Promise<TextGenerator> {
    const generator = new TextGenerator();
    generator.instanceId = await invoke('plugin:local-ai|create_text_generator', { config });
    return generator;
  }

  async generate(prompt: string): Promise<TextGenResult> {
    if (!this.instanceId) {
      throw new Error('TextGenerator not initialized');
    }
    return invoke('plugin:local-ai|text_generator_generate', {
      id: this.instanceId,
      prompt,
    });
  }
}

// ============================================================================
// Image Captioning
// ============================================================================

export interface ImageCaptionConfig {
  modelPath: string;
  tokenizerPath: string;
  seed?: number;
  device?: DeviceType;
}

export interface ImageCaptionResult {
  caption: string;
  tokens_generated: number;
}

/**
 * Caption an image using a one-off call
 */
export async function captionImage(
  modelPath: string,
  tokenizerPath: string,
  imagePath: string,
  device?: DeviceType
): Promise<ImageCaptionResult> {
  return invoke('plugin:local-ai|caption_image', {
    modelPath,
    tokenizerPath,
    imagePath,
    device,
  });
}

/**
 * Image captioner for reuse across multiple images
 */
export class ImageCaptioner {
  private instanceId: InstanceId | null = null;

  private constructor() {}

  static async create(config: ImageCaptionConfig): Promise<ImageCaptioner> {
    const captioner = new ImageCaptioner();
    captioner.instanceId = await invoke('plugin:local-ai|create_image_captioner', { config });
    return captioner;
  }

  async caption(imagePath: string): Promise<ImageCaptionResult> {
    if (!this.instanceId) {
      throw new Error('ImageCaptioner not initialized');
    }
    return invoke('plugin:local-ai|image_captioner_caption', {
      id: this.instanceId,
      imagePath,
    });
  }
}

// ============================================================================
// Image Generation
// ============================================================================

export interface ImageGenConfig {
  unetPath: string;
  vaePath: string;
  clipPath: string;
  tokenizerPath: string;
  height?: number;
  width?: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  device?: DeviceType;
}

export interface ImageGenResult {
  output_path: string | null;
  width: number;
  height: number;
  steps: number;
}

/**
 * Generate an image using a one-off call
 */
export async function generateImage(
  prompt: string,
  outputPath: string,
  config: {
    unetPath: string;
    vaePath: string;
    clipPath: string;
    tokenizerPath: string;
    uncondPrompt?: string;
    height?: number;
    width?: number;
    steps?: number;
    guidanceScale?: number;
    seed?: number;
    device?: DeviceType;
  }
): Promise<ImageGenResult> {
  return invoke('plugin:local-ai|generate_image', {
    prompt,
    uncondPrompt: config.uncondPrompt,
    unetPath: config.unetPath,
    vaePath: config.vaePath,
    clipPath: config.clipPath,
    tokenizerPath: config.tokenizerPath,
    outputPath,
    height: config.height,
    width: config.width,
    steps: config.steps,
    guidanceScale: config.guidanceScale,
    seed: config.seed,
    device: config.device,
  });
}

/**
 * Image generator for reuse
 */
export class ImageGenerator {
  private instanceId: InstanceId | null = null;

  private constructor() {}

  static async create(config: ImageGenConfig): Promise<ImageGenerator> {
    const generator = new ImageGenerator();
    generator.instanceId = await invoke('plugin:local-ai|create_image_generator', { config });
    return generator;
  }

  async generate(
    prompt: string,
    outputPath: string,
    uncondPrompt?: string
  ): Promise<ImageGenResult> {
    if (!this.instanceId) {
      throw new Error('ImageGenerator not initialized');
    }
    return invoke('plugin:local-ai|image_generator_generate', {
      id: this.instanceId,
      prompt,
      uncondPrompt,
      outputPath,
    });
  }
}

// ============================================================================
// Audio Transcription (Whisper)
// ============================================================================

export interface TranscribeConfig {
  modelPath: string;
  tokenizerPath: string;
  configPath: string;
  quantized?: boolean;
  language?: string;
  task?: WhisperTask;
  timestamps?: boolean;
  seed?: number;
  device?: DeviceType;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string | null;
}

/**
 * Transcribe audio using a one-off call
 */
export async function transcribeAudio(
  audioPath: string,
  config: {
    modelPath: string;
    tokenizerPath: string;
    configPath: string;
    quantized?: boolean;
    language?: string;
    task?: WhisperTask;
    timestamps?: boolean;
    device?: DeviceType;
  }
): Promise<TranscriptionResult> {
  return invoke('plugin:local-ai|transcribe_audio', {
    audioPath,
    modelPath: config.modelPath,
    tokenizerPath: config.tokenizerPath,
    configPath: config.configPath,
    quantized: config.quantized,
    language: config.language,
    task: config.task,
    timestamps: config.timestamps,
    device: config.device,
  });
}

/**
 * Audio transcriber for reuse
 */
export class Transcriber {
  private instanceId: InstanceId | null = null;

  private constructor() {}

  static async create(config: TranscribeConfig): Promise<Transcriber> {
    const transcriber = new Transcriber();
    transcriber.instanceId = await invoke('plugin:local-ai|create_transcriber', { config });
    return transcriber;
  }

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    if (!this.instanceId) {
      throw new Error('Transcriber not initialized');
    }
    return invoke('plugin:local-ai|transcriber_transcribe', {
      id: this.instanceId,
      audioPath,
    });
  }
}

// ============================================================================
// Text to Voice (MetaVoice)
// ============================================================================

export interface TextToVoiceConfig {
  firstStagePath: string;
  firstStageMetaPath: string;
  secondStagePath: string;
  encodecPath: string;
  spkEmbPath: string;
  quantized?: boolean;
  guidanceScale?: number;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
  device?: DeviceType;
}

export interface TextToVoiceResult {
  output_path: string | null;
  sample_rate: number;
  duration_seconds: number;
}

/**
 * Synthesize speech using a one-off call
 */
export async function synthesizeSpeech(
  prompt: string,
  outputPath: string,
  config: {
    firstStagePath: string;
    firstStageMetaPath: string;
    secondStagePath: string;
    encodecPath: string;
    spkEmbPath: string;
    quantized?: boolean;
    guidanceScale?: number;
    temperature?: number;
    maxTokens?: number;
    seed?: number;
    device?: DeviceType;
  }
): Promise<TextToVoiceResult> {
  return invoke('plugin:local-ai|synthesize_speech', {
    prompt,
    firstStagePath: config.firstStagePath,
    firstStageMetaPath: config.firstStageMetaPath,
    secondStagePath: config.secondStagePath,
    encodecPath: config.encodecPath,
    spkEmbPath: config.spkEmbPath,
    quantized: config.quantized,
    outputPath,
    guidanceScale: config.guidanceScale,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    seed: config.seed,
    device: config.device,
  });
}

/**
 * Voice synthesizer for reuse
 */
export class VoiceSynthesizer {
  private instanceId: InstanceId | null = null;

  private constructor() {}

  static async create(config: TextToVoiceConfig): Promise<VoiceSynthesizer> {
    const synthesizer = new VoiceSynthesizer();
    synthesizer.instanceId = await invoke('plugin:local-ai|create_voice_synthesizer', { config });
    return synthesizer;
  }

  async synthesize(prompt: string, outputPath: string): Promise<TextToVoiceResult> {
    if (!this.instanceId) {
      throw new Error('VoiceSynthesizer not initialized');
    }
    return invoke('plugin:local-ai|voice_synthesizer_synthesize', {
      id: this.instanceId,
      prompt,
      outputPath,
    });
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get the version of the local-ai plugin
 */
export async function getVersion(): Promise<string> {
  return invoke('plugin:local-ai|get_version');
}

/**
 * Check if Metal (macOS GPU) support is available
 */
export async function hasMetalSupport(): Promise<boolean> {
  return invoke('plugin:local-ai|has_metal_support');
}

/**
 * Check if CUDA (NVIDIA GPU) support is available
 */
export async function hasCudaSupport(): Promise<boolean> {
  return invoke('plugin:local-ai|has_cuda_support');
}
