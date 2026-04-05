/**
 * Caption Image Action
 * 
 * Similar to OpenAI's Vision API - generates captions/descriptions for images using local BLIP models.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  getModelPath,
  DeviceType 
} from '../common/common';
import { ImageCaptionConfig } from '../common/models';
import { getBackend } from '../stubs';
import * as path from 'path';
import * as os from 'os';

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
    const backend = getBackend();
    
    // Use defaults if auth not configured
    const modelsBasePath = authValue.modelsBasePath || process.env.LOCAL_AI_MODELS_PATH || '~/.habits/models';
    const device = authValue.device || (process.env.LOCAL_AI_DEVICE as DeviceType) || DeviceType.Auto;
    
    // Resolve home directory
    const resolvedBasePath = modelsBasePath.startsWith('~') 
      ? modelsBasePath.replace('~', process.env.HOME || '/tmp')
      : modelsBasePath;
    
    // Determine model paths
    let modelPath: string;
    let tokenizerPath: string;
    
    if (propsValue.model === 'custom') {
      if (!propsValue.customModelPath || !propsValue.customTokenizerPath) {
        throw new Error('Custom model requires both model path and tokenizer path to be specified');
      }
      modelPath = propsValue.customModelPath;
      tokenizerPath = propsValue.customTokenizerPath;
    } else {
      modelPath = getModelPath(resolvedBasePath, 'caption', propsValue.model, 'model.gguf');
      tokenizerPath = getModelPath(resolvedBasePath, 'caption', propsValue.model, 'tokenizer.json');
    }
    
    // Handle image input
    let imagePath: string;
    let tempImagePath: string | null = null;
    
    if (propsValue.imagePath) {
      // Use provided image path directly
      imagePath = propsValue.imagePath;
    } else if (propsValue.image) {
      // Write uploaded image to temp file
      const imageFile = propsValue.image as { filename: string; data: Buffer; extension?: string };
      const fs = await import('fs');
      const tmpDir = os.tmpdir();
      tempImagePath = path.join(tmpDir, `image_${Date.now()}.${imageFile.extension || 'jpg'}`);
      fs.writeFileSync(tempImagePath, new Uint8Array(imageFile.data));
      imagePath = tempImagePath;
    } else {
      throw new Error('Either Image or Image Path must be provided');
    }
    
    try {
      // Configure image captioning
      const config: ImageCaptionConfig = {
        modelPath,
        tokenizerPath,
        seed: propsValue.seed,
        device: device as DeviceType,
      };
      
      // Generate caption
      const result = await backend.captionImage(config, imagePath);
      
      // If a prompt was provided, prepend it to make it look more like a description
      let caption = result.caption;
      // Check if prompt is a valid value (not an unresolved template)
      const isValidPrompt = propsValue.prompt && 
        !propsValue.prompt.includes('{{') && 
        !propsValue.prompt.startsWith('habits.');
      if (isValidPrompt) {
        // The BLIP model uses the prompt as a prefix
        caption = `${propsValue.prompt} ${caption}`;
      }
      
      return {
        caption: caption,
        tokensGenerated: result.tokensGenerated,
        model: propsValue.model,
      };
    } finally {
      // Clean up temp file if we created one
      if (tempImagePath) {
        try {
          const fs = await import('fs');
          fs.unlinkSync(tempImagePath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  },
});
