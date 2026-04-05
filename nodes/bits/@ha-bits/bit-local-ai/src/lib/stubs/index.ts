/**
 * Local AI Backend Stub
 * 
 * This module provides the interface to the local AI backend.
 * It automatically detects and uses the appropriate backend:
 * - Tauri: Uses tauri-plugin-local-ai via invoke
 * - Node.js: Uses @local-ai/node native addon
 * 
 * The backend is stubbed to allow for easy testing and mock implementations.
 */

import {
  TextGenConfig,
  TextGenResult,
  ImageCaptionConfig,
  ImageCaptionResult,
  ImageGenConfig,
  ImageGenResult,
  TranscribeConfig,
  TranscriptionResult,
  TextToVoiceConfig,
  TextToVoiceResult,
} from '../common/models';
import { DeviceType } from '../common/common';

// Extend Window interface for Tauri
declare global {
  interface Window {
    __TAURI__?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
  }
}

// ============================================================================
// Backend Interface
// ============================================================================

export interface LocalAiBackend {
  // Text Generation
  generateText(config: TextGenConfig, prompt: string): Promise<TextGenResult>;
  
  // Image Captioning
  captionImage(config: ImageCaptionConfig, imagePath: string): Promise<ImageCaptionResult>;
  
  // Image Generation
  generateImage(config: ImageGenConfig, prompt: string, negativePrompt: string, outputPath: string): Promise<ImageGenResult>;
  
  // Audio Transcription
  transcribeAudio(config: TranscribeConfig, audioPath: string): Promise<TranscriptionResult>;
  
  // Text to Voice
  synthesizeSpeech(config: TextToVoiceConfig, text: string, outputPath: string): Promise<TextToVoiceResult>;
  
  // Utilities
  getVersion(): string;
  hasMetalSupport(): boolean;
  hasCudaSupport(): boolean;
}

// ============================================================================
// Tauri Backend (uses tauri-plugin-local-ai)
// ============================================================================

class TauriBackend implements LocalAiBackend {
  private invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  
  constructor() {
    if (typeof window !== 'undefined' && window.__TAURI__) {
      this.invoke = window.__TAURI__.invoke;
    } else {
      throw new Error('Tauri environment not detected');
    }
  }
  
  async generateText(config: TextGenConfig, prompt: string): Promise<TextGenResult> {
    return this.invoke('plugin:local-ai|generate_text', {
      modelPath: config.modelPath,
      tokenizerPath: config.tokenizerPath,
      prompt,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      seed: config.seed,
      device: config.device,
    });
  }
  
  async captionImage(config: ImageCaptionConfig, imagePath: string): Promise<ImageCaptionResult> {
    return this.invoke('plugin:local-ai|caption_image', {
      modelPath: config.modelPath,
      tokenizerPath: config.tokenizerPath,
      imagePath,
      device: config.device,
    });
  }
  
  async generateImage(
    config: ImageGenConfig,
    prompt: string,
    negativePrompt: string,
    outputPath: string
  ): Promise<ImageGenResult> {
    return this.invoke('plugin:local-ai|generate_image', {
      prompt,
      uncondPrompt: negativePrompt,
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
  
  async transcribeAudio(config: TranscribeConfig, audioPath: string): Promise<TranscriptionResult> {
    return this.invoke('plugin:local-ai|transcribe_audio', {
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
  
  async synthesizeSpeech(
    config: TextToVoiceConfig,
    text: string,
    outputPath: string
  ): Promise<TextToVoiceResult> {
    return this.invoke('plugin:local-ai|synthesize_speech', {
      prompt: text,
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
  
  getVersion(): string {
    // Sync call not supported in Tauri invoke, return placeholder
    return 'tauri-plugin-local-ai';
  }
  
  hasMetalSupport(): boolean {
    // Check at runtime via invoke if needed
    return typeof window !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
  }
  
  hasCudaSupport(): boolean {
    // Check at runtime via invoke if needed
    return false; // Would need async check
  }
}

// ============================================================================
// Node.js Backend (uses @local-ai/node)
// ============================================================================

// Known paths where the native addon might be found
const NATIVE_ADDON_PATHS = [
  '@local-ai/node', // npm installed
  // Workspace development paths
  process.env.LOCAL_AI_NODE_PATH,
  // Check relative to habits workspace
  require.resolve ? (() => {
    try {
      // Try to find it in the workspace
      const path = require('path');
      const fs = require('fs');
      const workspacePaths = [
        path.join(process.cwd(), 'local-ai-rust/local-ai-node'),
        path.join(process.cwd(), '../local-ai-rust/local-ai-node')
      ];
      for (const p of workspacePaths) {
        if (fs.existsSync(path.join(p, 'index.js'))) {
          return p;
        }
      }
      return null;
    } catch {
      return null;
    }
  })() : null,
].filter(Boolean) as string[];

class NodeBackend implements LocalAiBackend {
  private native: any;
  
  constructor() {
    let loadError: Error | null = null;
    
    for (const modulePath of NATIVE_ADDON_PATHS) {
      try {
        // Dynamic import to avoid bundling issues
        this.native = require(modulePath);
        console.log(`[bit-local-ai] Loaded native addon from: ${modulePath}`);
        return;
      } catch (e) {
        loadError = e as Error;
        // Continue to next path
      }
    }
    
    throw new Error(`@local-ai/node native addon not available. Tried paths: ${NATIVE_ADDON_PATHS.join(', ')}. Last error: ${loadError?.message}`);
  }
  
  async generateText(config: TextGenConfig, prompt: string): Promise<TextGenResult> {
    return this.native.generateText(
      config.modelPath,
      config.tokenizerPath,
      prompt,
      config.maxTokens,
      config.temperature,
      config.seed,
      config.device
    );
  }
  
  async captionImage(config: ImageCaptionConfig, imagePath: string): Promise<ImageCaptionResult> {
    return this.native.captionImage(
      config.modelPath,
      config.tokenizerPath,
      imagePath,
      config.device
    );
  }
  
  async generateImage(
    config: ImageGenConfig,
    prompt: string,
    negativePrompt: string,
    outputPath: string
  ): Promise<ImageGenResult> {
    return this.native.generateImage(
      prompt,
      negativePrompt,
      config.unetPath,
      config.vaePath,
      config.clipPath,
      config.tokenizerPath,
      outputPath,
      config.height,
      config.width,
      config.steps,
      config.guidanceScale,
      config.seed,
      config.device
    );
  }
  
  async transcribeAudio(config: TranscribeConfig, audioPath: string): Promise<TranscriptionResult> {
    return this.native.transcribeAudio(
      audioPath,
      config.modelPath,
      config.tokenizerPath,
      config.configPath,
      config.quantized,
      config.language,
      config.task,
      config.timestamps,
      config.device
    );
  }
  
  async synthesizeSpeech(
    config: TextToVoiceConfig,
    text: string,
    outputPath: string
  ): Promise<TextToVoiceResult> {
    return this.native.synthesizeSpeech(
      text,
      config.firstStagePath,
      config.firstStageMetaPath,
      config.secondStagePath,
      config.encodecPath,
      config.spkEmbPath,
      config.quantized,
      outputPath,
      config.guidanceScale,
      config.temperature,
      config.maxTokens,
      config.seed,
      config.device
    );
  }
  
  getVersion(): string {
    return this.native.version();
  }
  
  hasMetalSupport(): boolean {
    return this.native.hasMetalSupport();
  }
  
  hasCudaSupport(): boolean {
    return this.native.hasCudaSupport();
  }
}

// ============================================================================
// Mock Backend (for testing)
// ============================================================================

class MockBackend implements LocalAiBackend {
  async generateText(_config: TextGenConfig, prompt: string): Promise<TextGenResult> {
    return {
      text: `[Mock response to: "${prompt.substring(0, 50)}..."]`,
      tokensGenerated: 10,
    };
  }
  
  async captionImage(_config: ImageCaptionConfig, imagePath: string): Promise<ImageCaptionResult> {
    return {
      caption: `[Mock caption for image: ${imagePath}]`,
      tokensGenerated: 8,
    };
  }
  
  async generateImage(
    _config: ImageGenConfig,
    _prompt: string,
    _negativePrompt: string,
    outputPath: string
  ): Promise<ImageGenResult> {
    return {
      outputPath,
      width: 512,
      height: 512,
      steps: 30,
    };
  }
  
  async transcribeAudio(_config: TranscribeConfig, _audioPath: string): Promise<TranscriptionResult> {
    return {
      text: '[Mock transcription]',
      segments: [],
      language: 'en',
    };
  }
  
  async synthesizeSpeech(
    _config: TextToVoiceConfig,
    _text: string,
    outputPath: string
  ): Promise<TextToVoiceResult> {
    return {
      outputPath,
      sampleRate: 24000,
      durationSeconds: 2.5,
    };
  }
  
  getVersion(): string {
    return 'mock-0.1.0';
  }
  
  hasMetalSupport(): boolean {
    return false;
  }
  
  hasCudaSupport(): boolean {
    return false;
  }
}

// ============================================================================
// Backend Factory
// ============================================================================

let _backend: LocalAiBackend | null = null;
let _gpuCapabilitiesLogged = false;

/**
 * GPU capabilities info
 */
export interface GpuCapabilities {
  hasMetal: boolean;
  hasCuda: boolean;
  bestDevice: DeviceType;
  platform: string;
}

/**
 * Get GPU capabilities from the current backend
 */
export function getGpuCapabilities(): GpuCapabilities {
  const backend = getBackend();
  const hasMetal = backend.hasMetalSupport();
  const hasCuda = backend.hasCudaSupport();
  
  let bestDevice: DeviceType;
  if (hasMetal) {
    bestDevice = DeviceType.Metal;
  } else if (hasCuda) {
    bestDevice = DeviceType.Cuda;
  } else {
    bestDevice = DeviceType.Cpu;
  }
  
  return {
    hasMetal,
    hasCuda,
    bestDevice,
    platform: typeof process !== 'undefined' ? process.platform : 'browser',
  };
}

/**
 * Get the best available device type
 * This should be used when DeviceType.Auto is specified
 */
export function getBestDevice(): DeviceType {
  return getGpuCapabilities().bestDevice;
}

/**
 * Log GPU capabilities (only once)
 */
function logGpuCapabilities(backend: LocalAiBackend): void {
  if (_gpuCapabilitiesLogged) return;
  _gpuCapabilitiesLogged = true;
  
  const hasMetal = backend.hasMetalSupport();
  const hasCuda = backend.hasCudaSupport();
  
  console.log('[bit-local-ai] GPU Detection:');
  if (hasMetal) {
    console.log('   ✅ Metal (Apple GPU) - ENABLED');
  } else if (typeof process !== 'undefined' && process.platform === 'darwin') {
    console.log('   ⚠️  Metal - NOT AVAILABLE (rebuild with: npm run build:metal)');
  }
  
  if (hasCuda) {
    console.log('   ✅ CUDA (NVIDIA GPU) - ENABLED');
  } else if (typeof process !== 'undefined' && (process.platform === 'linux' || process.platform === 'win32')) {
    console.log('   ℹ️  CUDA - not enabled');
  }
  
  if (!hasMetal && !hasCuda) {
    console.log('   💻 Using CPU (no GPU acceleration)');
    if (typeof process !== 'undefined' && process.platform === 'darwin') {
      console.log('   💡 Tip: Rebuild with Metal for 10-20x faster image generation');
      console.log('      cd local-ai-rust/local-ai-node && npm run build:metal');
    }
  } else {
    const gpu = hasMetal ? 'Metal' : 'CUDA';
    console.log(`   🚀 Using ${gpu} for hardware acceleration`);
  }
}

/**
 * Detect and return the appropriate backend
 */
export function getBackend(): LocalAiBackend {
  if (_backend) {
    return _backend;
  }
  
  // Try Tauri first (browser/desktop app)
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    try {
      _backend = new TauriBackend();
      logGpuCapabilities(_backend);
      return _backend;
    } catch (e) {
      console.warn('Tauri backend initialization failed:', e);
    }
  }
  
  // Try Node.js native addon
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      _backend = new NodeBackend();
      logGpuCapabilities(_backend);
      return _backend;
    } catch (e) {
      console.warn('Node.js backend initialization failed:', e);
    }
  }
  
  // Fall back to mock for testing
  console.warn('No local AI backend available, using mock implementation');
  _backend = new MockBackend();
  return _backend;
}

/**
 * Set a custom backend (useful for testing)
 */
export function setBackend(backend: LocalAiBackend): void {
  _backend = backend;
}

/**
 * Reset the backend (useful for testing)
 */
export function resetBackend(): void {
  _backend = null;
  _gpuCapabilitiesLogged = false;
}
