/**
 * Path utilities binding
 * 
 * Provides cross-platform path manipulation that works in both Node.js and Tauri/browser.
 * In Node.js, delegates to the native 'path' module.
 * In Tauri/browser, provides a pure JavaScript implementation.
 */

import { isNode } from './runtime';

// Conditionally import Node.js path module
let nodePath: typeof import('path') | null = null;

if (isNode()) {
  // Dynamic import for Node.js environment
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodePath = require('path');
}

/**
 * Platform-specific path separator
 */
export const sep = isNode() && nodePath ? nodePath.sep : '/';

/**
 * Platform-specific path delimiter (for PATH environment variable)
 */
export const delimiter = isNode() && nodePath ? nodePath.delimiter : ':';

/**
 * Join path segments together
 * 
 * @param segments - Path segments to join
 * @returns Joined path
 */
export function join(...segments: string[]): string {
  if (nodePath) {
    return nodePath.join(...segments);
  }
  
  // Browser/Tauri implementation
  const parts: string[] = [];
  
  for (const segment of segments) {
    if (!segment) continue;
    
    // Split by both / and \
    const segmentParts = segment.split(/[/\\]+/);
    
    for (const part of segmentParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.' && part !== '') {
        parts.push(part);
      }
    }
  }
  
  // Preserve leading slash if first segment had one
  const firstSegment = segments.find(s => s);
  const leadingSlash = firstSegment && firstSegment.startsWith('/') ? '/' : '';
  
  return leadingSlash + parts.join('/');
}

/**
 * Resolve path segments to an absolute path
 * 
 * @param segments - Path segments to resolve
 * @returns Absolute path
 */
export function resolve(...segments: string[]): string {
  if (nodePath) {
    return nodePath.resolve(...segments);
  }
  
  // Browser/Tauri implementation - use join and ensure absolute
  let resolvedPath = join(...segments);
  
  // If not absolute, we can't really resolve in browser
  // Return as-is (would need cwd from process binding)
  if (!resolvedPath.startsWith('/')) {
    resolvedPath = '/' + resolvedPath;
  }
  
  return resolvedPath;
}

/**
 * Get the directory name of a path
 * 
 * @param p - Path to get directory from
 * @returns Directory portion of the path
 */
export function dirname(p: string): string {
  if (nodePath) {
    return nodePath.dirname(p);
  }
  
  // Browser/Tauri implementation
  const normalized = p.replace(/\\/g, '/').replace(/\/+$/, '');
  const lastSlash = normalized.lastIndexOf('/');
  
  if (lastSlash === -1) {
    return '.';
  }
  if (lastSlash === 0) {
    return '/';
  }
  
  return normalized.slice(0, lastSlash);
}

/**
 * Get the base name of a path
 * 
 * @param p - Path to get base name from
 * @param ext - Optional extension to remove
 * @returns Base name of the path
 */
export function basename(p: string, ext?: string): string {
  if (nodePath) {
    return nodePath.basename(p, ext);
  }
  
  // Browser/Tauri implementation
  const normalized = p.replace(/\\/g, '/').replace(/\/+$/, '');
  const lastSlash = normalized.lastIndexOf('/');
  let name = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
  
  if (ext && name.endsWith(ext)) {
    name = name.slice(0, -ext.length);
  }
  
  return name;
}

/**
 * Get the extension of a path
 * 
 * @param p - Path to get extension from
 * @returns Extension of the path (including the dot)
 */
export function extname(p: string): string {
  if (nodePath) {
    return nodePath.extname(p);
  }
  
  // Browser/Tauri implementation
  const name = basename(p);
  const lastDot = name.lastIndexOf('.');
  
  if (lastDot <= 0) {
    return '';
  }
  
  return name.slice(lastDot);
}

/**
 * Check if a path is absolute
 * 
 * @param p - Path to check
 * @returns true if the path is absolute
 */
export function isAbsolute(p: string): boolean {
  if (nodePath) {
    return nodePath.isAbsolute(p);
  }
  
  // Browser/Tauri implementation
  // Unix: starts with /
  // Windows: starts with drive letter or UNC
  return p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('\\\\');
}

/**
 * Normalize a path
 * 
 * @param p - Path to normalize
 * @returns Normalized path
 */
export function normalize(p: string): string {
  if (nodePath) {
    return nodePath.normalize(p);
  }
  
  // Browser/Tauri implementation
  return join(p);
}

/**
 * Get relative path from one path to another
 * 
 * @param from - Source path
 * @param to - Destination path
 * @returns Relative path
 */
export function relative(from: string, to: string): string {
  if (nodePath) {
    return nodePath.relative(from, to);
  }
  
  // Browser/Tauri implementation
  const fromParts = from.replace(/\\/g, '/').split('/').filter(Boolean);
  const toParts = to.replace(/\\/g, '/').split('/').filter(Boolean);
  
  // Find common base
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }
  
  // Build relative path
  const upCount = fromParts.length - commonLength;
  const relativeParts = [
    ...Array(upCount).fill('..'),
    ...toParts.slice(commonLength)
  ];
  
  return relativeParts.join('/') || '.';
}

/**
 * Parse a path into its components
 * 
 * @param p - Path to parse
 * @returns Parsed path object
 */
export function parse(p: string): {
  root: string;
  dir: string;
  base: string;
  ext: string;
  name: string;
} {
  if (nodePath) {
    return nodePath.parse(p);
  }
  
  // Browser/Tauri implementation
  const dir = dirname(p);
  const base = basename(p);
  const ext = extname(p);
  const name = basename(p, ext);
  
  // Determine root
  let root = '';
  if (p.startsWith('/')) {
    root = '/';
  } else if (/^[a-zA-Z]:[\\/]/.test(p)) {
    root = p.slice(0, 3);
  }
  
  return { root, dir, base, ext, name };
}

/**
 * Format a path from its components
 * 
 * @param pathObject - Object with path components
 * @returns Formatted path
 */
export function format(pathObject: {
  root?: string;
  dir?: string;
  base?: string;
  ext?: string;
  name?: string;
}): string {
  if (nodePath) {
    return nodePath.format(pathObject);
  }
  
  // Browser/Tauri implementation
  const { dir, root, base, name, ext } = pathObject;
  const fileName = base || (name || '') + (ext || '');
  
  if (dir) {
    return dir + '/' + fileName;
  }
  if (root) {
    return root + fileName;
  }
  
  return fileName;
}

// Default export for compatibility
export default {
  sep,
  delimiter,
  join,
  resolve,
  dirname,
  basename,
  extname,
  isAbsolute,
  normalize,
  relative,
  parse,
  format,
};
