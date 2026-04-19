/**
 * Common types and constants for bit-local-ai
 */

/**
 * Chat message for prompt array
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Text generation result
 */
export interface TextGenResult {
  text: string;
  tokensGenerated: number;
  model: string;
  deviceUsed: string;
}

/**
 * Model installation result
 */
export interface InstallModelResult {
  success: boolean;
  modelId: string;
  files: string[];
  modelsDir: string;
}

/**
 * Model registry entry
 */
export interface ModelRegistryEntry {
  label: string;
  type: 'text-gen';
  size: string;
  files: Record<string, string>;
}

/**
 * Registry of known models with their download URLs
 */
export const ModelRegistry: Record<string, ModelRegistryEntry> = {
  'tiny-llm': {
    label: 'Tiny LLM',
    type: 'text-gen',
    size: '~50MB',
    files: {
      'model.gguf': 'https://huggingface.co/mradermacher/Tiny-LLM-GGUF/resolve/main/Tiny-LLM.Q2_K.gguf',
    },
  },
  'qwen2-0.5b': {
    label: 'Qwen2 0.5B',
    type: 'text-gen',
    size: '~400MB',
    files: {
      'model.gguf': 'https://huggingface.co/Qwen/Qwen2-0.5B-Instruct-GGUF/resolve/main/qwen2-0_5b-instruct-q4_0.gguf',
      'tokenizer.json': 'https://huggingface.co/Qwen/Qwen2-0.5B-Instruct/resolve/main/tokenizer.json',
    },
  },
  'qwen2.5-0.5b': {
    label: 'Qwen 2.5 0.5B',
    type: 'text-gen',
    size: '~400MB',
    files: {
      'model.gguf': 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
      'tokenizer.json': 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer.json',
    },
  },
  'llama-3.2-1b': {
    label: 'Llama 3.2 1B',
    type: 'text-gen',
    size: '~1.3GB',
    files: {
      'model.gguf': 'https://huggingface.co/lmstudio-community/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    },
  },
  'llama-3.2-3b': {
    label: 'Llama 3.2 3B',
    type: 'text-gen',
    size: '~2.5GB',
    files: {
      'model.gguf': 'https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    },
  },
};
