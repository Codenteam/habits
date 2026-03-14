/**
 * Utility functions for extracting and working with Habits variables
 * 
 * This module provides functions to extract variable references from workflows.
 * Variables use the {{habits.*}} syntax:
 * - {{habits.input.fieldName}} - Input from request body/CLI args
 * - {{habits.headers.headerName}} - HTTP request headers
 * - {{habits.cookies.cookieName}} - HTTP cookies
 * - {{habits.env.VAR_NAME}} - Environment variables
 */

/**
 * Schema for extracted habits context references
 */
export interface HabitsContextSchema {
  input: Record<string, { type: string; description: string; required: boolean }>;
  headers: Record<string, { type: string; description: string; required: boolean }>;
  cookies: Record<string, { type: string; description: string; required: boolean }>;
}

/**
 * Extract all habits context references from an object recursively
 * Searches for patterns like {{habits.input.fieldName}}, {{habits.headers.x}}, etc.
 */
export function extractHabitsReferences(obj: any, refs: Set<string>): void {
  if (typeof obj === 'string') {
    const regex = /\{\{habits\.(input|headers|cookies)\.([a-zA-Z0-9_]+)\}\}/g;
    let match;
    while ((match = regex.exec(obj)) !== null) {
      refs.add(`${match[1]}.${match[2]}`);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      extractHabitsReferences(item, refs);
    }
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      extractHabitsReferences(obj[key], refs);
    }
  }
}

/**
 * Parse an object (like a workflow or node list) to extract its expected habits context schema
 */
export function extractHabitsSchema(obj: any): HabitsContextSchema {
  const refs = new Set<string>();
  extractHabitsReferences(obj, refs);

  const schema: HabitsContextSchema = {
    input: {},
    headers: {},
    cookies: {},
  };

  for (const ref of refs) {
    const [category, field] = ref.split('.');
    if (category === 'input' || category === 'headers' || category === 'cookies') {
      schema[category][field] = {
        type: 'string',
        description: `${field} parameter used in the workflow`,
        required: true,
      };
    }
  }

  return schema;
}

/**
 * Extract just the input field names from an object
 * This is a convenience function that returns only the input field names as an array
 */
export function extractInputFields(obj: any): string[] {
  const schema = extractHabitsSchema(obj);
  return Object.keys(schema.input);
}

/**
 * Extract environment variable names from an object
 * Searches for {{habits.env.VAR_NAME}} patterns
 */
export function extractEnvFields(obj: any): string[] {
  const envVars = new Set<string>();
  
  const search = (value: any) => {
    if (typeof value === 'string') {
      const regex = /\{\{habits\.env\.([A-Z0-9_]+)\}\}/gi;
      let match;
      while ((match = regex.exec(value)) !== null) {
        envVars.add(match[1].toUpperCase());
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        search(item);
      }
    } else if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        search(value[key]);
      }
    }
  };
  
  search(obj);
  return Array.from(envVars);
}

// =============================================================================
// Variable Token Parsing (Shared between UI components)
// =============================================================================

/**
 * Types of variable tokens that can appear in {{...}} syntax
 */
export type VariableTokenType = 
  | 'input' 
  | 'headers' 
  | 'request' 
  | 'env' 
  | 'context' 
  | 'function' 
  | 'cookies' 
  | 'node' 
  | 'unknown';

/**
 * A parsed token segment (variable reference)
 */
export interface TokenSegment {
  type: 'token';
  tokenType: VariableTokenType;
  category: string;
  name: string;
  fullValue: string;
}

/**
 * A plain text segment
 */
export interface TextSegment {
  type: 'text';
  content: string;
}

/**
 * A segment is either text or a token
 */
export type VariableSegment = TextSegment | TokenSegment;

/**
 * Style configuration for variable tokens (for UI rendering)
 */
export const VARIABLE_TOKEN_STYLES: Record<VariableTokenType, { colorClass: string; bgClass: string; borderClass: string }> = {
  input: { colorClass: 'text-blue-400', bgClass: 'bg-blue-900/30', borderClass: 'border-blue-700/50' },
  headers: { colorClass: 'text-purple-400', bgClass: 'bg-purple-900/30', borderClass: 'border-purple-700/50' },
  request: { colorClass: 'text-blue-400', bgClass: 'bg-blue-900/30', borderClass: 'border-blue-700/50' },
  env: { colorClass: 'text-amber-400', bgClass: 'bg-amber-900/30', borderClass: 'border-amber-700/50' },
  context: { colorClass: 'text-cyan-400', bgClass: 'bg-cyan-900/30', borderClass: 'border-cyan-700/50' },
  function: { colorClass: 'text-cyan-400', bgClass: 'bg-cyan-900/30', borderClass: 'border-cyan-700/50' },
  cookies: { colorClass: 'text-orange-400', bgClass: 'bg-orange-900/30', borderClass: 'border-orange-700/50' },
  node: { colorClass: 'text-green-400', bgClass: 'bg-green-900/30', borderClass: 'border-green-700/50' },
  unknown: { colorClass: 'text-gray-400', bgClass: 'bg-gray-800/30', borderClass: 'border-gray-700/50' },
};

/**
 * Regex to match variable patterns in text:
 * - {{habits.category.name}} - System variables (input, headers, env, etc.)  
 * - {{nodeName.property}} - Node reference with property
 * - {{simple-variable}} - Simple variable reference
 */
export const VARIABLE_PATTERN_REGEX = /\{\{habits\.(input|headers|request|env|context|function|cookies)\.([^}]+)\}\}|\{\{([a-zA-Z0-9_-]+)\.([^}]+)\}\}|\{\{([a-zA-Z0-9_-]+)\}\}/g;

/**
 * Parse text containing variable patterns into segments.
 * Each segment is either plain text or a parsed variable token.
 * 
 * @example
 * parseVariableSegments("Hello {{habits.input.name}}!")
 * // Returns: [
 * //   { type: 'text', content: 'Hello ' },
 * //   { type: 'token', tokenType: 'input', category: 'input', name: 'name', fullValue: '{{habits.input.name}}' },
 * //   { type: 'text', content: '!' }
 * // ]
 */
export function parseVariableSegments(text: string): VariableSegment[] {
  if (!text || typeof text !== 'string') return [];
  
  const segments: VariableSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  // Create a new regex instance to avoid state issues with global regex
  const regex = new RegExp(VARIABLE_PATTERN_REGEX.source, 'g');
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    
    // Parse the variable pattern
    if (match[1]) {
      // habits.* pattern (e.g., {{habits.input.name}})
      segments.push({
        type: 'token',
        tokenType: match[1] as VariableTokenType,
        category: match[1],
        name: match[2],
        fullValue: match[0],
      });
    } else if (match[3] && match[4]) {
      // Node reference pattern with property (e.g., {{nodeName.output}})
      segments.push({
        type: 'token',
        tokenType: 'node',
        category: match[3],
        name: match[4],
        fullValue: match[0],
      });
    } else if (match[5]) {
      // Simple variable pattern (e.g., {{old-node}})
      segments.push({
        type: 'token',
        tokenType: 'node',
        category: match[5],
        name: 'output',
        fullValue: match[0],
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  
  return segments;
}

/**
 * Check if text contains any variable patterns
 */
export function containsVariables(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const regex = new RegExp(VARIABLE_PATTERN_REGEX.source, 'g');
  return regex.test(text);
}
