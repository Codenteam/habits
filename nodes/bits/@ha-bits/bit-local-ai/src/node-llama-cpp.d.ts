// Type declarations for node-llama-cpp (v3.x)
// These are minimal declarations for the types we actually use

declare module 'node-llama-cpp' {
  export function getLlama(options?: LlamaOptions): Promise<Llama>;
  
  export interface LlamaOptions {
    gpu?: 'auto' | 'cuda' | 'vulkan' | 'metal' | false;
    logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  }
  
  export interface Llama {
    loadModel(options: LoadModelOptions): Promise<LlamaModel>;
  }
  
  export interface LoadModelOptions {
    modelPath: string;
    gpuLayers?: number | 'auto';
  }
  
  export interface LlamaModel {
    createContext(options?: CreateContextOptions): Promise<LlamaContext>;
    dispose(): Promise<void>;
  }
  
  export interface CreateContextOptions {
    contextSize?: number;
  }
  
  export interface LlamaContext {
    getSequence(): LlamaContextSequence;
    dispose(): Promise<void>;
  }
  
  export interface LlamaContextSequence {
    // Sequence methods (simplified)
  }
  
  export interface LlamaChatSessionOptions {
    contextSequence: LlamaContextSequence;
    systemPrompt?: string;
  }
  
  export class LlamaChatSession {
    constructor(options: LlamaChatSessionOptions);
    prompt(text: string, options?: LlamaChatSessionPromptOptions): Promise<string>;
  }
  
  export interface LlamaChatSessionPromptOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    onTextChunk?: (text: string) => void;
    signal?: AbortSignal;
  }
}
