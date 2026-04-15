/**
 * Install Model Action
 * 
 * Downloads and installs AI models from HuggingFace or direct URLs.
 * Supports name-only installation for known models via ModelRegistry.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  getModelsBasePath,
  ModelRegistry,
} from '../common/common';

/**
 * Model type presets for organizing downloads
 */
const ModelTypes = [
  { value: 'text-gen', label: 'Text Generation (LLM)' },
  { value: 'diffusion', label: 'Image Generation (Stable Diffusion)' },
  { value: 'whisper', label: 'Audio Transcription (Whisper)' },
  { value: 'tts', label: 'Text-to-Speech' },
  { value: 'caption', label: 'Image Captioning (BLIP)' },
  { value: 'other', label: 'Other' },
];

/** Check if running in Tauri WebView */
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__?.core?.invoke;
}

/** Get Tauri invoke function */
function getTauriInvoke(): (cmd: string, args?: Record<string, unknown>) => Promise<any> {
  const tauri = (window as any).__TAURI__;
  const rawInvoke = tauri.core.invoke.bind(tauri.core);
  return async (cmd: string, args?: Record<string, unknown>): Promise<any> => {
    try {
      return await rawInvoke(cmd, args);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e));
      throw new Error(msg);
    }
  };
}

/** Download a file using Tauri plugin */
async function downloadViaTauri(url: string, relativePath: string, overwrite: boolean): Promise<{ success: boolean; path: string; size: number; error: string | null }> {
  const invoke = getTauriInvoke();
  return invoke('plugin:local-ai|download_file', { url, relativePath, overwrite });
}

/** Download a file using Node.js http/https */
async function downloadViaNode(url: string, outputPath: string, overwrite: boolean): Promise<{ success: boolean; path: string; size: number; error: string | null }> {
  const path = require('path');
  const fs = require('fs');
  const https = require('https');
  const http = require('http');

  if (fs.existsSync(outputPath) && !overwrite) {
    return { success: true, path: outputPath, size: 0, error: null };
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, (response: any) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadViaNode(redirectUrl, outputPath, overwrite).then(resolve);
          return;
        }
      }
      if (response.statusCode !== 200) {
        resolve({ success: false, path: outputPath, size: 0, error: `HTTP ${response.statusCode}` });
        return;
      }
      const file = fs.createWriteStream(outputPath);
      let bytes = 0;
      response.on('data', (chunk: Buffer) => { bytes += chunk.length; });
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve({ success: true, path: outputPath, size: bytes, error: null }); });
      file.on('error', (err: Error) => { file.close(); resolve({ success: false, path: outputPath, size: 0, error: err.message }); });
    });
    request.on('error', (err: Error) => { resolve({ success: false, path: outputPath, size: 0, error: err.message }); });
  });
}

export const installModel = createAction({
  auth: localAiAuth,
  name: 'install_model',
  displayName: 'Install Model',
  description: 'Download and install an AI model. Provide a known model name (e.g., "qwen2-0.5b", "blip", "sd-1.5") to auto-download all required files, or provide a URL for custom models.',
  props: {
    modelName: Property.ShortText({
      displayName: 'Model Name',
      required: true,
      description: 'Name of a known model (qwen2-0.5b, qwen2.5-0.5b, llama-3.2-1b, llama-3.2-3b, tiny-llm, blip, sd-1.5) or custom name when URL is provided',
    }),
    modelUrl: Property.ShortText({
      displayName: 'Model URL',
      required: false,
      description: 'URL to download from. Not needed for known models — leave empty to auto-download all required files.',
    }),
    modelType: Property.StaticDropdown({
      displayName: 'Model Type',
      required: false,
      description: 'Type of model. Auto-detected for known models.',
      defaultValue: 'text-gen',
      options: {
        disabled: false,
        options: ModelTypes,
      },
    }),
    fileName: Property.ShortText({
      displayName: 'File Name',
      required: false,
      description: 'Custom file name (only used with URL-based install)',
    }),
    overwrite: Property.Checkbox({
      displayName: 'Overwrite Existing',
      required: false,
      description: 'Overwrite if model already exists',
      defaultValue: false,
    }),
  },
  async run({ auth, propsValue }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    const resolvedBasePath = await getModelsBasePath(authValue);
    const overwrite = propsValue.overwrite ?? false;
    const modelName = propsValue.modelName;

    // Check if this is a known model
    const registryEntry = ModelRegistry[modelName];

    if (registryEntry) {
      // Known model: download all required files
      const modelType = registryEntry.type;
      const results: Array<{ file: string; success: boolean; path: string; size: number; error: string | null }> = [];

      for (const [fileName, url] of Object.entries(registryEntry.files)) {
        const relativePath = `${modelType}/${modelName}/${fileName}`;
        let result: { success: boolean; path: string; size: number; error: string | null };

        if (isTauri()) {
          result = await downloadViaTauri(url, relativePath, overwrite);
        } else {
          const outputPath = `${resolvedBasePath}/${relativePath}`;
          result = await downloadViaNode(url, outputPath, overwrite);
        }

        results.push({ file: fileName, ...result });

        if (!result.success) {
          return {
            success: false,
            modelName,
            modelType,
            results,
            error: `Failed to download ${fileName}: ${result.error}`,
          };
        }
      }

      return {
        success: true,
        modelName,
        modelType,
        path: `${resolvedBasePath}/${modelType}/${modelName}`,
        results,
        totalFiles: results.length,
        totalSize: results.reduce((acc, r) => acc + r.size, 0),
        error: null,
      };
    }

    // Unknown model: require URL, download single file
    const modelUrl = propsValue.modelUrl;
    if (!modelUrl) {
      return {
        success: false,
        modelName,
        error: `Unknown model "${modelName}". Provide a modelUrl for custom models. Known models: ${Object.keys(ModelRegistry).join(', ')}`,
      };
    }

    const modelType = propsValue.modelType || 'text-gen';
    let fileName = propsValue.fileName;
    if (!fileName) {
      try {
        const urlPath = new URL(modelUrl).pathname;
        fileName = urlPath.split('/').pop() || `${modelName}.gguf`;
      } catch {
        fileName = `${modelName}.gguf`;
      }
    }

    const relativePath = `${modelType}/${modelName}/${fileName}`;
    let result: { success: boolean; path: string; size: number; error: string | null };

    if (isTauri()) {
      result = await downloadViaTauri(modelUrl, relativePath, overwrite);
    } else {
      const outputPath = `${resolvedBasePath}/${relativePath}`;
      result = await downloadViaNode(modelUrl, outputPath, overwrite);
    }

    return {
      success: result.success,
      modelName,
      modelType,
      path: result.path,
      size: result.size,
      error: result.error,
    };
  },
});
