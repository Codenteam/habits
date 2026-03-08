/**
 * Generate Image Action
 * Generate an image using DALL-E
 */

import { createAction, Property } from '@ha-bits/cortex';
import OpenAI from 'openai';
import { openaiAuth } from '../common/common';
import { openaiAuthValue } from '../common/common';

export const generateImage = createAction({
  auth: openaiAuth,
  name: 'generate_image',
  displayName: 'Generate Image',
  description: 'Generate an image using DALL-E',
  props: {
    model: Property.StaticDropdown({
      displayName: 'Model',
      required: true,
      description: 'The model which will generate the image.',
      defaultValue: 'dall-e-3',
      options: {
        disabled: false,
        options: [
          {
            label: 'dall-e-3',
            value: 'dall-e-3',
          },
          {
            label: 'dall-e-2',
            value: 'dall-e-2',
          },
        ],
      },
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      description: 'A text description of the desired image(s). The maximum length is 1000 characters for dall-e-2 and 4000 characters for dall-e-3.',
      required: true,
    }),
    resolution: Property.Dropdown({
      auth: openaiAuth,
      displayName: 'Resolution',
      required: true,
      description: 'The size of the generated images.',
      refreshers: ['model'],
      defaultValue: '1024x1024',
      options: async ({ propsValue }) => {
        const model = (propsValue as Record<string, unknown>)?.['model'] as string;
        if (model === 'dall-e-2') {
          return {
            disabled: false,
            options: [
              {
                label: '256x256',
                value: '256x256',
              },
              {
                label: '512x512',
                value: '512x512',
              },
              {
                label: '1024x1024',
                value: '1024x1024',
              },
            ],
          };
        }
        return {
          disabled: false,
          options: [
            {
              label: '1024x1024',
              value: '1024x1024',
            },
            {
              label: '1792x1024',
              value: '1792x1024',
            },
            {
              label: '1024x1792',
              value: '1024x1792',
            },
          ],
        };
      },
    }),
    quality: Property.Dropdown({
      auth: openaiAuth,
      displayName: 'Quality',
      required: true,
      description: 'The quality of the image that will be generated.',
      refreshers: ['model'],
      defaultValue: 'standard',
      options: async ({ propsValue }) => {
        const model = (propsValue as Record<string, unknown>)?.['model'] as string;
        if (model === 'dall-e-2') {
          return {
            disabled: true,
            placeholder: 'Quality is not available for dall-e-2',
            options: [],
          };
        }
        return {
          disabled: false,
          options: [
            {
              label: 'standard',
              value: 'standard',
            },
            {
              label: 'hd',
              value: 'hd',
            },
          ],
        };
      },
    }),
    responseFormat: Property.StaticDropdown({
      displayName: 'Response Format',
      required: false,
      description: 'The format in which the generated images are returned.',
      defaultValue: 'url',
      options: {
        disabled: false,
        options: [
          {
            label: 'URL',
            value: 'url',
          },
          {
            label: 'Base64 JSON',
            value: 'b64_json',
          },
        ],
      },
    })
  },
  async run({ auth, propsValue }) {
    const authValue = auth as unknown as openaiAuthValue;
    const openai = new OpenAI({
      apiKey: authValue.apiKey
    });

    const { quality, resolution, model, prompt, responseFormat } = propsValue;

    const image = await openai.images.generate({
      model: model,
      prompt: prompt,
      quality: quality as any,
      size: resolution as any,
      response_format: (responseFormat as 'url' | 'b64_json') || 'url',
    });
    return image;
  },
});
