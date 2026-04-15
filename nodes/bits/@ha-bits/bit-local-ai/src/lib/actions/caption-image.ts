/**
 * Caption Image Action
 * 
 * Similar to OpenAI's Vision API - generates captions/descriptions for images using local BLIP models.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: any;
declare const Buffer: any;

import { createAction, Property } from '@ha-bits/cortex-core';
import { localAiAuth, LocalAiAuthValue, DeviceType } from '../common/common';
import { captionImage as captionImageDriver } from '../driver';

/**
 * Image captioning model presets
 */
const CaptionModels = [
  { value: 'blip-base', label: 'BLIP Base (Fast)' },
  { value: 'blip-large', label: 'BLIP Large (Accurate)' },
  { value: 'custom', label: 'Custom Model Path' },
];

export const captionImage = createAction({
  auth: localAiAuth,
  name: 'caption_image',
  displayName: 'Caption Image',
  description: 'Generate descriptions for images using local BLIP models. Similar to GPT-4 Vision but runs on your machine.',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'The BLIP model to use for image captioning.',
      defaultValue: 'blip-base',
      options: {
        disabled: false,
        options: CaptionModels,
      },
    }),
    customModelPath: Property.ShortText({
      displayName: 'Custom Model Path',
      required: false,
      description: 'Path to custom BLIP model file (only used when Model is set to Custom)',
    }),
    customTokenizerPath: Property.ShortText({
      displayName: 'Custom Tokenizer Path',
      required: false,
      description: 'Path to tokenizer.json file (only used when Model is set to Custom)',
    }),
    image: Property.File({
      displayName: 'Image',
      required: true,
      description: 'The image to caption (jpg, png, webp, etc.)',
    }),
    imagePath: Property.ShortText({
      displayName: 'Image Path',
      required: false,
      description: 'Alternative: Path to a local image file (overrides Image if provided)',
    }),
    prompt: Property.ShortText({
      displayName: 'Prompt (Optional)',
      required: false,
      description: 'Optional prompt to guide the caption generation (e.g., "a photo of")',
    }),
    seed: Property.Number({
      displayName: 'Seed',
      required: false,
      description: 'Random seed for reproducible outputs.',
    }),
  },
  async run({ auth, propsValue }) {
    const authValue = (auth as unknown as Partial<LocalAiAuthValue>) || {};
    const env = typeof process !== 'undefined' ? process.env : {};
    const device = authValue.device || (env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    // Handle image input - convert to base64
    let imageBase64: string;
    
    if (propsValue.imagePath) {
      if (propsValue.imagePath.startsWith('data:image/')) {
        const matches = propsValue.imagePath.match(/^data:image\/([\w+-]+);base64,(.+)$/);
        if (matches) {
          imageBase64 = matches[2];
        } else {
          throw new Error('Invalid base64 image data URL format');
        }
      } else {
        const fsModule: any = await import('fs');
        const imageBuffer = fsModule.readFileSync(propsValue.imagePath);
        imageBase64 = imageBuffer.toString('base64');
      }
    } else if (propsValue.image) {
      const imageFile = propsValue.image as { filename: string; data: any; extension?: string };
      imageBase64 = Buffer.from(imageFile.data).toString('base64');
    } else {
      throw new Error('Either Image or Image Path must be provided');
    }
    
    // Generate caption via driver
    const result = await captionImageDriver(propsValue.model, imageBase64, {
      seed: propsValue.seed,
      device,
      customModelPath: propsValue.customModelPath,
      customTokenizerPath: propsValue.customTokenizerPath,
    });
    
    // Prepend prompt if provided
    let caption = result.caption;
    const isValidPrompt = propsValue.prompt && 
      !propsValue.prompt.includes('{{') && 
      !propsValue.prompt.startsWith('habits.');
    if (isValidPrompt) {
      caption = `${propsValue.prompt} ${caption}`;
    }
    
    return {
      caption,
      tokensGenerated: result.tokensGenerated,
      model: propsValue.model,
    };
  },
});
