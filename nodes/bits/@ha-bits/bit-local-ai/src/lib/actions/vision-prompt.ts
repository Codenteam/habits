/**
 * Vision Prompt Action
 * 
 * Similar to OpenAI's GPT-4 Vision - analyze images with text prompts.
 * Uses multimodal LLM models that support vision (Qwen3.5, LLaVA, etc.)
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  getModelPath,
  DeviceType 
} from '../common/common';
import { TextGenConfig } from '../common/models';
import { getBackend } from '../stubs';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Vision-capable model presets
 */
const VisionModels = [
  { value: 'qwen3.5-vision-0.8b', label: 'Qwen3.5 Vision 0.8B (Fast)' },
  { value: 'qwen3.5-vision-3b', label: 'Qwen3.5 Vision 3B (Balanced)' },
  { value: 'llava-1.5-7b', label: 'LLaVA 1.5 7B' },
  { value: 'custom', label: 'Custom Vision Model' },
];

export const visionPrompt = createAction({
  auth: localAiAuth,
  name: 'vision_prompt',
  displayName: 'Vision Prompt',
  description: 'Analyze images and answer questions about them using vision-capable local models. Similar to GPT-4 Vision.',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'The vision-capable model to use.',
      defaultValue: 'qwen3.5-vision-0.8b',
      options: {
        disabled: false,
        options: VisionModels,
      },
    }),
    customModelPath: Property.ShortText({
      displayName: 'Custom Model Path',
      required: false,
      description: 'Path to custom vision model file (only used when Model is set to Custom)',
    }),
    customTokenizerPath: Property.ShortText({
      displayName: 'Custom Tokenizer Path',
      required: false,
      description: 'Path to tokenizer.json file (only used when Model is set to Custom)',
    }),
    image: Property.File({
      displayName: 'Image',
      required: false,
      description: 'The image to analyze (jpg, png, webp, etc.)',
    }),
    imageUrl: Property.ShortText({
      displayName: 'Image URL or Path',
      required: false,
      description: 'Alternative: URL, local path, or base64 data URL of the image',
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
      description: 'Question or instruction about the image.',
    }),
    detail: Property.StaticDropdown({
      displayName: 'Detail Level',
      required: false,
      description: 'Image detail/resolution for analysis.',
      defaultValue: 'auto',
      options: {
        disabled: false,
        options: [
          { value: 'auto', label: 'Auto' },
          { value: 'low', label: 'Low (faster)' },
          { value: 'high', label: 'High (more accurate)' },
        ],
      },
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      description: 'Controls randomness (0 = deterministic, 1 = creative). Default is 0.7.',
      defaultValue: 0.7,
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      required: false,
      description: 'Maximum number of tokens to generate.',
      defaultValue: 1024,
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
        throw new Error('Custom model requires both model path and tokenizer path');
      }
      modelPath = propsValue.customModelPath;
      tokenizerPath = propsValue.customTokenizerPath;
    } else {
      modelPath = getModelPath(resolvedBasePath, 'vision', propsValue.model, 'model.gguf');
      tokenizerPath = getModelPath(resolvedBasePath, 'vision', propsValue.model, 'tokenizer.json');
    }
    
    // Handle image input - try to convert to base64 for the prompt
    let imageBase64: string = '';
    let tempImagePath: string | null = null;
    
    if (propsValue.image) {
      // Uploaded file
      const imageFile = propsValue.image as { filename: string; data: Buffer; extension?: string };
      imageBase64 = imageFile.data.toString('base64');
    } else if (propsValue.imageUrl) {
      const imageInput = propsValue.imageUrl;
      
      if (imageInput.startsWith('data:')) {
        // Already base64 data URL
        imageBase64 = imageInput.split(',')[1] || imageInput;
      } else if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
        // Download from URL
        const response = await fetch(imageInput);
        const arrayBuffer = await response.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuffer).toString('base64');
      } else {
        // Local file path
        const imageBuffer = fs.readFileSync(imageInput);
        imageBase64 = imageBuffer.toString('base64');
      }
    } else {
      throw new Error('Either Image or Image URL must be provided');
    }
    
    // Build vision prompt with image
    // Format depends on the model, using a common format
    const fullPrompt = `<|image|>${imageBase64}<|/image|>\n<|user|>\n${propsValue.prompt}\n<|assistant|>\n`;
    
    // Configure generation
    const config: TextGenConfig = {
      modelPath,
      tokenizerPath,
      maxTokens: propsValue.maxTokens || 1024,
      temperature: propsValue.temperature ?? 0.7,
      device: device as DeviceType,
    };
    
    // Generate response
    const result = await backend.generateText(config, fullPrompt);
    
    return {
      content: result.text,
      usage: {
        promptTokens: 0, // Would need tokenizer to count
        completionTokens: result.tokensGenerated,
        totalTokens: result.tokensGenerated,
      },
      model: propsValue.model,
    };
  },
});
