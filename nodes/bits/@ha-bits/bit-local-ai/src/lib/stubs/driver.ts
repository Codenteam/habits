/**
 * Tauri Driver Stub
 * 
 * Communicates with tauri-plugin-local-ai for model listing and inference.
 * This module replaces lib/driver.ts in Tauri environments via package.json habits.stubs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const window: any;

import { DeviceType, WhisperTask } from '../common/common';

// ============================================================================
// Types (mirror driver.ts exports)
// ============================================================================

export { DeviceType, WhisperTask } from '../common/common';

export interface TextGenOptions {
  maxTokens?: number;
  temperature?: number;
  seed?: number;
  device?: DeviceType;
  customModelPath?: string;
  customTokenizerPath?: string;
}

export interface TextGenResult {
  text: string;
  tokensGenerated: number;
  model: string;
}

export interface CaptionOptions {
  seed?: number;
  device?: DeviceType;
  customModelPath?: string;
  customTokenizerPath?: string;
}

export interface CaptionResult {
  caption: string;
  tokensGenerated: number;
  model: string;
}

export interface ImageGenOptions {
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  seed?: number;
  device?: DeviceType;
  customBasePath?: string;
}

export interface ImageGenResult {
  base64: string;
  width: number;
  height: number;
  steps: number;
  model: string;
}

export interface TranscribeOptions {
  language?: string;
  task?: WhisperTask;
  timestamps?: boolean;
  quantized?: boolean;
  seed?: number;
  device?: DeviceType;
  customModelPath?: string;
  customTokenizerPath?: string;
  customConfigPath?: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscribeResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string | null;
  model: string;
}

export interface TTSOptions {
  guidanceScale?: number;
  temperature?: number;
  maxTokens?: number;
  seed?: number;
  quantized?: boolean;
  device?: DeviceType;
  customBasePath?: string;
}

export interface TTSResult {
  base64: string;
  sampleRate: number;
  durationSeconds: number;
  model: string;
}

export interface TextModel {
  id: string;
  name: string;
  path: string;
  size: number;
}

export interface ModelsInfo {
  textModels: TextModel[];
  captionModels: TextModel[];
  diffusionModels: TextModel[];
  whisperModels: TextModel[];
  ttsModels: TextModel[];
  modelsDir: string;
}

// ============================================================================
// Tauri Invoke Helper
// ============================================================================

function getInvoke(): <T>(cmd: string, args?: Record<string, unknown>) => Promise<T> {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    throw new Error('Tauri environment not available');
  }
  
  const tauri = window.__TAURI__;
  const rawInvoke = tauri.core?.invoke?.bind(tauri.core) || tauri.invoke?.bind(tauri);
  
  if (!rawInvoke) {
    throw new Error('Tauri invoke function not found');
  }
  
  return async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    try {
      return await rawInvoke(cmd, args) as T;
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : (e?.message || String(e));
      throw new Error(`Tauri: ${cmd} failed: ${msg}`);
    }
  };
}

// ============================================================================
// Model Listing
// ============================================================================

let _modelsCache: ModelsInfo | null = null;

/**
 * List available models from Tauri plugin
 */
export async function listModels(): Promise<ModelsInfo> {
  if (_modelsCache) return _modelsCache;
  
  const invoke = getInvoke();
  _modelsCache = await invoke<ModelsInfo>('plugin:local-ai|list_models');
  return _modelsCache;
}

/**
 * Clear the models cache
 */
export function clearModelsCache(): void {
  _modelsCache = null;
}

/**
 * Get the models base directory
 */
export async function getModelsDir(): Promise<string> {
  const models = await listModels();
  return models.modelsDir;
}

/**
 * Resolve text model ID to paths
 */
async function resolveTextModel(modelId: string): Promise<{ modelPath: string; tokenizerPath: string }> {
  const models = await listModels();
  const model = models.textModels.find(m => m.id === modelId || m.name === modelId);
  
  if (!model) {
    const available = models.textModels.map(m => m.id).join(', ');
    throw new Error(`Text model "${modelId}" not found. Available: ${available || 'none'}`);
  }
  
  const modelDir = model.path.substring(0, model.path.lastIndexOf('/'));
  return { modelPath: model.path, tokenizerPath: `${modelDir}/tokenizer.json` };
}

/**
 * Resolve caption model ID to paths
 */
async function resolveCaptionModel(modelId: string): Promise<{ modelPath: string; tokenizerPath: string }> {
  const models = await listModels();
  const model = models.captionModels.find(m => m.id === modelId || m.name === modelId);
  
  if (!model) {
    const available = models.captionModels.map(m => m.id).join(', ');
    throw new Error(`Caption model "${modelId}" not found. Available: ${available || 'none'}`);
  }
  
  const modelDir = model.path.substring(0, model.path.lastIndexOf('/'));
  return { modelPath: model.path, tokenizerPath: `${modelDir}/tokenizer.json` };
}

/**
 * Resolve diffusion model ID to base path
 */
async function resolveDiffusionModel(modelId: string): Promise<string> {
  const models = await listModels();
  const model = models.diffusionModels.find(m => m.id === modelId || m.name === modelId);
  
  if (!model) {
    const available = models.diffusionModels.map(m => m.id).join(', ');
    throw new Error(`Diffusion model "${modelId}" not found. Available: ${available || 'none'}`);
  }
  
  return model.path; // path is the base directory for diffusion models
}

/**
 * Resolve whisper model ID to paths
 */
async function resolveWhisperModel(modelId: string, quantized: boolean): Promise<{ modelPath: string; tokenizerPath: string; configPath: string }> {
  const models = await listModels();
  const model = models.whisperModels.find(m => m.id === modelId || m.name === modelId);
  
  if (!model) {
    const available = models.whisperModels.map(m => m.id).join(', ');
    throw new Error(`Whisper model "${modelId}" not found. Available: ${available || 'none'}`);
  }
  
  const modelDir = model.path.substring(0, model.path.lastIndexOf('/'));
  const ext = quantized ? '.gguf' : '.safetensors';
  return {
    modelPath: `${modelDir}/model${ext}`,
    tokenizerPath: `${modelDir}/tokenizer.json`,
    configPath: `${modelDir}/config.json`,
  };
}

/**
 * Resolve TTS model ID to base path
 */
async function resolveTTSModel(modelId: string): Promise<string> {
  const models = await listModels();
  const model = models.ttsModels.find(m => m.id === modelId || m.name === modelId);
  
  if (!model) {
    const available = models.ttsModels.map(m => m.id).join(', ');
    throw new Error(`TTS model "${modelId}" not found. Available: ${available || 'none'}`);
  }
  
  const modelDir = model.path.substring(0, model.path.lastIndexOf('/'));
  return modelDir;
}

// ============================================================================
// Text Generation
// ============================================================================

/**
 * Generate text using a model ID
 */
export async function generateText(
  modelId: string,
  prompt: string,
  options: TextGenOptions = {}
): Promise<TextGenResult> {
  const invoke = getInvoke();
  
  let modelPath: string;
  let tokenizerPath: string;
  
  if (modelId === 'custom') {
    if (!options.customModelPath || !options.customTokenizerPath) {
      throw new Error('Custom model requires customModelPath and customTokenizerPath');
    }
    modelPath = options.customModelPath;
    tokenizerPath = options.customTokenizerPath;
  } else if (modelId.includes('/') || modelId.endsWith('.gguf')) {
    modelPath = modelId;
    const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));
    tokenizerPath = `${modelDir}/tokenizer.json`;
  } else {
    const resolved = await resolveTextModel(modelId);
    modelPath = resolved.modelPath;
    tokenizerPath = resolved.tokenizerPath;
  }
  
  const result = await invoke<{ text: string; tokens_generated: number }>('plugin:local-ai|generate_text', {
    modelPath,
    tokenizerPath,
    prompt,
    maxTokens: options.maxTokens ?? 512,
    temperature: options.temperature ?? 0.7,
    seed: options.seed,
    device: options.device ?? 'auto',
  });
  
  return {
    text: result.text,
    tokensGenerated: result.tokens_generated,
    model: modelId,
  };
}

// ============================================================================
// Image Captioning
// ============================================================================

/**
 * Caption an image (base64 input)
 */
export async function captionImage(
  modelId: string,
  imageBase64: string,
  options: CaptionOptions = {}
): Promise<CaptionResult> {
  const invoke = getInvoke();
  
  let modelPath: string;
  let tokenizerPath: string;
  
  if (modelId === 'custom') {
    if (!options.customModelPath || !options.customTokenizerPath) {
      throw new Error('Custom model requires customModelPath and customTokenizerPath');
    }
    modelPath = options.customModelPath;
    tokenizerPath = options.customTokenizerPath;
  } else {
    const resolved = await resolveCaptionModel(modelId);
    modelPath = resolved.modelPath;
    tokenizerPath = resolved.tokenizerPath;
  }
  
  const result = await invoke<{ caption: string; tokens_generated: number }>('plugin:local-ai|caption_image_base64', {
    imageBase64,
    modelPath,
    tokenizerPath,
    device: options.device ?? 'auto',
  });
  
  return {
    caption: result.caption,
    tokensGenerated: result.tokens_generated,
    model: modelId,
  };
}

// ============================================================================
// Image Generation
// ============================================================================

/**
 * Generate an image (returns base64)
 */
export async function generateImage(
  modelId: string,
  prompt: string,
  negativePrompt: string,
  options: ImageGenOptions = {}
): Promise<ImageGenResult> {
  const invoke = getInvoke();
  
  let modelBasePath: string;
  if (modelId === 'custom') {
    if (!options.customBasePath) {
      throw new Error('Custom model requires customBasePath');
    }
    modelBasePath = options.customBasePath;
  } else {
    modelBasePath = await resolveDiffusionModel(modelId);
  }
  
  const result = await invoke<{ base64_data: string; width: number; height: number; steps: number }>('plugin:local-ai|generate_image_base64', {
    prompt,
    uncondPrompt: negativePrompt,
    unetPath: `${modelBasePath}/unet.safetensors`,
    vaePath: `${modelBasePath}/vae.safetensors`,
    clipPath: `${modelBasePath}/clip.safetensors`,
    tokenizerPath: `${modelBasePath}/tokenizer.json`,
    height: options.height ?? 512,
    width: options.width ?? 512,
    steps: options.steps ?? 30,
    guidanceScale: options.guidanceScale ?? 7.5,
    seed: options.seed,
    device: options.device ?? 'auto',
  });
  
  return {
    base64: result.base64_data,
    width: result.width,
    height: result.height,
    steps: result.steps,
    model: modelId,
  };
}

// ============================================================================
// Audio Transcription
// ============================================================================

/**
 * Transcribe audio (base64 input)
 */
export async function transcribeAudio(
  modelId: string,
  audioBase64: string,
  options: TranscribeOptions = {}
): Promise<TranscribeResult> {
  const invoke = getInvoke();
  
  let modelPath: string;
  let tokenizerPath: string;
  let configPath: string;
  
  if (modelId === 'custom') {
    if (!options.customModelPath || !options.customTokenizerPath || !options.customConfigPath) {
      throw new Error('Custom model requires customModelPath, customTokenizerPath, and customConfigPath');
    }
    modelPath = options.customModelPath;
    tokenizerPath = options.customTokenizerPath;
    configPath = options.customConfigPath;
  } else {
    const resolved = await resolveWhisperModel(modelId, options.quantized ?? false);
    modelPath = resolved.modelPath;
    tokenizerPath = resolved.tokenizerPath;
    configPath = resolved.configPath;
  }
  
  const result = await invoke<{ text: string; segments: TranscriptionSegment[]; language: string | null }>('plugin:local-ai|transcribe_audio_base64', {
    audioBase64,
    modelPath,
    tokenizerPath,
    configPath,
    quantized: options.quantized ?? false,
    language: options.language,
    task: options.task ?? 'transcribe',
    timestamps: options.timestamps ?? false,
    device: options.device ?? 'auto',
  });
  
  return {
    text: result.text,
    segments: result.segments || [],
    language: result.language,
    model: modelId,
  };
}

// ============================================================================
// Text-to-Speech
// ============================================================================

/**
 * Synthesize speech (returns base64 WAV)
 */
export async function synthesizeSpeech(
  modelId: string,
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const invoke = getInvoke();
  
  let modelBasePath: string;
  if (modelId === 'custom') {
    if (!options.customBasePath) {
      throw new Error('Custom model requires customBasePath');
    }
    modelBasePath = options.customBasePath;
  } else {
    modelBasePath = await resolveTTSModel(modelId);
  }
  
  const result = await invoke<{ base64_data: string; sample_rate: number; duration_seconds: number }>('plugin:local-ai|synthesize_speech_base64', {
    prompt: text,
    firstStagePath: options.quantized ? `${modelBasePath}/first_stage_q4k.gguf` : `${modelBasePath}/first_stage.safetensors`,
    firstStageMetaPath: `${modelBasePath}/first_stage.meta.json`,
    secondStagePath: `${modelBasePath}/second_stage.safetensors`,
    encodecPath: `${modelBasePath}/encodec.safetensors`,
    spkEmbPath: `${modelBasePath}/spk_emb.safetensors`,
    quantized: options.quantized ?? false,
    guidanceScale: options.guidanceScale ?? 3.0,
    temperature: options.temperature ?? 1.0,
    maxTokens: options.maxTokens ?? 2000,
    seed: options.seed,
    device: options.device ?? 'auto',
  });
  
  return {
    base64: result.base64_data,
    sampleRate: result.sample_rate,
    durationSeconds: result.duration_seconds,
    model: modelId,
  };
}
