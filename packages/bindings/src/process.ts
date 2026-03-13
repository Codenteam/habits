/**
 * Process binding
 * 
 * Provides cross-platform process information and control that works in both Node.js and Tauri.
 * In Node.js, delegates to the native 'process' global.
 * In Tauri, uses globalThis.__TAURI__.process (requires withGlobalTauri: true).
 */

import { isTauri, isNode, assertRuntime, getTauriPlugin, type TauriProcessPlugin } from './runtime';

/**
 * Get Tauri process plugin from globalThis.__TAURI__
 */
function getTauriProcess(): TauriProcessPlugin {
  return getTauriPlugin('process');
}

// ============================================================================
// Environment Variables
// ============================================================================

/**
 * Get an environment variable
 * 
 * @param key - Environment variable name
 * @returns Value or undefined if not set
 */
export function getEnv(key: string): string | undefined {
  if (isNode()) {
    return process.env[key];
  }
  
  // In Tauri/browser, env vars aren't directly accessible
  // They should be injected at build time or via config
  return undefined;
}

/**
 * Get all environment variables (Node.js only)
 * 
 * @returns Object with all environment variables
 */
export function getAllEnv(): Record<string, string | undefined> {
  assertRuntime('getAllEnv', ['node']);
  return { ...process.env };
}

/**
 * Set an environment variable (Node.js only, in-process only)
 * 
 * @param key - Environment variable name
 * @param value - Value to set
 */
export function setEnv(key: string, value: string): void {
  assertRuntime('setEnv', ['node']);
  process.env[key] = value;
}

// ============================================================================
// Current Working Directory
// ============================================================================

/**
 * Get the current working directory
 * 
 * @returns Current working directory path
 */
export async function cwd(): Promise<string> {
  if (isNode()) {
    return process.cwd();
  }
  
  // In Tauri, we can't easily get cwd
  // Return a sensible default or use app data dir
  return '/';
}

/**
 * Get the current working directory synchronously (Node.js only)
 * 
 * @returns Current working directory path
 */
export function cwdSync(): string {
  assertRuntime('cwdSync', ['node']);
  return process.cwd();
}

/**
 * Change the current working directory (Node.js only)
 * 
 * @param dir - New directory path
 */
export function chdir(dir: string): void {
  assertRuntime('chdir', ['node']);
  process.chdir(dir);
}

// ============================================================================
// Process Information
// ============================================================================

/**
 * Get the process platform
 * 
 * @returns Platform string ('darwin', 'linux', 'win32', etc.)
 */
export function platform(): NodeJS.Platform | 'unknown' {
  if (isNode()) {
    return process.platform;
  }
  
  // Try to detect from user agent in browser/Tauri
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) return 'darwin';
    if (ua.includes('win')) return 'win32';
    if (ua.includes('linux')) return 'linux';
    if (ua.includes('android')) return 'android' as any;
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'darwin';
  }
  
  return 'unknown';
}

/**
 * Get the CPU architecture
 * 
 * @returns Architecture string ('x64', 'arm64', etc.)
 */
export function arch(): NodeJS.Architecture | 'unknown' {
  if (isNode()) {
    return process.arch;
  }
  
  return 'unknown';
}

/**
 * Get the Node.js version (Node.js only)
 * 
 * @returns Version string or null
 */
export function nodeVersion(): string | null {
  if (isNode()) {
    return process.version;
  }
  return null;
}

/**
 * Get all version information (Node.js only)
 * 
 * @returns Version object or null
 */
export function versions(): NodeJS.ProcessVersions | null {
  if (isNode()) {
    return process.versions;
  }
  return null;
}

// ============================================================================
// Process Control
// ============================================================================

/**
 * Exit the process
 * 
 * @param code - Exit code (default: 0)
 */
export async function exit(code: number = 0): Promise<void> {
  if (isTauri()) {
    const tauriProc = getTauriProcess();
    await tauriProc.exit(code);
    return;
  }
  
  if (isNode()) {
    process.exit(code);
  }
  
  // In browser without Tauri, we can't exit
  console.warn('exit() called but not in Node.js or Tauri environment');
}

/**
 * Restart the process (Tauri only)
 */
export async function restart(): Promise<void> {
  if (isTauri()) {
    const tauriProc = getTauriProcess();
    await tauriProc.relaunch();
    return;
  }
  
  throw new Error('restart is only supported in Tauri environment');
}

// ============================================================================
// Process Arguments
// ============================================================================

/**
 * Get command line arguments (Node.js only)
 * 
 * @returns Array of arguments
 */
export function argv(): string[] {
  if (isNode()) {
    return process.argv;
  }
  return [];
}

/**
 * Get the executable path (Node.js only)
 * 
 * @returns Executable path
 */
export function execPath(): string | null {
  if (isNode()) {
    return process.execPath;
  }
  return null;
}

// ============================================================================
// Memory & Performance (Node.js only)
// ============================================================================

/**
 * Get memory usage information (Node.js only)
 * 
 * @returns Memory usage object
 */
export function memoryUsage(): NodeJS.MemoryUsage | null {
  if (isNode()) {
    return process.memoryUsage();
  }
  return null;
}

/**
 * Get process uptime in seconds (Node.js only)
 * 
 * @returns Uptime in seconds
 */
export function uptime(): number | null {
  if (isNode()) {
    return process.uptime();
  }
  return null;
}

/**
 * Get high-resolution time (Node.js only)
 * 
 * @param time - Previous hrtime to diff against
 * @returns High-resolution time
 */
export function hrtime(time?: [number, number]): [number, number] | null {
  if (isNode()) {
    return process.hrtime(time);
  }
  return null;
}

// ============================================================================
// Event Handling (Node.js only)
// ============================================================================

export type ProcessEventHandler = (...args: any[]) => void;

/**
 * Add a process event listener (Node.js only)
 * 
 * @param event - Event name
 * @param handler - Event handler
 */
export function on(event: string, handler: ProcessEventHandler): void {
  assertRuntime('on', ['node']);
  process.on(event as any, handler);
}

/**
 * Add a one-time process event listener (Node.js only)
 * 
 * @param event - Event name
 * @param handler - Event handler
 */
export function once(event: string, handler: ProcessEventHandler): void {
  assertRuntime('once', ['node']);
  process.once(event as any, handler);
}

/**
 * Remove a process event listener (Node.js only)
 * 
 * @param event - Event name
 * @param handler - Event handler
 */
export function off(event: string, handler: ProcessEventHandler): void {
  assertRuntime('off', ['node']);
  process.off(event as any, handler);
}

// Default export
export default {
  // Environment
  getEnv,
  getAllEnv,
  setEnv,
  // Working directory
  cwd,
  cwdSync,
  chdir,
  // Process info
  platform,
  arch,
  nodeVersion,
  versions,
  // Process control
  exit,
  restart,
  // Arguments
  argv,
  execPath,
  // Memory & performance
  memoryUsage,
  uptime,
  hrtime,
  // Events
  on,
  once,
  off,
};
