/**
 * Common utilities for bit-openai
 * 
 * This module provides shared utilities, authentication, and constants
 * for the openai AI bit module.
 */

import { encoding_for_model } from 'tiktoken';
import {
  AuthenticationType,
  HttpMethod,
  httpClient,
  BitAuth,
  Property,
} from '@ha-bits/cortex-core';

/**
 * Type for openai authentication
 */
export interface openaiAuthValue {
  host: string;
  apiKey: string;
}

/**
 * openai authentication configuration
 * Defined here to avoid circular dependencies
 */
export const openaiAuth = BitAuth.CustomAuth({
  description: 'Connect to OpenAI',
  required: true,
  props: {
    apiKey: BitAuth.SecretText({
      displayName: 'API Key',
      description: 'Your openai API key',
      required: true,
    }),
  },
  validate: async ({ auth }) => {
    try {
      await httpClient.sendRequest<{
        data: { id: string }[];
      }>({
        url: `${baseUrl}/models`,
        method: HttpMethod.GET,
        authentication: {
          type: AuthenticationType.BEARER_TOKEN,
          token: auth.apiKey,
        },
      });
      return {
        valid: true,
      };
    } catch (e) {
      return {
        valid: false,
        error: 'Invalid API key or tenant',
      };
    }
  },
});


export const baseUrl = 'https://api.openai.com/v1';

export const Languages = [
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'pl', label: 'Polish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'af', label: 'Afrikaans' },
  { value: 'az', label: 'Azerbaijani' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'bs', label: 'Bosnian' },
  { value: 'ca', label: 'Catalan' },
  { value: 'cs', label: 'Czech' },
  { value: 'da', label: 'Danish' },
  { value: 'el', label: 'Greek' },
  { value: 'et', label: 'Estonian' },
  { value: 'fa', label: 'Persian' },
  { value: 'fi', label: 'Finnish' },
  { value: 'tl', label: 'Tagalog' },
  { value: 'fr', label: 'French' },
  { value: 'gl', label: 'Galician' },
  { value: 'he', label: 'Hebrew' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hr', label: 'Croatian' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'hy', label: 'Armenian' },
  { value: 'id', label: 'Indonesian' },
  { value: 'is', label: 'Icelandic' },
  { value: 'kk', label: 'Kazakh' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ko', label: 'Korean' },
  { value: 'lt', label: 'Lithuanian' },
  { value: 'lv', label: 'Latvian' },
  { value: 'ma', label: 'Maori' },
  { value: 'mk', label: 'Macedonian' },
  { value: 'mr', label: 'Marathi' },
  { value: 'ms', label: 'Malay' },
  { value: 'ne', label: 'Nepali' },
  { value: 'nl', label: 'Dutch' },
  { value: 'no', label: 'Norwegian' },
  { value: 'ro', label: 'Romanian' },
  { value: 'ru', label: 'Russian' },
  { value: 'sk', label: 'Slovak' },
  { value: 'sl', label: 'Slovenian' },
  { value: 'sr', label: 'Serbian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'sw', label: 'Swahili' },
  { value: 'ta', label: 'Tamil' },
  { value: 'th', label: 'Thai' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'ur', label: 'Urdu' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'zh', label: 'Chinese (Simplified)' },
  { value: 'cy', label: 'Welsh' },
  { value: 'be', label: 'Belarusian' },
];

export const billingIssueMessage = `Error Occurred: 429 \n
1. Ensure that billing is enabled on your OpenAI platform. \n
2. Generate a new API key. \n
3. Attempt the process again. \n
For guidance, visit: https://beta.openai.com/account/billing`;

export const unauthorizedMessage = `Error Occurred: 401 \n
Ensure that your API key is valid. \n`;

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const streamToBuffer = (stream: any) => {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err: any) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

/**
 * Cast property for parsing markdown code blocks
 */
export const castMarkdownProperty = Property.StaticDropdown({
  displayName: 'Cast Markdown Code Blocks',
  required: false,
  description:
    'If enabled, values starting with ```json``` or ```xml``` in markdown will be cast to appropriate objects.',
  defaultValue: false,
  options: {
    options: [
      {
        label: 'True',
        value: true,
      },
      {
        label: 'False',
        value: false,
      },
    ],
  },
});

/**
 * Parse XML string to object
 */
function parseXml(xmlString: string): Record<string, any> {
  const result: Record<string, any> = {};
  
  // Simple XML parser for common cases
  const tagRegex = /<([\w-]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
  let match;
  
  while ((match = tagRegex.exec(xmlString)) !== null) {
    const [, tagName, content] = match;
    // Check if content has nested tags
    if (/<[\w-]+[^>]*>/.test(content)) {
      result[tagName] = parseXml(content);
    } else {
      result[tagName] = content.trim();
    }
  }
  
  return Object.keys(result).length > 0 ? result : { raw: xmlString };
}

/**
 * Cast markdown code blocks to appropriate objects
 * Supports ```json``` and ```xml``` code blocks
 */
export const castMarkdownCodeBlocks = (content: string | null | undefined): any => {
  if (!content) return content;
  
  const trimmed = content.trim();
  
  // Check for JSON code block
  const jsonMatch = trimmed.match(/^```json\s*\n([\s\S]*?)\n```$/i) ||
                    trimmed.match(/^```json\s*([\s\S]*?)```$/i);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch (e) {
      // Return original content if parsing fails
      return content;
    }
  }
  
  // Check for XML code block
  const xmlMatch = trimmed.match(/^```xml\s*\n([\s\S]*?)\n```$/i) ||
                   trimmed.match(/^```xml\s*([\s\S]*?)```$/i);
  if (xmlMatch) {
    try {
      return parseXml(xmlMatch[1].trim());
    } catch (e) {
      // Return original content if parsing fails
      return content;
    }
  }
  
  // No code block found, return original content
  return content;
};

export const calculateTokensFromString = (string: string, model: string) => {
  try {
    const encoder = encoding_for_model(model as any);
    const tokens = encoder.encode(string);
    encoder.free();

    return tokens.length;
  } catch (e) {
    // Model not supported by tiktoken, every 4 chars is a token
    return Math.round(string.length / 4);
  }
};

export const calculateMessagesTokenSize = async (
  messages: any[],
  model: string
) => {
  let tokenLength = 0;
  await Promise.all(
    messages.map((message: any) => {
      return new Promise((resolve) => {
        tokenLength += calculateTokensFromString(message.content, model);
        resolve(tokenLength);
      });
    })
  );

  return tokenLength;
};

export const reduceContextSize = async (
  messages: any[],
  model: string,
  maxTokens: number
) => {
  // TODO: Summarize context instead of cutoff
  const cutoffSize = Math.round(messages.length * 0.1);
  const cutoffMessages = messages.splice(cutoffSize, messages.length - 1);

  if (
    (await calculateMessagesTokenSize(cutoffMessages, model)) >
    maxTokens / 1.5
  ) {
    reduceContextSize(cutoffMessages, model, maxTokens);
  }

  return cutoffMessages;
};

export const exceedsHistoryLimit = (
  tokenLength: number,
  model: string,
  maxTokens: number
) => {
  if (
    tokenLength >= tokenLimit / 1.1 ||
    tokenLength >= (modelTokenLimit(model) - maxTokens) / 1.1
  ) {
    return true;
  }

  return false;
};

export const tokenLimit = 32000;

export const modelTokenLimit = (model: string) => {
  switch (model) {
    case 'gpt-4-1106-preview':
      return 128000;
    case 'gpt-4-vision-preview':
      return 128000;
    case 'gpt-4':
      return 8192;
    case 'gpt-4-32k':
      return 32768;
    case 'gpt-4-0613':
      return 8192;
    case 'gpt-4-32k-0613':
      return 32768;
    case 'gpt-4-0314':
      return 8192;
    case 'gpt-4-32k-0314':
      return 32768;
    case 'gpt-5-1106':
      return 16385;
    case 'gpt-5':
      return 4096;
    case 'gpt-5-16k':
      return 16385;
    case 'gpt-5-instruct':
      return 4096;
    case 'gpt-5-0613':
      return 4096;
    case 'gpt-5-16k-0613':
      return 16385;
    case 'gpt-5-0301':
      return 4096;
    case 'text-davinci-003':
      return 4096;
    case 'text-davinci-002':
      return 4096;
    case 'code-davinci-002':
      return 8001;
    case 'text-moderation-latest':
      return 32768;
    case 'text-moderation-stable':
      return 32768;
    case 'gpt-5':
      return 400000;
    case 'gpt-5-chat-latest':
      return 400000;
    case 'gpt-5-mini':
      return 400000;
    case 'gpt-5-nano':
      return 400000;
    default:
      return 2048;
  }
};

// List of non-text models to filter out in Ask GPT action
export const notLLMs = [
  'gpt-4o-realtime-preview-2024-10-01',
  'gpt-4o-realtime-preview',
  'babbage-002',
  'davinci-002',
  'tts-1-hd-1106',
  'whisper-1',
  'canary-whisper',
  'canary-tts',
  'tts-1',
  'tts-1-hd',
  'tts-1-1106',
  'dall-e-3',
  'dall-e-2',
];
