/**
 * @ha-bits/bit-local-ai driver
 * 
 * Node.js implementation using node-llama-cpp.
 * This file is stubbed for Tauri with stubs/tauri-driver.js
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { createWriteStream } from 'fs';
import type { ChatMessage, ModelInfo, ChatCompletionResult } from '@ha-bits/bit-ai';

// Lazy-loaded node-llama-cpp to avoid initialization issues
let llamaModule: typeof import('node-llama-cpp') | null = null;
let llamaInstance: any = null;

// Model cache to avoid reloading
const loadedModels: Map<string, any> = new Map();
const modelContexts: Map<string, any> = new Map();

/**
 * Get the default models directory
 */
export function getModelsDirectory(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.habits', 'models');
}

/**
 * Ensure the models directory exists
 */
export async function ensureModelsDirectory(): Promise<string> {
  const dir = getModelsDirectory();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Dynamic import that survives CJS transpilation by tsx/esbuild
 */
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;

/**
 * Load the node-llama-cpp module lazily
 */
async function getLlama() {
  if (!llamaModule) {
    llamaModule = await dynamicImport('node-llama-cpp');
  }
  if (!llamaInstance) {
    llamaInstance = await llamaModule!.getLlama();
  }
  return { module: llamaModule!, llama: llamaInstance };
}

/**
 * Resolve a model identifier to a full path.
 * Accepts:
 * - Full path: /path/to/model.gguf
 * - Home path: ~/.habits/models/model.gguf
 * - Model name: qwen2.5-0.5b (resolves to ~/.habits/models/qwen2.5-0.5b.gguf)
 * - Model name with extension: qwen2.5-0.5b.gguf
 */
export async function resolveModelPath(modelInput: string): Promise<string> {
  // If it's a full path or home path, resolve it
  if (modelInput.startsWith('/') || modelInput.startsWith('~')) {
    return path.resolve(modelInput.replace(/^~/, os.homedir()));
  }
  
  // Otherwise, treat as model name - look in default models directory
  const modelsDir = getModelsDirectory();
  
  // Add .gguf extension if not present
  const modelName = modelInput.endsWith('.gguf') ? modelInput : `${modelInput}.gguf`;
  const modelPath = path.join(modelsDir, modelName);
  
  // Check if model exists
  try {
    await fs.access(modelPath);
    return modelPath;
  } catch {
    // Try to find a similar model (case-insensitive, partial match)
    try {
      const files = await fs.readdir(modelsDir);
      const match = files.find(f => 
        f.toLowerCase().includes(modelInput.toLowerCase()) && f.endsWith('.gguf')
      );
      if (match) {
        return path.join(modelsDir, match);
      }
    } catch {
      // Directory doesn't exist
    }
    throw new Error(`Model not found: ${modelInput}. Install models to ${modelsDir}`);
  }
}

/**
 * Load a model from path, with caching
 */
export async function loadModel(modelPath: string): Promise<any> {
  const resolvedPath = await resolveModelPath(modelPath);
  
  // Check cache
  if (loadedModels.has(resolvedPath)) {
    return loadedModels.get(resolvedPath);
  }
  
  // Verify file exists
  try {
    await fs.access(resolvedPath);
  } catch {
    throw new Error(`Model file not found: ${resolvedPath}`);
  }
  
  const { llama } = await getLlama();
  
  console.log(`[LocalAI] Loading model: ${resolvedPath}`);
  const model = await llama.loadModel({
    modelPath: resolvedPath,
  });
  
  loadedModels.set(resolvedPath, model);
  console.log(`[LocalAI] Model loaded successfully`);
  
  return model;
}

/**
 * Get or create a context for a model
 */
async function getModelContext(model: any, modelPath: string): Promise<any> {
  if (modelContexts.has(modelPath)) {
    return modelContexts.get(modelPath);
  }
  
  const context = await model.createContext();
  modelContexts.set(modelPath, context);
  return context;
}

/**
 * Chat completion interface
 */
export interface ChatParams {
  modelPath: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  gpuLayers?: number;
  stop?: string[];
}

/**
 * Run chat completion with a local model
 */
export async function chat(params: ChatParams): Promise<ChatCompletionResult> {
  const {
    modelPath,
    messages,
    systemPrompt,
    temperature = 0.7,
    maxTokens = 2048,
    topP = 1,
  } = params;

  const { module: llamaModule } = await getLlama();
  const model = await loadModel(modelPath);
  
  // Create a fresh context for each request to avoid sequence exhaustion
  const context = await model.createContext();
  const sequence = context.getSequence();
  
  // Create a chat session
  const session = new llamaModule.LlamaChatSession({
    contextSequence: sequence,
  });
  
  // Build prompt from messages
  let fullPrompt = '';
  
  // Add system prompt if provided
  if (systemPrompt) {
    fullPrompt += `System: ${systemPrompt}\n\n`;
  }
  
  // Add message history
  for (const msg of messages) {
    if (msg.role === 'system') {
      // System messages already handled
      continue;
    } else if (msg.role === 'user') {
      fullPrompt += `User: ${msg.content}\n`;
    } else if (msg.role === 'assistant') {
      fullPrompt += `Assistant: ${msg.content}\n`;
    }
  }
  
  // Get the last user message as the prompt
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const prompt = lastUserMessage?.content || '';
  
  console.log(`[LocalAI] Generating response (temp=${temperature}, maxTokens=${maxTokens})`);
  
  try {
    // Generate response
    const response = await session.prompt(prompt, {
      maxTokens,
      temperature,
      topP,
    });
    
    const responseMessage: ChatMessage = {
      role: 'assistant',
      content: response,
    };
    
    // Estimate token counts (rough approximation)
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(response.length / 4);
    
    return {
      message: responseMessage,
      content: response,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason: 'stop',
      model: path.basename(modelPath),
    };
  } finally {
    // Clean up to avoid sequence exhaustion
    await context.dispose();
  }
}

/**
 * List local models in the models directory
 */
export async function listLocalModels(directory?: string): Promise<ModelInfo[]> {
  // Ignore unresolved template expressions
  const cleanDir = directory && !directory.includes('habits.input') ? directory.replace(/^~/, os.homedir()) : undefined;
  const modelsDir = cleanDir || getModelsDirectory();
  
  try {
    await fs.access(modelsDir);
  } catch {
    // Directory doesn't exist, return empty
    return [];
  }
  
  const files = await fs.readdir(modelsDir);
  const models: ModelInfo[] = [];
  
  for (const file of files) {
    if (file.endsWith('.gguf')) {
      const filePath = path.join(modelsDir, file);
      const stats = await fs.stat(filePath);
      
      // Parse model name from filename
      const name = file.replace('.gguf', '').replace(/-/g, ' ');
      
      models.push({
        id: file,
        name: name,
        path: filePath,
        size: stats.size,
        provider: 'local',
        supports: {
          chat: true,
          completion: true,
        },
      });
    }
  }
  
  return models;
}

/**
 * Download a file from URL with progress
 */
async function downloadFile(url: string, destPath: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;
      
      const file = createWriteStream(destPath);
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0 && onProgress) {
          const percent = Math.round((downloadedSize / totalSize) * 100);
          onProgress(percent);
        }
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(destPath).catch(() => {});
        reject(err);
      });
    });
    
    request.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Install a model from URL
 */
export async function installModel(params: {
  modelUrl: string;
  modelName: string;
  destination?: string;
  onProgress?: (percent: number) => void;
}): Promise<{ success: boolean; path?: string; size?: number; error?: string }> {
  const { modelUrl, modelName, destination, onProgress } = params;
  
  try {
    // Ensure destination directory exists - expand tilde if present
    let destDir: string;
    if (destination) {
      destDir = destination.replace(/^~/, os.homedir());
      await fs.mkdir(destDir, { recursive: true });
    } else {
      destDir = await ensureModelsDirectory();
    }
    
    // Generate filename
    let fileName = modelName;
    if (!fileName.endsWith('.gguf')) {
      fileName += '.gguf';
    }
    
    const destPath = path.join(destDir, fileName);
    
    console.log(`[LocalAI] Downloading model: ${modelUrl}`);
    console.log(`[LocalAI] Destination: ${destPath}`);
    
    await downloadFile(modelUrl, destPath, (percent) => {
      console.log(`[LocalAI] Download progress: ${percent}%`);
      if (onProgress) onProgress(percent);
    });
    
    // Get file size
    const stats = await fs.stat(destPath);
    
    console.log(`[LocalAI] Model installed successfully: ${destPath} (${Math.round(stats.size / 1024 / 1024)}MB)`);
    
    return {
      success: true,
      path: destPath,
      size: stats.size,
    };
  } catch (error: any) {
    console.error(`[LocalAI] Installation failed:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Unload a model from memory
 */
export async function unloadModel(modelPath: string): Promise<void> {
  const resolvedPath = path.resolve(modelPath.replace(/^~/, os.homedir()));
  
  // Remove from context cache
  if (modelContexts.has(resolvedPath)) {
    const context = modelContexts.get(resolvedPath);
    // Context cleanup if available
    modelContexts.delete(resolvedPath);
  }
  
  // Remove from model cache
  if (loadedModels.has(resolvedPath)) {
    const model = loadedModels.get(resolvedPath);
    // Model cleanup if available
    loadedModels.delete(resolvedPath);
  }
  
  console.log(`[LocalAI] Model unloaded: ${resolvedPath}`);
}

/**
 * Get model info without loading
 */
export async function getModelInfo(modelPath: string): Promise<ModelInfo | null> {
  const resolvedPath = path.resolve(modelPath.replace(/^~/, os.homedir()));
  
  try {
    const stats = await fs.stat(resolvedPath);
    const name = path.basename(resolvedPath, '.gguf');
    
    return {
      id: path.basename(resolvedPath),
      name: name.replace(/-/g, ' '),
      path: resolvedPath,
      size: stats.size,
      provider: 'local',
      supports: {
        chat: true,
        completion: true,
      },
    };
  } catch {
    return null;
  }
}
