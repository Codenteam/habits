/**
 * Embed Text Action
 *
 * Generate vector embeddings for a batch of texts using a local BERT-family model.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { embedText, isSupported } from '@ha-bits/bit-local-ai/driver';
import { ModelRegistry } from '../common/common';

const embedModelOptions = Object.entries(ModelRegistry)
  .filter(([, entry]) => entry.type === 'embedding')
  .map(([id, entry]) => ({
    label: `${entry.label} (${entry.size})`,
    value: id,
  }));

export const embedTextAction = createAction({
  name: 'embed-text',
  displayName: 'Embed Text',
  description: 'Generate vector embeddings for a batch of texts using a local model.',
  props: {
    texts: Property.Json({
      displayName: 'Texts',
      description: 'Array of strings to embed',
      required: true,
      defaultValue: [
        'This is a test sentence.',
        'A completely different sentence about cats.',
      ],
    }),
    modelId: Property.StaticDropdown({
      displayName: 'Model',
      description: 'The embedding model to use (must be installed first)',
      required: false,
      defaultValue: 'all-minilm-l6-v2',
      options: {
        disabled: false,
        options: embedModelOptions,
      },
    }),
    normalize: Property.Checkbox({
      displayName: 'L2-normalize',
      description: 'Normalize output vectors so each has unit length (recommended for cosine similarity)',
      required: false,
      defaultValue: true,
    }),
    meanPool: Property.Checkbox({
      displayName: 'Mean pooling',
      description: 'Average token embeddings (recommended for sentence-transformers). If false, uses CLS token.',
      required: false,
      defaultValue: true,
    }),
  },
  async run({ propsValue }) {
    const texts = propsValue.texts as string[];
    const modelId = propsValue.modelId || 'all-minilm-l6-v2';
    const normalize = propsValue.normalize ?? true;
    const meanPool = propsValue.meanPool ?? true;

    if (!(await isSupported())) {
      return { success: false, supported: false, message: 'Local AI is not supported on this platform' };
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('texts must be a non-empty array of strings');
    }
    for (const t of texts) {
      if (typeof t !== 'string') {
        throw new Error('Each text must be a string');
      }
    }

    const result = await embedText(texts, modelId, normalize, meanPool);
    return result;
  },
});
