/**
 * Embed Text Action
 * Generate vector embeddings using OpenAI embedding models.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import OpenAI from 'openai';
import { openaiAuth, openaiAuthValue } from '../common/common';

const EMBEDDING_MODELS = [
  { label: 'text-embedding-3-small (1536 dims)', value: 'text-embedding-3-small' },
  { label: 'text-embedding-3-large (3072 dims)', value: 'text-embedding-3-large' },
  { label: 'text-embedding-ada-002 (1536 dims)', value: 'text-embedding-ada-002' },
] as const;

type EmbeddingModel = (typeof EMBEDDING_MODELS)[number]['value'];

function normalizeTexts(text?: string, texts?: unknown): string[] {
  if (typeof text === 'string' && text.trim()) {
    return [text];
  }

  if (Array.isArray(texts)) {
    const normalized = texts.map((item, index) => {
      if (typeof item !== 'string') {
        throw new Error(`texts[${index}] must be a string`);
      }
      return item;
    });

    if (normalized.length > 0) {
      return normalized;
    }
  }

  throw new Error('Provide either text (string) or texts (non-empty string[])');
}

export const embedTextAction = createAction({
  auth: openaiAuth,
  name: 'embed-text',
  displayName: 'Embed Text',
  description: 'Generate vector embeddings for text using OpenAI embedding models.',
  props: {
    text: Property.LongText({
      displayName: 'Text',
      description: 'Single text to embed. Use this OR texts.',
      required: false,
    }),
    texts: Property.Json({
      displayName: 'Texts',
      description: 'Array of strings to embed. Use this OR text.',
      required: false,
      defaultValue: [
        'This is a test sentence.',
        'A completely different sentence about cats.',
      ],
    }),
    model: Property.StaticDropdown({
      displayName: 'Model',
      description: 'OpenAI embedding model',
      required: false,
      defaultValue: 'text-embedding-3-small',
      options: {
        disabled: false,
        options: EMBEDDING_MODELS.map((m) => ({ label: m.label, value: m.value })),
      },
    }),
    dimensions: Property.Number({
      displayName: 'Dimensions',
      description: 'Optional output size for text-embedding-3-* models',
      required: false,
    }),
  },
  async run({ auth, propsValue }) {
    const authValue = auth as unknown as openaiAuthValue;
    const openai = new OpenAI({
      apiKey: authValue.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const input = normalizeTexts(propsValue.text, propsValue.texts);
    const model = (propsValue.model || 'text-embedding-3-small') as EmbeddingModel;

    const request: OpenAI.Embeddings.EmbeddingCreateParams = {
      model,
      input,
      encoding_format: 'float',
    };

    if (propsValue.dimensions != null) {
      request.dimensions = Number(propsValue.dimensions);
    }

    const response = await openai.embeddings.create(request);

    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);

    return {
      embeddings,
      model: response.model,
      dimensions: embeddings[0]?.length ?? 0,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
    };
  },
});
