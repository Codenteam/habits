/**
 * Tauri Driver Stub
 *
 * Communicates with tauri-plugin-local-ai for model installation and inference.
 * This module replaces lib/driver.ts in Tauri environments via package.json habits.stubs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const window: any;

import { ChatMessage, TextGenResult, InstallModelResult, EmbedResult, ModelRegistry } from '../common/common';

// ============================================================================
// Tauri Invoke Helper
// ============================================================================

const NOT_SUPPORTED_ERROR = 'Local AI is not supported on this platform';

function isPluginNotFoundError(msg: string): boolean {
  return msg.includes('Plugin not found') || msg.includes('not allowed');
}

function getInvoke(): <T>(cmd: string, args?: Record<string, unknown>) => Promise<T> {
  if (typeof window === 'undefined' || !window.__TAURI__) {
    throw new Error('Tauri environment not available');
  }

  const tauri = window.__TAURI__;
  const rawInvoke = tauri.core?.invoke?.bind(tauri.core) || tauri.invoke?.bind(tauri);

  if (!rawInvoke) {
    throw new Error('Tauri invoke function not found');
  }

  return async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    try {
      return await rawInvoke(cmd, args) as T;
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : (e?.message || String(e));
      // Plugin not compiled for this platform (e.g. Android)
      if (cmd.startsWith('plugin:local-ai|') && isPluginNotFoundError(msg)) {
        throw new Error(NOT_SUPPORTED_ERROR);
      }
      throw new Error(`Tauri: ${cmd} failed: ${msg}`);
    }
  };
}

// ============================================================================
// Platform Support Check
// ============================================================================

/**
 * Returns true if the local-ai plugin is available on this platform.
 * On Android the plugin is not compiled, so this returns false.
 */
export async function isSupported(): Promise<boolean> {
  console.log('[driver.isSupported] checking local-ai plugin availability...');
  try {
    const invoke = getInvoke();
    const dir = await invoke<string>('plugin:local-ai|ensure_models_dir');
    console.log('[driver.isSupported] plugin available, modelsDir:', dir);
    return true;
  } catch (e: any) {
    const msg = typeof e === 'string' ? e : (e?.message || String(e));
    console.log('[driver.isSupported] error:', msg);
    if (msg === NOT_SUPPORTED_ERROR || isPluginNotFoundError(msg)) {
      return false;
    }
    // Other errors (e.g. FS issues) still mean the plugin exists
    return true;
  }
}

// ============================================================================
// Install Model
// ============================================================================

/**
 * Install a model by ID (downloads all required files)
 */
export async function installModel(modelId: string): Promise<InstallModelResult> {
  const entry = ModelRegistry[modelId];
  if (!entry) {
    throw new Error(`Unknown model: ${modelId}. Available: ${Object.keys(ModelRegistry).join(', ')}`);
  }

  const invoke = getInvoke();

  // Get models directory from Tauri plugin
  const modelsDir = await invoke<string>('plugin:local-ai|ensure_models_dir');
  const modelDir = `${modelsDir}/${entry.type}/${modelId}`;
  const downloadedFiles: string[] = [];

  for (const [filename, url] of Object.entries(entry.files)) {
    const relativePath = `${entry.type}/${modelId}/${filename}`;
    const result = await invoke<{ success: boolean; path: string; error?: string }>(
      'plugin:local-ai|download_file',
      {
        url,
        relativePath,
        overwrite: true, // Always re-download
      }
    );

    if (!result.success) {
      throw new Error(`Failed to download ${filename}: ${result.error}`);
    }

    downloadedFiles.push(result.path);
  }

  return {
    success: true,
    modelId,
    files: downloadedFiles,
    modelsDir,
  };
}

// ============================================================================
// Generate Text
// ============================================================================

/**
 * Generate text from a prompt array
 */
export async function generateText(
  prompts: ChatMessage[],
  modelId: string = 'qwen2-0.5b',
  maxTokens: number = 256
): Promise<TextGenResult> {
  console.log('[driver.generateText] called, modelId:', modelId, 'maxTokens:', maxTokens);
  const invoke = getInvoke();

  // Get models directory
  console.log('[driver.generateText] calling ensure_models_dir...');
  const modelsDir = await invoke<string>('plugin:local-ai|ensure_models_dir');
  console.log('[driver.generateText] modelsDir:', modelsDir);

  const modelPath = `${modelsDir}/text-gen/${modelId}/model.gguf`;
  const tokenizerPath = `${modelsDir}/text-gen/${modelId}/tokenizer.json`;
  console.log('[driver.generateText] modelPath:', modelPath);
  console.log('[driver.generateText] tokenizerPath:', tokenizerPath);

  // Build prompt as plain text — the Rust core wraps it with ChatML tags
  // (<|im_start|>user\n...<|im_end|>\n<|im_start|>assistant\n), so we must
  // NOT add template tags here or the model sees double-wrapped gibberish.
  const parts: string[] = [];
  for (const msg of prompts) {
    if (msg.role === 'system') {
      parts.push(msg.content);
    } else if (msg.role === 'user') {
      parts.push(msg.content);
    } else if (msg.role === 'assistant') {
      parts.push(msg.content);
    }
  }
  const fullPrompt = parts.join('\n\n');
  console.log('[driver.generateText] prompt built (plain text for Rust ChatML wrapping), length:', fullPrompt.length);

  console.log('[driver.generateText] invoking plugin:local-ai|generate_text (this may take minutes on CPU)...');
  const result = await invoke<{ text: string; tokens_generated: number; device_used: string }>(
    'plugin:local-ai|generate_text',
    {
      modelPath,
      tokenizerPath,
      prompt: fullPrompt,
      maxTokens,
      temperature: 0.7,
      device: 'auto',
    }
  );
  console.log('[driver.generateText] generate_text returned, tokens:', result.tokens_generated, 'device:', result.device_used, 'text:', result.text.slice(0, 50));

  return {
    text: result.text,
    tokensGenerated: result.tokens_generated,
    model: modelId,
    deviceUsed: result.device_used,
  };
}

// ============================================================================
// Embed Text
// ============================================================================

/**
 * Embed a batch of texts using a local BERT-family model
 */
export async function embedText(
  texts: string[],
  modelId: string = 'all-minilm-l6-v2',
  normalize: boolean = true,
  meanPool: boolean = true
): Promise<EmbedResult> {
  const invoke = getInvoke();
  const modelsDir = await invoke<string>('plugin:local-ai|ensure_models_dir');

  const modelPath = `${modelsDir}/embedding/${modelId}/model.safetensors`;
  const tokenizerPath = `${modelsDir}/embedding/${modelId}/tokenizer.json`;
  const configPath = `${modelsDir}/embedding/${modelId}/config.json`;

  // Tauri command uses serde(rename_all = "camelCase") on JsDeviceType, so the
  // variant "Auto" serialises as the JSON string "auto" (lowercase). This is
  // intentionally different from the Node.js N-API driver which passes the
  // variant name "Auto" (title-case) directly to the native addon.
  const result = await invoke<{
    embeddings: number[][];
    dimensions: number;
    device_used: string;
  }>('plugin:local-ai|embed_texts', {
    modelPath,
    tokenizerPath,
    configPath,
    texts,
    normalize,
    meanPool,
    device: 'auto', // "auto" matches JsDeviceType::Auto via serde rename_all = "camelCase"
  });

  return {
    embeddings: result.embeddings,
    dimensions: result.dimensions,
    model: modelId,
    deviceUsed: result.device_used,
  };
}

/**
 * Get the models directory path
 */
export async function getModelsDir(): Promise<string> {
  const invoke = getInvoke();
  return invoke<string>('plugin:local-ai|ensure_models_dir');
}
