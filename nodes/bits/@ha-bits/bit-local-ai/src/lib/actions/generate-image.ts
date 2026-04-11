/**
 * Generate Image Action
 * 
 * Similar to OpenAI's DALL-E - generates images using local Stable Diffusion models.
 * Supports various SD models (SD 1.5, SD 2.1, SDXL, etc.)
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  StableDiffusionModels, 
  ImageResolutions,
  getModelPath, 
  getModelsBasePath,
  parseResolution,
  DeviceType 
} from '../common/common';
import { ImageGenConfig } from '../common/models';
import { getBackend } from '../stubs';
import * as path from 'path';
import * as os from 'os';

export const generateImage = createAction({
  auth: localAiAuth,
  name: 'generate_image',
  displayName: 'Generate Image',
  description: 'Generate images from text prompts using local Stable Diffusion models. Similar to DALL-E but runs on your machine.',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'The Stable Diffusion model to use.',
      defaultValue: 'sd-1.5',
      options: {
        disabled: false,
        options: StableDiffusionModels,
      },
    }),
    customModelPath: Property.ShortText({
      displayName: 'Custom Model Base Path',
      required: false,
      description: 'Base path to custom SD model files (only used when Model is set to Custom). Should contain unet.safetensors, vae.safetensors, clip.safetensors, and tokenizer.json',
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
      description: 'A text description of the desired image. Be descriptive for best results.',
    }),
    negativePrompt: Property.LongText({
      displayName: 'Negative Prompt',
      required: false,
      description: 'Things to avoid in the generated image (e.g., "blurry, low quality, distorted").',
      defaultValue: 'blurry, low quality, distorted, ugly, bad anatomy',
    }),
    resolution: Property.StaticDropdown({
      displayName: 'Resolution',
      required: true,
      description: 'The size of the generated image.',
      defaultValue: '512x512',
      options: {
        disabled: false,
        options: ImageResolutions,
      },
    }),
    steps: Property.Number({
      displayName: 'Steps',
      required: false,
      description: 'Number of diffusion steps. More steps = better quality but slower. Default is 30.',
      defaultValue: 30,
    }),
    guidanceScale: Property.Number({
      displayName: 'Guidance Scale',
      required: false,
      description: 'How closely to follow the prompt (1-20). Higher = more literal. Default is 7.5.',
      defaultValue: 7.5,
    }),
    seed: Property.Number({
      displayName: 'Seed',
      required: false,
      description: 'Random seed for reproducible results. Leave empty for random.',
    }),
    outputFileName: Property.ShortText({
      displayName: 'Output File Name',
      required: false,
      description: 'Name for the output image file (without extension). Default is "generated_image".',
      defaultValue: 'generated_image',
    }),
  },
  async run({ auth, propsValue, files }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    const backend = getBackend();
    
    // Get models base path (handles Tauri app data directory automatically)
    const resolvedBasePath = await getModelsBasePath(authValue);
    const device = authValue.device || ((typeof process !== 'undefined' ? process.env.LOCAL_AI_DEVICE : undefined) as DeviceType) || DeviceType.Auto;
    
    // Determine model paths
    let basePath: string;
    if (propsValue.model === 'custom') {
      if (!propsValue.customModelPath) {
        throw new Error('Custom model requires the model base path to be specified');
      }
      basePath = propsValue.customModelPath;
    } else {
      basePath = getModelPath(resolvedBasePath, 'diffusion', propsValue.model);
    }
    
    const unetPath = `${basePath}/unet.safetensors`;
    const vaePath = `${basePath}/vae.safetensors`;
    const clipPath = `${basePath}/clip.safetensors`;
    const tokenizerPath = `${basePath}/tokenizer.json`;
    
    // Parse resolution
    const { width, height } = parseResolution(propsValue.resolution);
    
    // Generate temporary output path
    const outputFileName = propsValue.outputFileName || 'generated_image';
    const tmpDir = typeof os !== 'undefined' && os.tmpdir ? os.tmpdir() : '/tmp';
    const outputPath = `${tmpDir}/${outputFileName}_${Date.now()}.png`;
    
    // Configure image generation
    // Check if seed is a valid number (not an unresolved template)
    const isValidSeed = propsValue.seed !== undefined && 
      propsValue.seed !== null &&
      typeof propsValue.seed === 'number' &&
      !isNaN(propsValue.seed);
    
    const config: ImageGenConfig = {
      unetPath,
      vaePath,
      clipPath,
      tokenizerPath,
      width,
      height,
      steps: propsValue.steps || 30,
      guidanceScale: propsValue.guidanceScale || 7.5,
      seed: isValidSeed ? propsValue.seed : undefined,
      device: device as DeviceType,
    };
    
    // Generate image
    const result = await backend.generateImage(
      config,
      propsValue.prompt,
      propsValue.negativePrompt || '',
      outputPath
    );
    
    // Read the generated image and return as file
    if (files && result.outputPath) {
      const fs = await import('fs');
      const imageBuffer = fs.readFileSync(result.outputPath);
      
      const savedFile = await files.write({
        fileName: `${outputFileName}.png`,
        data: imageBuffer,
      }) as any;
      
      // Clean up temp file
      try {
        fs.unlinkSync(result.outputPath);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return {
        imageUrl: savedFile?.url || result.outputPath,
        width: result.width,
        height: result.height,
        steps: result.steps,
        model: propsValue.model,
        prompt: propsValue.prompt,
      };
    }
    
    return {
      imagePath: result.outputPath,
      width: result.width,
      height: result.height,
      steps: result.steps,
      model: propsValue.model,
      prompt: propsValue.prompt,
    };
  },
});
