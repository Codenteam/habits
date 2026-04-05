/**
 * Install Model Action
 * 
 * Downloads and installs AI models from HuggingFace or direct URLs.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  getModelPath 
} from '../common/common';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

/**
 * Model type presets for organizing downloads
 */
const ModelTypes = [
  { value: 'text-gen', label: 'Text Generation (LLM)' },
  { value: 'image-gen', label: 'Image Generation (Stable Diffusion)' },
  { value: 'whisper', label: 'Audio Transcription (Whisper)' },
  { value: 'tts', label: 'Text-to-Speech' },
  { value: 'caption', label: 'Image Captioning (BLIP)' },
  { value: 'vision', label: 'Vision (Multimodal)' },
  { value: 'other', label: 'Other' },
];

export const installModel = createAction({
  auth: localAiAuth,
  name: 'install_model',
  displayName: 'Install Model',
  description: 'Download and install an AI model from HuggingFace or direct URL.',
  props: {
    modelUrl: Property.ShortText({
      displayName: 'Model URL',
      required: true,
      description: 'URL to download the model from (HuggingFace URL or direct download link)',
    }),
    modelName: Property.ShortText({
      displayName: 'Model Name',
      required: true,
      description: 'Name for the installed model (e.g., "qwen2-0.5b")',
    }),
    modelType: Property.StaticDropdown({
      displayName: 'Model Type',
      required: true,
      description: 'Type of model (determines installation directory)',
      defaultValue: 'text-gen',
      options: {
        disabled: false,
        options: ModelTypes,
      },
    }),
    fileName: Property.ShortText({
      displayName: 'File Name',
      required: false,
      description: 'Custom file name (default: inferred from URL or model name)',
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
    
    // Use defaults if auth not configured
    const modelsBasePath = authValue.modelsBasePath || process.env.LOCAL_AI_MODELS_PATH || '~/.habits/models';
    
    // Resolve home directory
    const resolvedBasePath = modelsBasePath.startsWith('~') 
      ? modelsBasePath.replace('~', process.env.HOME || '/tmp')
      : modelsBasePath;
    
    // Determine output path
    const modelDir = path.join(resolvedBasePath, propsValue.modelType, propsValue.modelName);
    
    // Determine file name
    let fileName = propsValue.fileName;
    if (!fileName) {
      // Extract from URL
      const urlPath = new URL(propsValue.modelUrl).pathname;
      fileName = path.basename(urlPath) || `${propsValue.modelName}.gguf`;
    }
    
    const outputPath = path.join(modelDir, fileName);
    
    // Check if already exists
    if (fs.existsSync(outputPath) && !propsValue.overwrite) {
      return {
        success: false,
        path: outputPath,
        error: 'Model already exists. Set "Overwrite Existing" to true to replace it.',
        size: 0,
      };
    }
    
    // Create directory
    fs.mkdirSync(modelDir, { recursive: true });
    
    // Download the model
    try {
      const size = await downloadFile(propsValue.modelUrl, outputPath);
      
      return {
        success: true,
        path: outputPath,
        size,
        error: null,
      };
    } catch (e) {
      // Clean up partial download
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch {}
      
      return {
        success: false,
        path: outputPath,
        size: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

/**
 * Download a file from URL to local path
 */
async function downloadFile(url: string, outputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(outputPath);
          downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`HTTP ${response.statusCode}: Failed to download`));
        return;
      }
      
      let downloadedBytes = 0;
      
      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(downloadedBytes);
      });
    });
    
    request.on('error', (err) => {
      file.close();
      reject(err);
    });
    
    file.on('error', (err) => {
      file.close();
      reject(err);
    });
  });
}
