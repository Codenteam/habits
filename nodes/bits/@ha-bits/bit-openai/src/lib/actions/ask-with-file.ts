/**
 * Ask With File Action
 * Send a file (PDF, image, etc.) directly to OpenAI along with a prompt.
 * The file is passed as base64 and sent using OpenAI's native file content type.
 */

import {
  createAction,
  Property,
} from '@ha-bits/cortex-core';
import OpenAI from 'openai';
import { openaiAuth, openaiAuthValue, castMarkdownProperty, castMarkdownCodeBlocks } from '../common/common';

export const askWithFile = createAction({
  auth: openaiAuth,
  name: 'ask_with_file',
  displayName: 'Ask ChatGPT with File',
  description: 'Send a file (PDF, image, etc.) as base64 directly to OpenAI along with a text prompt.',
  props: {
    model: Property.ShortText({
      displayName: 'Model',
      required: false,
      description: 'The model to use. Must support file inputs (e.g. gpt-4o, gpt-4o-mini).',
      defaultValue: 'gpt-4o',
    }),
    prompt: Property.LongText({
      displayName: 'Prompt',
      required: true,
      description: 'The question or instruction to send alongside the file.',
    }),
    fileContent: Property.LongText({
      displayName: 'File Content (base64)',
      required: true,
      description: 'The base64-encoded content of the file (e.g. from email.attachments[0].content).',
    }),
    filename: Property.ShortText({
      displayName: 'Filename',
      required: false,
      description: 'The filename including extension (e.g. invoice.pdf). Used to determine the MIME type.',
      defaultValue: 'file.pdf',
    }),
    mimeType: Property.ShortText({
      displayName: 'MIME Type',
      required: false,
      description: 'Override the MIME type (e.g. application/pdf, image/png). Auto-detected from filename if omitted.',
    }),
    maxTokens: Property.Number({
      displayName: 'Maximum Tokens',
      required: false,
      defaultValue: 1500,
    }),
    temperature: Property.Number({
      displayName: 'Temperature',
      required: false,
      defaultValue: 1,
    }),
    cast: castMarkdownProperty,
  },
  async run({ auth, propsValue }) {
    const authValue = auth as unknown as openaiAuthValue;
    const openai = new OpenAI({
      apiKey: authValue.apiKey,
      dangerouslyAllowBrowser: true,
    } as any);

    const {
      model,
      prompt,
      fileContent,
      filename,
      mimeType,
      maxTokens,
      temperature,
      cast,
    } = propsValue;

    // Determine MIME type from filename if not provided
    const resolvedMime = mimeType || guessMimeType(filename || 'file.pdf');

    // Build the data URL
    const fileData = fileContent.startsWith('data:')
      ? fileContent
      : `data:${resolvedMime};base64,${fileContent}`;

    // Images use image_url content type; everything else (PDF, etc.) uses file
    const isImage = resolvedMime.startsWith('image/');
    const fileContentBlock: any = isImage
      ? {
          type: 'image_url',
          image_url: { url: fileData },
        }
      : {
          type: 'file',
          file: {
            filename: filename || 'file.pdf',
            file_data: fileData,
          },
        };

    const completion = await openai.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            fileContentBlock,
          ],
        },
      ],
      max_completion_tokens: maxTokens,
      temperature: temperature,
    } as any);

    const responseContent = completion.choices[0].message.content ?? '';

    if (cast === 'force' || cast === true) {
      return castMarkdownCodeBlocks(responseContent);
    }
    return responseContent;
  },
});

/**
 * Guess MIME type from file extension
 */
function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return map[ext || ''] || 'application/octet-stream';
}
