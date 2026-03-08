/**
 * Vision Prompt Action
 * Ask GPT a question about an image
 */

import {
  createAction,
  Property,
} from '@ha-bits/cortex';
import OpenAI from 'openai';
import { intersectAuth } from '../common/common';
import { getIntersectBaseUrl, IntersectAuthValue, castMarkdownProperty, castMarkdownCodeBlocks } from '../common/common';

export const visionPrompt = createAction({
  auth: intersectAuth,
  name: 'vision_prompt',
  displayName: 'Vision Prompt',
  description: 'Ask GPT a question about an image',
  props: {
    image: Property.File({
      displayName: 'Image',
      description: "The image URL or file you want GPT's vision to read.",
      required: true,
    }),
    prompt: Property.LongText({
      displayName: 'Question',
      description: 'What do you want ChatGPT to tell you about the image?',
      required: true,
    }),
    detail: Property.StaticDropdown({
      displayName: 'Detail',
      required: false,
      description:
        'Control how the model processes the image and generates textual understanding.',
      defaultValue: 'auto',
      options: {
        options: [
          {
            label: 'low',
            value: 'low',
          },
          {
            label: 'high',
            value: 'high',
          },
          {
            label: 'auto',
            value: 'auto',
          },
        ],
      },
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      description:
        'Controls randomness: Lowering results in less random completions. As the temperature approaches zero, the model will become deterministic and repetitive.',
      defaultValue: 0.9,
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      required: false,
      description:
        "The maximum number of tokens to generate. Requests can use up to 2,048 or 4,096 tokens shared between prompt and completion, don't set the value to maximum and leave some tokens for the input. The exact limit varies by model. (One token is roughly 4 characters for normal English text)",
      defaultValue: 2048,
    }),
    topP: Property.Number({
      displayName: 'Top P',
      required: false,
      description:
        'An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered.',
      defaultValue: 1,
    }),
    frequencyPenalty: Property.Number({
      displayName: 'Frequency penalty',
      required: false,
      description:
        "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.",
      defaultValue: 0,
    }),
    presencePenalty: Property.Number({
      displayName: 'Presence penalty',
      required: false,
      description:
        "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the mode's likelihood to talk about new topics.",
      defaultValue: 0.6,
    }),
    roles: Property.Json({
      displayName: 'Roles',
      required: false,
      description: 'Array of roles to specify more accurate response',
      defaultValue: [
        { role: 'system', content: 'You are a helpful assistant.' },
      ],
    }),
    cast: castMarkdownProperty,
  },
  async run({ auth, propsValue }) {
    // Inline validation to avoid Zod version mismatch
    const { temperature } = propsValue;
    if (temperature !== undefined && temperature !== null) {
      if (typeof temperature !== 'number' || temperature < 0 || temperature > 1) {
        throw new Error('Temperature must be a number between 0 and 1');
      }
    }

    const authValue = auth as unknown as IntersectAuthValue;
    const openai = new OpenAI({
      apiKey: authValue.apiKey,
      baseURL: getIntersectBaseUrl(authValue.host),
    });
    const { maxTokens, topP, frequencyPenalty, presencePenalty } =
      propsValue;

    const rolesArray = propsValue.roles ? (propsValue.roles as any) : [];
    const roles = rolesArray.map((item: any) => {
      const rolesEnum = ['system', 'user', 'assistant'];
      if (!rolesEnum.includes(item.role)) {
        throw new Error(
          'The only available roles are: [system, user, assistant]'
        );
      }

      return {
        role: item.role,
        content: item.content,
      };
    });

    /**
     * If starts with data:, use it as is
     * If not starting with data assume jpeg
     */
    const base64 = propsValue.image;
    const extension = 'jpeg';

    const base64Url = base64.startsWith('data:') ? base64 : `data:image/${extension};base64,${base64}`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        ...roles,
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: propsValue['prompt'],
            },
            {
              type: 'image_url',
              image_url: {
                url: base64Url,
              },
            },
          ],
        },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    });

    const responseContent = completion.choices[0].message.content;
    
    // Cast markdown code blocks if enabled
    if (propsValue.cast) {
      return castMarkdownCodeBlocks(responseContent);
    }

    return responseContent;
  },
});
