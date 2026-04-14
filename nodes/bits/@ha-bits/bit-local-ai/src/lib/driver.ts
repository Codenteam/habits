/**
 * Local AI Driver (Node.js)
 * 
 * Communicates with @local-ai/node native addon for model listing and inference.
 * In Tauri environments, this module is replaced by stubs/driver.ts via package.json habits.stubs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
declare const process: any;
declare const require: (id: string) => any;
declare const console: { log: (...args: any[]) => void; warn: (...args: any[]) => void };

import { DeviceType, WhisperTask } from './common/common';

// ============================================================================
// Types
// ============================================================================

export { DeviceType, WhisperTask } from './common/common';

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
// Node.js Native Addon
// ============================================================================

let _nodeAddon: any = null;

function getNodeAddon(): any {
  if (_nodeAddon) return _nodeAddon;
  
  const paths = [
    '@local-ai/node',
    process.env?.LOCAL_AI_NODE_PATH,
  ].filter(Boolean);
  
  for (const modulePath of paths) {
    try {
      _nodeAddon = require(modulePath as string);
      console.log(`[driver] Loaded @local-ai/node from: ${modulePath}`);
      return _nodeAddon;
    } catch {
      // Continue trying
    }
  }
  
  throw new Error(
    '@local-ai/node native addon not available. ' +
    'Install it with: npm install @local-ai/node'
  );
}

function toNativeDevice(device?: DeviceType): string | undefined {
  if (!device) return undefined;
  const map: Record<DeviceType, string> = {
    [DeviceType.Auto]: 'Auto',
    [DeviceType.Cpu]: 'Cpu',
    [DeviceType.Metal]: 'Metal',
    [DeviceType.Cuda]: 'Cuda',
  };
  return map[device] || undefined;
}

// ============================================================================
// Model Resolution
// ============================================================================

let _modelsCache: ModelsInfo | null = null;

function getModelsBasePath(): string {
  const homeDir = process.env?.HOME || '/tmp';
  return process.env?.LOCAL_AI_MODELS_PATH || `${homeDir}/.habits/models`;
}

function scanModelDir(basePath: string, category: string): TextModel[] {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(basePath, category);
  const models: TextModel[] = [];
  
  if (!fs.existsSync(dir)) return models;
  
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      // Look for model.gguf or model.safetensors
      for (const modelFile of ['model.gguf', 'model.safetensors']) {
        const modelPath = path.join(entryPath, modelFile);
        if (fs.existsSync(modelPath)) {
          const stats = fs.statSync(modelPath);
          models.push({ id: entry, name: entry, path: modelPath, size: stats.size });
          break;
        }
      }
    }
  }
  return models;
}

/**
 * List available models
 */
export async function listModels(): Promise<ModelsInfo> {
  if (_modelsCache) return _modelsCache;
  
  const basePath = getModelsBasePath();
  
  _modelsCache = {
    textModels: scanModelDir(basePath, 'text-gen'),
    captionModels: scanModelDir(basePath, 'caption'),
    diffusionModels: scanModelDir(basePath, 'diffusion'),
    whisperModels: scanModelDir(basePath, 'whisper'),
    ttsModels: scanModelDir(basePath, 'tts'),
    modelsDir: basePath,
  };
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
  return getModelsBasePath();
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
  const native = getNodeAddon();
  const basePath = getModelsBasePath();
  
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
    modelPath = `${basePath}/text-gen/${modelId}/model.gguf`;
    tokenizerPath = `${basePath}/text-gen/${modelId}/tokenizer.json`;
  }
  
  const result = await native.generateText(
    modelPath,
    tokenizerPath,
    prompt,
    options.maxTokens ?? 512,
    options.temperature ?? 0.7,
    options.seed,
    toNativeDevice(options.device)
  );
  
  return {
    text: result.text,
    tokensGenerated: result.tokensGenerated || result.tokens_generated,
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
  const native = getNodeAddon();
  const basePath = getModelsBasePath();
  
  let modelPath: string;
  let tokenizerPath: string;
  
  if (modelId === 'custom') {
    if (!options.customModelPath || !options.customTokenizerPath) {
      throw new Error('Custom model requires customModelPath and customTokenizerPath');
    }
    modelPath = options.customModelPath;
    tokenizerPath = options.customTokenizerPath;
  } else {
    modelPath = `${basePath}/caption/${modelId}/model.gguf`;
    tokenizerPath = `${basePath}/caption/${modelId}/tokenizer.json`;
  }
  
  const result = await native.captionImageBase64(
    imageBase64,
    modelPath,
    tokenizerPath,
    toNativeDevice(options.device)
  );
  
  return {
    caption: result.caption,
    tokensGenerated: result.tokensGenerated || result.tokens_generated,
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
  const native = getNodeAddon();
  const basePath = getModelsBasePath();
  
  let modelBasePath: string;
  if (modelId === 'custom') {
    if (!options.customBasePath) {
      throw new Error('Custom model requires customBasePath');
    }
    modelBasePath = options.customBasePath;
  } else {
    modelBasePath = `${basePath}/diffusion/${modelId}`;
  }
  
  const result = await native.generateImageBase64(
    prompt,
    negativePrompt,
    `${modelBasePath}/unet.safetensors`,
    `${modelBasePath}/vae.safetensors`,
    `${modelBasePath}/clip.safetensors`,
    `${modelBasePath}/tokenizer.json`,
    options.height ?? 512,
    options.width ?? 512,
    options.steps ?? 30,
    options.guidanceScale ?? 7.5,
    options.seed,
    toNativeDevice(options.device)
  );
  
  return {
    base64: result.base64,
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
  const native = getNodeAddon();
  const basePath = getModelsBasePath();
  
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
    const ext = options.quantized ? '.gguf' : '.safetensors';
    modelPath = `${basePath}/whisper/${modelId}/model${ext}`;
    tokenizerPath = `${basePath}/whisper/${modelId}/tokenizer.json`;
    configPath = `${basePath}/whisper/${modelId}/config.json`;
  }
  
  const result = await native.transcribeAudioBase64(
    audioBase64,
    modelPath,
    tokenizerPath,
    configPath,
    options.quantized ?? false,
    options.language,
    options.task ?? WhisperTask.Transcribe,
    options.timestamps ?? false,
    toNativeDevice(options.device)
  );
  
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
  const native = getNodeAddon();
  const basePath = getModelsBasePath();
  
  let modelBasePath: string;
  if (modelId === 'custom') {
    if (!options.customBasePath) {
      throw new Error('Custom model requires customBasePath');
    }
    modelBasePath = options.customBasePath;
  } else {
    modelBasePath = `${basePath}/tts/${modelId}`;
  }
  
  const result = await native.synthesizeSpeechBase64(
    text,
    `${modelBasePath}/first_stage.safetensors`,
    `${modelBasePath}/first_stage_meta.json`,
    `${modelBasePath}/second_stage.safetensors`,
    `${modelBasePath}/encodec.safetensors`,
    `${modelBasePath}/spk_emb.safetensors`,
    options.quantized ?? false,
    options.guidanceScale ?? 3.0,
    options.temperature ?? 1.0,
    options.maxTokens ?? 2000,
    options.seed,
    toNativeDevice(options.device)
  );
  
  return {
    base64: result.base64,
    sampleRate: result.sampleRate || result.sample_rate,
    durationSeconds: result.durationSeconds || result.duration_seconds,
    model: modelId,
  };
}
