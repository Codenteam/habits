/**
 * Pack Command Types
 *
 * Shared types for .habit packaging.
 */

export type PackFormat = 'habit';

export interface PackCommandOptions {
  /** Path to stack.yaml config file */
  config: string;
  /** Output path for the generated artifact */
  output?: string;
  /** Pack format (only 'habit' is supported) */
  format?: PackFormat;
  /** Custom app name (overrides stack.yaml name) */
  appName?: string;
  /** Include .env values in bundle (default: false for security) */
  includeEnv?: boolean;
  /** Skip generating cortex-bundle.js (use when cortex-bundle-all.js is pre-loaded) */
  skipBundle?: boolean;
}

export interface HabitData {
  name: string;
  slug: string;
  nodes: any[];
  edges?: any[];
  input?: any[];
  output?: Record<string, any>;
  description?: string;
  id?: string;
  /** The relative path from config directory (e.g., "habits/generate-recipe.yaml") */
  relativePath?: string;
  filename?: string;
  content?: string;
  [key: string]: any;
}

export interface ParsedConfig {
  workflows?: Array<{ id?: string; path: string; enabled?: boolean }>;
  server?: {
    port?: number;
    openapi?: boolean;
    webhookTimeout?: number;
    frontend?: string;
  };
  habits?: string[];
  version?: string;
  name?: string;
}

export interface PackResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  format: PackFormat;
  size?: number;
  platform?: string;
}
