/**
 * Extract Structured Data Action
 * 
 * Similar to OpenAI's structured output - extracts data according to a JSON schema.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { 
  localAiAuth, 
  LocalAiAuthValue, 
  TextGenModels,
  getModelPath,
  DeviceType 
} from '../common/common';
import { TextGenConfig } from '../common/models';
import { getBackend } from '../stubs';

export const extractStructuredData = createAction({
  auth: localAiAuth,
  name: 'extract_structured_data',
  displayName: 'Extract Structured Data',
  description: 'Extract structured JSON data from text using a schema definition. Useful for parsing invoices, receipts, documents, etc.',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'The LLM model to use for extraction.',
      defaultValue: 'qwen2-0.5b',
      options: {
        disabled: false,
        options: TextGenModels,
      },
    }),
    content: Property.LongText({
      displayName: 'Content',
      required: true,
      description: 'The text content to extract data from.',
    }),
    schema: Property.Json({
      displayName: 'Output Schema',
      required: true,
      description: 'JSON Schema defining the expected output structure.',
      defaultValue: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          value: { type: 'number' },
        },
        required: ['name'],
      },
    }),
    instructions: Property.LongText({
      displayName: 'Additional Instructions',
      required: false,
      description: 'Optional instructions to guide the extraction.',
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      description: 'Lower values (0-0.3) recommended for extraction. Default is 0.2.',
      defaultValue: 0.2,
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      required: false,
      description: 'Maximum tokens for the JSON output.',
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
      throw new Error('For custom models, use the Ask Local LLM action instead');
    }
    
    modelPath = getModelPath(resolvedBasePath, 'text-gen', propsValue.model, 'model.gguf');
    tokenizerPath = getModelPath(resolvedBasePath, 'text-gen', propsValue.model, 'tokenizer.json');
    
    // Build extraction prompt
    const schemaStr = JSON.stringify(propsValue.schema, null, 2);
    const systemPrompt = `You are a data extraction assistant. Extract information from the provided content and return it as valid JSON matching this schema:

${schemaStr}

${propsValue.instructions ? `Additional instructions: ${propsValue.instructions}` : ''}

Return ONLY the JSON object, no other text.`;
    
    const fullPrompt = `<|system|>
${systemPrompt}
<|user|>
Extract data from the following content:

${propsValue.content}
<|assistant|>
`;
    
    // Configure generation
    const config: TextGenConfig = {
      modelPath,
      tokenizerPath,
      maxTokens: propsValue.maxTokens || 1024,
      temperature: propsValue.temperature ?? 0.2,
      device: device as DeviceType,
    };
    
    // Generate extraction
    const result = await backend.generateText(config, fullPrompt);
    
    // Try to parse the JSON from the response
    let data: any = null;
    let success = false;
    let rawContent = result.text;
    
    try {
      // Try to find JSON in the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
        success = true;
      } else {
        // Try parsing the whole response
        data = JSON.parse(result.text.trim());
        success = true;
      }
    } catch (e) {
      // Failed to parse JSON
      success = false;
    }
    
    return {
      data,
      success,
      rawContent,
      model: propsValue.model,
    };
  },
});
