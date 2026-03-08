/**
 * Types for the Code Converter/Generator using GitHub Copilot SDK
 */

import { z } from "zod";

// =============================================================================
// Context Types - What the user provides to guide code generation/conversion
// =============================================================================

/**
 * Specification document that describes how code should be structured
 */
export interface Specification {
  /** Unique identifier for the specification */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description of the specification */
  description: string;
  /** The actual specification content (can be markdown, text, etc.) */
  content: string;
  /** Optional category for grouping specs */
  category?: string;
  /** Priority when multiple specs apply (higher = more important) */
  priority?: number;
}

/**
 * Instruction that provides guidelines for code generation/conversion
 */
export interface Instruction {
  /** Unique identifier for the instruction */
  id: string;
  /** Human-readable name */
  name: string;
  /** The instruction content */
  content: string;
  /** When this instruction applies (e.g., "always", "on-conversion", "on-generation") */
  appliesTo?: "always" | "conversion" | "generation";
  /** Optional examples showing correct application */
  examples?: string[];
}

/**
 * Type definition that code should adhere to
 */
export interface TypeDefinition {
  /** Name of the type */
  name: string;
  /** The TypeScript type definition as a string */
  definition: string;
  /** Description of what this type represents */
  description?: string;
  /** File path where this type is defined (for reference) */
  sourcePath?: string;
}

/**
 * Existing system code that provides context
 */
export interface SystemCode {
  /** File path or identifier */
  path: string;
  /** The actual code content */
  content: string;
  /** Programming language */
  language: string;
  /** Description of what this code does */
  description?: string;
}

/**
 * Complete context provided for code generation/conversion
 */
export interface ConversionContext {
  /** Specifications to follow */
  specifications: Specification[];
  /** Instructions for generation/conversion */
  instructions: Instruction[];
  /** Type definitions to adhere to */
  types: TypeDefinition[];
  /** Existing system code for reference */
  systemCode: SystemCode[];
  /** Additional context as free-form text */
  additionalContext?: string;
}

// =============================================================================
// Input Types - What the user wants to convert or generate
// =============================================================================

/**
 * Sample code that needs to be converted
 */
export interface SampleCode {
  /** The code content to convert */
  content: string;
  /** Source language of the code */
  sourceLanguage: string;
  /** Target language for conversion (defaults to TypeScript) */
  targetLanguage?: string;
  /** File path hint for naming */
  filePath?: string;
  /** Additional conversion instructions specific to this code */
  conversionNotes?: string;
}

/**
 * Prompt describing what code to generate
 */
export interface GenerationPrompt {
  /** Description of what to build */
  description: string;
  /** Target language (defaults to TypeScript) */
  language?: string;
  /** Desired file path(s) for output */
  outputPaths?: string[];
  /** Specific features or functionality to include */
  features?: string[];
  /** Constraints or limitations */
  constraints?: string[];
}

/**
 * The input for conversion/generation - either sample code or a prompt
 */
export type ConversionInput =
  | { type: "code"; code: SampleCode }
  | { type: "prompt"; prompt: GenerationPrompt };

// =============================================================================
// Output Types - The result of conversion/generation
// =============================================================================

/**
 * A single generated/converted file
 */
export interface GeneratedFile {
  /** File path for the output */
  path: string;
  /** Generated code content */
  content: string;
  /** Programming language */
  language: string;
  /** Explanation of what was generated/converted */
  explanation?: string;
}

/**
 * Result of a conversion/generation operation
 */
export interface ConversionResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Generated files */
  files: GeneratedFile[];
  /** Summary of what was done */
  summary: string;
  /** Any warnings or notes */
  warnings?: string[];
  /** Error message if unsuccessful */
  error?: string;
  /** Metadata about the operation */
  metadata: {
    /** Time taken in milliseconds */
    durationMs: number;
    /** Model used for generation */
    model?: string;
    /** Token usage if available */
    tokenUsage?: {
      input: number;
      output: number;
    };
  };
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration for the Copilot SDK client
 */
export interface CopilotConfig {
  /** Path to the Copilot CLI (optional, defaults to PATH lookup) */
  cliPath?: string;
  /** Model to use for generation */
  model?: string;
  /** Enable streaming output */
  streaming?: boolean;
  /** Log level */
  logLevel?: "debug" | "info" | "warning" | "error" | "none" | "all";
  /** Custom provider configuration (BYOK) */
  provider?: {
    type: "openai" | "azure" | "anthropic";
    baseUrl: string;
    apiKey?: string;
  };
}

/**
 * Full configuration for the converter
 */
export interface ConverterConfig {
  /** Copilot SDK configuration */
  copilot: CopilotConfig;
  /** Default target language */
  defaultLanguage?: string;
  /** Output directory for generated files */
  outputDir?: string;
  /** Whether to write files to disk automatically */
  autoWrite?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

// =============================================================================
// Zod Schemas for validation
// =============================================================================

export const SpecificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  content: z.string(),
  category: z.string().optional(),
  priority: z.number().optional(),
});

export const InstructionSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  appliesTo: z.enum(["always", "conversion", "generation"]).optional(),
  examples: z.array(z.string()).optional(),
});

export const TypeDefinitionSchema = z.object({
  name: z.string(),
  definition: z.string(),
  description: z.string().optional(),
  sourcePath: z.string().optional(),
});

export const SystemCodeSchema = z.object({
  path: z.string(),
  content: z.string(),
  language: z.string(),
  description: z.string().optional(),
});

export const ConversionContextSchema = z.object({
  specifications: z.array(SpecificationSchema),
  instructions: z.array(InstructionSchema),
  types: z.array(TypeDefinitionSchema),
  systemCode: z.array(SystemCodeSchema),
  additionalContext: z.string().optional(),
});

export const SampleCodeSchema = z.object({
  content: z.string(),
  sourceLanguage: z.string(),
  targetLanguage: z.string().optional(),
  filePath: z.string().optional(),
  conversionNotes: z.string().optional(),
});

export const GenerationPromptSchema = z.object({
  description: z.string(),
  language: z.string().optional(),
  outputPaths: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
});

export const ConversionInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("code"), code: SampleCodeSchema }),
  z.object({ type: z.literal("prompt"), prompt: GenerationPromptSchema }),
]);

export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  language: z.string(),
  explanation: z.string().optional(),
});

export const ConversionResultSchema = z.object({
  success: z.boolean(),
  files: z.array(GeneratedFileSchema),
  summary: z.string(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
  metadata: z.object({
    durationMs: z.number(),
    model: z.string().optional(),
    tokenUsage: z
      .object({
        input: z.number(),
        output: z.number(),
      })
      .optional(),
  }),
});
