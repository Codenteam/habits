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
