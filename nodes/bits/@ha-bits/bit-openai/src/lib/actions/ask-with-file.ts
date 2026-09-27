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

    const userContent: any[] = [{ type: 'text', text: prompt }];

    if (isTextMime(resolvedMime)) {
      // OpenAI file blocks do not accept plain text MIME types — inline decoded text instead
      const textBody = decodeBase64Content(fileContent);
      userContent.push({
        type: 'text',
        text: `--- ${filename || 'file'} ---\n${textBody}`,
      });
    } else if (resolvedMime.startsWith('image/')) {
      userContent.push({
        type: 'image_url',
        image_url: { url: fileData },
      });
    } else {
      userContent.push({
        type: 'file',
        file: {
          filename: filename || 'file.pdf',
          file_data: fileData,
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: model || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: userContent,
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

/** MIME map aligned with @ha-bits/bit-filesystem guessMimeType */
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const TEXT_MIMES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
]);

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return MIME_BY_EXT[ext || ''] || 'application/octet-stream';
}

function isTextMime(mime: string): boolean {
  return TEXT_MIMES.has(mime) || mime.startsWith('text/');
}

function decodeBase64Content(fileContent: string): string {
  const raw = fileContent.startsWith('data:')
    ? (fileContent.split(',')[1] || '')
    : fileContent;
  return Buffer.from(raw, 'base64').toString('utf-8');
}
