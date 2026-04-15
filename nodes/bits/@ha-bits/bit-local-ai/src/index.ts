/**
 * @ha-bits/bit-local-ai
 * 
 * L1 bit for Local AI inference services.
 * Provides OpenAI-compatible interface for local AI models running on your machine.
 * 
 * Features:
 * - Text Generation (ChatGPT-like): Using GGUF LLM models (Qwen2, Llama, Mistral, etc.)
 * - Image Generation (DALL-E-like): Using Stable Diffusion models
 * - Audio Transcription (Whisper-like): Using Whisper models
 * - Text-to-Speech (TTS-like): Using MetaVoice models
 * - Image Captioning (Vision-like): Using BLIP models
 * 
 * Backend Support:
 * - Node.js: Uses @local-ai/node native addon
 * - Tauri: Uses tauri-plugin-local-ai
 * 
 * Level: L1 (Implements @ha-bits/bit-ai)
 */

import {
  createBit,
  createAction,
  BitCategory,
  Property,
} from '@ha-bits/cortex-core';

// Import actions
import { askLocalLlm } from './lib/actions/ask-local-llm';
import { generateImage } from './lib/actions/generate-image';
import { transcribeAudio } from './lib/actions/transcribe-audio';
import { textToSpeech } from './lib/actions/text-to-speech';
import { captionImage } from './lib/actions/caption-image';
import { visionPrompt } from './lib/actions/vision-prompt';
import { extractStructuredData } from './lib/actions/extract-structured-data';
import { installModel } from './lib/actions/install-model';

// Import common utilities
import { localAiAuth, LocalAiAuthValue, DeviceType, WhisperTask, getModelPath, parseResolution } from './lib/common/common';
import { getBackend, setBackend, resetBackend, LocalAiBackend } from './lib/stubs';

// Re-export types for interface compatibility
export type {
  LocalAiBackend,
} from './lib/stubs';

export type {
  LocalAiAuthValue,
} from './lib/common/common';

export type {
  TextGenConfig,
  TextGenResult,
  ImageCaptionConfig,
  ImageCaptionResult,
  ImageGenConfig,
  ImageGenResult,
  TranscribeConfig,
  TranscriptionResult,
  TranscriptionSegment,
  TextToVoiceConfig,
  TextToVoiceResult,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from './lib/common/models';

// Re-export utilities
export { 
  localAiAuth, 
  DeviceType, 
  WhisperTask,
  getModelPath,
  parseResolution,
} from './lib/common/common';

export { getBackend, setBackend, resetBackend };

// Re-export actions
export { 
  askLocalLlm, 
  generateImage, 
  transcribeAudio, 
  textToSpeech, 
  captionImage,
  visionPrompt,
  extractStructuredData,
  installModel,
};

/**
 * List Available Models - Lists locally available AI models
 */
const listModels = createAction({
  auth: localAiAuth,
  name: 'list_models',
  displayName: 'List Models',
  description: 'List locally available AI models.',
  props: {
    category: Property.StaticDropdown({
      displayName: 'Category',
      description: 'Filter by model category',
      required: false,
      options: {
        disabled: false,
        options: [
          { value: '', label: 'All Categories' },
          { value: 'text-gen', label: 'Text Generation (LLM)' },
          { value: 'image-gen', label: 'Image Generation (Stable Diffusion)' },
          { value: 'whisper', label: 'Audio Transcription (Whisper)' },
          { value: 'tts', label: 'Text-to-Speech' },
          { value: 'caption', label: 'Image Captioning (BLIP)' },
          { value: 'vision', label: 'Vision Models' },
        ],
      },
    }),
  },
  async run({ auth, propsValue }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    
    // Check if running in Tauri environment - use native plugin
    const tauri = typeof window !== 'undefined' ? (window as any).__TAURI__ : null;
    if (tauri && tauri.core && tauri.core.invoke) {
      console.log('[bit-local-ai] Using Tauri local-ai plugin for list_models');
      try {
        const result = await tauri.core.invoke('plugin:local-ai|list_models');
        console.log('[bit-local-ai] local-ai plugin returned:', result);
        
        // Transform result to match expected format
        const models: Array<{
          id: string;
          name: string;
          category: string;
          path: string;
          size: number;
        }> = [];
        
        // Add text models
        if (result.textModels) {
          for (const m of result.textModels) {
            models.push({
              id: m.id,
              name: m.name,
              category: 'text-gen',
              path: m.path || '',
              size: m.size || 0,
            });
          }
        }
        
        // Add diffusion models
        if (result.diffusionModels) {
          for (const m of result.diffusionModels) {
            models.push({
              id: m.id,
              name: m.name,
              category: 'diffusion',
              path: m.path || '',
              size: m.size || 0,
            });
          }
        }
        
        // Add caption models
        if (result.captionModels) {
          for (const m of result.captionModels) {
            models.push({
              id: m.id,
              name: m.name,
              category: 'caption',
              path: m.path || '',
              size: m.size || 0,
            });
          }
        }
        
        // Add whisper models
        if (result.whisperModels) {
          for (const m of result.whisperModels) {
            models.push({
              id: m.id,
              name: m.name,
              category: 'whisper',
              path: m.path || '',
              size: m.size || 0,
            });
          }
        }
        
        // Add tts models
        if (result.ttsModels) {
          for (const m of result.ttsModels) {
            models.push({
              id: m.id,
              name: m.name,
              category: 'tts',
              path: m.path || '',
              size: m.size || 0,
            });
          }
        }
        
        return {
          models,
          totalCount: models.length,
          basePath: result.modelsDir || '',
        };
      } catch (e) {
        console.error('[bit-local-ai] local-ai plugin error:', e);
        // Fall through to filesystem approach
      }
    }
    
    // Node.js / server-side approach using fs
    const fs = await import('fs');
    const path = await import('path');
    
    // Use defaults if auth not configured
    const modelsBasePath = authValue.modelsBasePath || process.env.LOCAL_AI_MODELS_PATH || '~/.habits/models';
    
    const models: Array<{
      id: string;
      name: string;
      category: string;
      path: string;
      size: number;
    }> = [];
    
    // Check if category is a valid value (not an unresolved template expression)
    const isValidCategory = propsValue.category && 
      !propsValue.category.includes('{{') &&
      !propsValue.category.startsWith('habits.');
    
    const categories = isValidCategory
      ? [propsValue.category] 
      : ['text-gen', 'image-gen', 'whisper', 'tts', 'caption', 'vision', 'diffusion'];
    
    // Resolve home directory
    const resolvedBasePath = modelsBasePath.startsWith('~') 
      ? modelsBasePath.replace('~', process.env.HOME || '/tmp')
      : modelsBasePath;
    
    // Helper to get file/directory size
    const getSize = (filePath: string): number => {
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) return stat.size;
        // For directories, sum up all files
        let total = 0;
        const entries = fs.readdirSync(filePath, { withFileTypes: true });
        for (const entry of entries) {
          total += getSize(path.join(filePath, entry.name));
        }
        return total;
      } catch {
        return 0;
      }
    };
    
    // First, scan for GGUF files directly in the base path (text-gen models)
    try {
      if (fs.existsSync(resolvedBasePath)) {
        const baseEntries = fs.readdirSync(resolvedBasePath, { withFileTypes: true });
        
        for (const entry of baseEntries) {
          const fullPath = path.join(resolvedBasePath, entry.name);
          
          if (entry.isFile() && entry.name.toLowerCase().endsWith('.gguf')) {
            // GGUF files are text-gen models
            const size = getSize(fullPath);
            if (size > 0) {
              const modelName = entry.name.replace(/\.gguf$/i, '');
              models.push({
                id: modelName,
                name: modelName,
                category: 'text-gen',
                path: fullPath,
                size,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Could not scan base path ${resolvedBasePath}:`, e);
    }
    
    // Then scan category subdirectories
    for (const category of categories) {
      const categoryPath = path.join(resolvedBasePath, category);
      
      try {
        if (fs.existsSync(categoryPath)) {
          const entries = fs.readdirSync(categoryPath, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(categoryPath, entry.name);
            const size = getSize(fullPath);
            
            // Skip empty directories
            if (size === 0) continue;
            
            if (entry.isDirectory()) {
              models.push({
                id: `${category}/${entry.name}`,
                name: entry.name,
                category,
                path: fullPath,
                size,
              });
            } else if (entry.isFile() && (entry.name.endsWith('.gguf') || entry.name.endsWith('.bin') || entry.name.endsWith('.safetensors'))) {
              // Also include model files directly in category folders
              const modelName = entry.name.replace(/\.(gguf|bin|safetensors)$/i, '');
              models.push({
                id: `${category}/${modelName}`,
                name: modelName,
                category,
                path: fullPath,
                size,
              });
            }
          }
        }
      } catch (e) {
        // Category directory doesn't exist or isn't accessible
        console.warn(`Could not read models from ${categoryPath}:`, e);
      }
    }
    
    return {
      models,
      totalCount: models.length,
      basePath: modelsBasePath,
    };
  },
});

/**
 * Get System Info - Returns information about the local AI environment
 */
const getSystemInfo = createAction({
  auth: localAiAuth,
  name: 'get_system_info',
  displayName: 'Get System Info',
  description: 'Get information about the local AI environment (device support, version, etc.).',
  props: {},
  async run({ auth }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    const backend = getBackend();
    
    // Use defaults if auth not configured
    const modelsBasePath = authValue.modelsBasePath || process.env.LOCAL_AI_MODELS_PATH || '~/.habits/models';
    const device = authValue.device || (process.env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    return {
      version: backend.getVersion(),
      metalSupport: backend.hasMetalSupport(),
      cudaSupport: backend.hasCudaSupport(),
      configuredDevice: device,
      modelsBasePath: modelsBasePath,
    };
  },
});

/**
 * The Local AI bit definition
 */
export const localAi = createBit({
  displayName: 'Local AI',
  description: 'Local AI inference services with OpenAI-compatible interface. Run LLMs, Stable Diffusion, Whisper, and more entirely on your machine.',
  minimumSupportedRelease: '0.63.0',
  logoUrl: 'lucide:Cpu',
  categories: [BitCategory.ARTIFICIAL_INTELLIGENCE],
  auth: localAiAuth,
  actions: [
    askLocalLlm,
    generateImage,
    transcribeAudio,
    textToSpeech,
    captionImage,
    visionPrompt,
    extractStructuredData,
    installModel,
    listModels,
    getSystemInfo,
  ],
  authors: ['Codenteam'],
  triggers: [],
});

// Default export
export default localAi;
