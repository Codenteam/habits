/**
 * Generate Image Action
 * 
 * Similar to OpenAI's DALL-E - generates images using local Stable Diffusion models.
 * Supports various SD models (SD 1.5, SD 2.1, SDXL, etc.)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: any;
declare const Buffer: any;

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  StableDiffusionModels, 
  ImageResolutions,
  parseResolution,
  DeviceType 
} from '../common/common';
import { generateImage as generateImageDriver } from '../driver';

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
    const env = typeof process !== 'undefined' ? process.env : {};
    const device = authValue.device || (env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    const { width, height } = parseResolution(propsValue.resolution);
    const outputFileName = propsValue.outputFileName || 'generated_image';
    
    // Check if seed is valid
    const isValidSeed = propsValue.seed !== undefined && 
      propsValue.seed !== null &&
      typeof propsValue.seed === 'number' &&
      !isNaN(propsValue.seed);
    
    // Generate image via driver
    const result = await generateImageDriver(
      propsValue.model,
      propsValue.prompt,
      propsValue.negativePrompt || '',
      {
        width,
        height,
        steps: propsValue.steps || 30,
        guidanceScale: propsValue.guidanceScale || 7.5,
        seed: isValidSeed ? propsValue.seed : undefined,
        device,
        customBasePath: propsValue.customModelPath,
      }
    );
    
    // Save the generated image via files API
    let imageUrl: string | null = null;
    
    if (files && result.base64) {
      const imageBuffer = Buffer.from(result.base64, 'base64');
      
      const savedFile = await files.write({
        fileName: `${outputFileName}.png`,
        data: imageBuffer,
      }) as any;
      
      imageUrl = savedFile?.url || null;
    }
    
    return {
      imageUrl,
      imageBase64: result.base64 ? `data:image/png;base64,${result.base64}` : null,
      width: result.width,
      height: result.height,
      steps: result.steps,
      model: propsValue.model,
      prompt: propsValue.prompt,
    };
  },
});
