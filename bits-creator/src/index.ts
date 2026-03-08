/**
 * @bits/creator - Code Converter/Generator using GitHub Copilot SDK
 *
 * This package provides tools for converting existing code or generating new code
 * that adheres to specifications, instructions, type definitions, and existing system code.
 *
 * @example
 * ```typescript
 * import { createConverter, type ConversionContext, type ConversionInput } from '@bits/creator';
 *
 * // Define your context
 * const context: ConversionContext = {
 *   specifications: [...],
 *   instructions: [...],
 *   types: [...],
 *   systemCode: [...],
 * };
 *
 * // Convert existing code
 * const converter = createConverter({ verbose: true });
 * const result = await converter.process(context, {
 *   type: 'code',
 *   code: {
 *     content: 'function hello() { ... }',
 *     sourceLanguage: 'javascript',
 *     targetLanguage: 'typescript',
 *   },
 * });
 *
 * // Or generate new code
 * const result = await converter.process(context, {
 *   type: 'prompt',
 *   prompt: {
 *     description: 'Create a user service with CRUD operations',
 *     features: ['validation', 'error handling'],
 *   },
 * });
 *
 * await converter.destroy();
 * ```
 */

// Export the main converter class and factory
export { LogicConverter, createConverter } from "./logic-converter.js";

// Export all types
export type {
  // Context types
  ConversionContext,
  Specification,
  Instruction,
  TypeDefinition,
  SystemCode,

  // Input types
  ConversionInput,
  SampleCode,
  GenerationPrompt,

  // Output types
  ConversionResult,
  GeneratedFile,

  // Configuration types
  CopilotConfig,
  ConverterConfig,
} from "./types.js";

// Export Zod schemas for validation
export {
  SpecificationSchema,
  InstructionSchema,
  TypeDefinitionSchema,
  SystemCodeSchema,
  ConversionContextSchema,
  SampleCodeSchema,
  GenerationPromptSchema,
  ConversionInputSchema,
  GeneratedFileSchema,
  ConversionResultSchema,
} from "./types.js";

// Export directory loaders
export {
  loadContextFromDirectories,
  loadSpecsFromDirectory,
  loadInstructionsFromDirectory,
  loadTypesFromDirectory,
  loadCodeFromDirectory,
  loadInputCode,
  getAllFiles,
  detectLanguage,
  type DirectoryConfig,
} from "./loaders.js";

// =============================================================================
// Convenience builders for constructing context objects
// =============================================================================

import type {
  ConversionContext,
  Specification,
  Instruction,
  TypeDefinition,
  SystemCode,
  SampleCode,
  GenerationPrompt,
  ConversionInput,
} from "./types.js";

/**
 * Builder for creating ConversionContext objects fluently
 */
export class ContextBuilder {
  private specs: Specification[] = [];
  private insts: Instruction[] = [];
  private typesDef: TypeDefinition[] = [];
  private sysCode: SystemCode[] = [];
  private additionalCtx?: string;

  /**
   * Add a specification to the context
   */
  addSpecification(spec: Specification): this {
    this.specs.push(spec);
    return this;
  }

  /**
   * Add multiple specifications to the context
   */
  addSpecifications(specs: Specification[]): this {
    this.specs.push(...specs);
    return this;
  }

  /**
   * Add a specification from content with auto-generated id
   */
  spec(
    name: string,
    description: string,
    content: string,
    options?: { category?: string; priority?: number }
  ): this {
    this.specs.push({
      id: `spec-${this.specs.length + 1}`,
      name,
      description,
      content,
      ...options,
    });
    return this;
  }

  /**
   * Add an instruction to the context
   */
  addInstruction(instruction: Instruction): this {
    this.insts.push(instruction);
    return this;
  }

  /**
   * Add multiple instructions to the context
   */
  addInstructions(instructions: Instruction[]): this {
    this.insts.push(...instructions);
    return this;
  }

  /**
   * Add an instruction with auto-generated id
   */
  instruction(
    name: string,
    content: string,
    options?: {
      appliesTo?: "always" | "conversion" | "generation";
      examples?: string[];
    }
  ): this {
    this.insts.push({
      id: `inst-${this.insts.length + 1}`,
      name,
      content,
      ...options,
    });
    return this;
  }

  /**
   * Add a type definition to the context
   */
  addType(typeDef: TypeDefinition): this {
    this.typesDef.push(typeDef);
    return this;
  }

  /**
   * Add multiple type definitions to the context
   */
  addTypes(types: TypeDefinition[]): this {
    this.typesDef.push(...types);
    return this;
  }

  /**
   * Add a type definition
   */
  type(
    name: string,
    definition: string,
    options?: { description?: string; sourcePath?: string }
  ): this {
    this.typesDef.push({ name, definition, ...options });
    return this;
  }

  /**
   * Add system code to the context
   */
  addSystemCode(code: SystemCode): this {
    this.sysCode.push(code);
    return this;
  }

  /**
   * Add multiple system code files to the context
   */
  addSystemCodes(codes: SystemCode[]): this {
    this.sysCode.push(...codes);
    return this;
  }

  /**
   * Add system code
   */
  code(
    path: string,
    content: string,
    language: string,
    description?: string
  ): this {
    this.sysCode.push({ path, content, language, description });
    return this;
  }

  /**
   * Set additional context
   */
  additionalContext(context: string): this {
    this.additionalCtx = context;
    return this;
  }

  /**
   * Build the ConversionContext object
   */
  build(): ConversionContext {
    return {
      specifications: this.specs,
      instructions: this.insts,
      types: this.typesDef,
      systemCode: this.sysCode,
      additionalContext: this.additionalCtx,
    };
  }
}

/**
 * Create a new ContextBuilder for fluent context creation
 */
export function buildContext(): ContextBuilder {
  return new ContextBuilder();
}

/**
 * Create a code conversion input
 */
export function codeInput(code: SampleCode): ConversionInput {
  return { type: "code", code };
}

/**
 * Create a code conversion input from raw values
 */
export function convertCode(
  content: string,
  sourceLanguage: string,
  options?: {
    targetLanguage?: string;
    filePath?: string;
    conversionNotes?: string;
  }
): ConversionInput {
  return {
    type: "code",
    code: {
      content,
      sourceLanguage,
      ...options,
    },
  };
}

/**
 * Create a generation prompt input
 */
export function promptInput(prompt: GenerationPrompt): ConversionInput {
  return { type: "prompt", prompt };
}

/**
 * Create a generation prompt input from raw values
 */
export function generateCode(
  description: string,
  options?: {
    language?: string;
    outputPaths?: string[];
    features?: string[];
    constraints?: string[];
  }
): ConversionInput {
  return {
    type: "prompt",
    prompt: {
      description,
      ...options,
    },
  };
}
