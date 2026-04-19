/**
 * Install Model Action
 *
 * Downloads model files by ID. Always re-downloads even if files exist.
 */

import { createAction, Property } from '@ha-bits/cortex-core';
import { installModel, isSupported } from '@ha-bits/bit-local-ai/driver';
import { ModelRegistry } from '../common/common';

// Build dropdown options from registry
const modelOptions = Object.entries(ModelRegistry).map(([id, entry]) => ({
  label: `${entry.label} (${entry.size})`,
  value: id,
}));

export const installModelAction = createAction({
  name: 'install-model',
  displayName: 'Install Model',
  description: 'Download a local AI model by ID. Always re-downloads files.',
  props: {
    modelId: Property.StaticDropdown({
      displayName: 'Model',
      description: 'The model to install',
      required: true,
      defaultValue: 'qwen2-0.5b',
      options: {
        disabled: false,
        options: modelOptions,
      },
    }),
  },
  async run({ propsValue }) {
    const { modelId } = propsValue;

    if (!(await isSupported())) {
      return { success: false, supported: false, message: 'Local AI is not supported on this platform' };
    }

    const result = await installModel(modelId);

    return result;
  },
});
