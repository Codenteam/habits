/**
 * Local AI Driver (Node.js)
 *
 * Communicates with @local-ai/node native addon.
 * In Tauri environments, this module is replaced by stubs/driver.ts via package.json habits.stubs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: any;
declare const require: (id: string) => any;
declare const console: { log: (...args: any[]) => void; error: (...args: any[]) => void };

import { ChatMessage, TextGenResult, InstallModelResult, ModelRegistry } from './common/common';

// ============================================================================
// Node.js Native Addon
// ============================================================================

let _nodeAddon: any = null;

function getNodeAddon(): any {
  if (_nodeAddon) return _nodeAddon;

  const paths = [
    '@local-ai/node',
    process.env?.LOCAL_AI_NODE_PATH,
  ].filter(Boolean);

  for (const modulePath of paths) {
    try {
      _nodeAddon = require(modulePath as string);
      console.log(`[driver] Loaded @local-ai/node from: ${modulePath}`);
      return _nodeAddon;
    } catch {
      // Continue trying
    }
  }

  throw new Error(
    '@local-ai/node native addon not available. ' +
    'Install it with: npm install @local-ai/node'
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getModelsBasePath(): string {
  const homeDir = process.env?.HOME || '/tmp';
  return process.env?.LOCAL_AI_MODELS_PATH || `${homeDir}/.habits/models`;
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  const https = require('https');
  const http = require('http');

  // Ensure directory exists
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = (currentUrl: string) => {
      protocol.get(currentUrl, (response: any) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        const file = fs.createWriteStream(destPath);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
        file.on('error', (err: any) => {
          fs.unlink(destPath, () => {}); // Delete partial file
          reject(err);
        });
      }).on('error', reject);
    };

    request(url);
  });
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

  const basePath = getModelsBasePath();
  const modelDir = `${basePath}/${entry.type}/${modelId}`;
  const downloadedFiles: string[] = [];

  console.log(`[install-model] Installing ${modelId} to ${modelDir}`);

  for (const [filename, url] of Object.entries(entry.files)) {
    const destPath = `${modelDir}/${filename}`;
    console.log(`[install-model] Downloading ${filename}...`);
    await downloadFile(url, destPath);
    downloadedFiles.push(destPath);
    console.log(`[install-model] Downloaded ${filename}`);
  }

  return {
    success: true,
    modelId,
    files: downloadedFiles,
    modelsDir: basePath,
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
  modelId: string = 'qwen2-0.5b'
): Promise<TextGenResult> {
  const native = getNodeAddon();
  const basePath = getModelsBasePath();

  const modelPath = `${basePath}/text-gen/${modelId}/model.gguf`;
  const tokenizerPath = `${basePath}/text-gen/${modelId}/tokenizer.json`;

  // Build prompt as plain text — the native addon wraps it with ChatML tags
  // (<|im_start|>user\n...<|im_end|>\n<|im_start|>assistant\n), so we must
  // NOT add template tags here or the model sees double-wrapped gibberish.
  const parts: string[] = [];
  for (const msg of prompts) {
    parts.push(msg.content);
  }
  const fullPrompt = parts.join('\n\n');

  const result = await native.generateText(
    modelPath,
    tokenizerPath,
    fullPrompt,
    64,   // maxTokens
    0.7,  // temperature
    undefined, // seed
    'cpu'  // device
  );

  return {
    text: result.text,
    tokensGenerated: result.tokensGenerated || result.tokens_generated,
    model: modelId,
    deviceUsed: result.deviceUsed || result.device_used || 'cpu',
  };
}

/**
 * Get the models directory path
 */
export async function getModelsDir(): Promise<string> {
  return getModelsBasePath();
}

/**
 * Returns true if local-ai is available in this environment.
 * In Node.js, checks whether the native addon can be loaded.
 */
export async function isSupported(): Promise<boolean> {
  try {
    getNodeAddon();
    return true;
  } catch {
    return false;
  }
}
