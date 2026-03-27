/**
 * Browser-safe utilities for normalizing paths and expressions.
 * These utilities do NOT use Node.js modules and are safe to use in browser environments.
 */

/**
 * Convert bracket notation to dot notation in expression paths.
 * This normalizes paths like `node.result[0].data` to `node.result.0.data`
 * which is the canonical format for habits YAML.
 * 
 * @param value - The string value containing potential bracket notation
 * @returns The string with bracket notation converted to dot notation
 * 
 * @example
 * normalizeBracketsToDots('{{node.result[0].data}}') // '{{node.result.0.data}}'
 * normalizeBracketsToDots('{{node[0][1]}}') // '{{node.0.1}}'
 * normalizeBracketsToDots('plain text') // 'plain text'
 */
export function normalizeBracketsToDots(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }
  // Replace [N] with .N where N is a number
  // Also handles ["N"] and ['N'] formats
  return value.replace(/\[['"]?(\d+)['"]?\]/g, '.$1');
}

/**
 * Recursively normalize bracket notation to dot notation in all string values
 * of an object or array.
 * 
 * @param obj - The object, array, or primitive to normalize
 * @returns The normalized value
 */
export function normalizePathsInObject(obj: any): any {
  if (typeof obj === 'string') {
    return normalizeBracketsToDots(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizePathsInObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = normalizePathsInObject(value);
    }
    return result;
  }
  
  return obj;
}
