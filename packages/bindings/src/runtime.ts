/**
 * Runtime detection for platform bindings
 * 
 * Detects whether we're running in a Tauri environment or Node.js.
 * Uses globalThis.__TAURI__ for Tauri plugin access (requires withGlobalTauri: true in tauri.conf.json).
 */

// Import types from Tauri packages (type-only imports, no runtime dependency)
import type * as TauriFsTypes from '@tauri-apps/plugin-fs';
import type * as TauriShellTypes from '@tauri-apps/plugin-shell';
import type * as TauriProcessTypes from '@tauri-apps/plugin-process';
import type * as TauriHttpTypes from '@tauri-apps/plugin-http';

/**
 * Tauri filesystem plugin type
 */
export type TauriFsPlugin = typeof TauriFsTypes;

/**
 * Tauri shell plugin type
 */
export type TauriShellPlugin = typeof TauriShellTypes;

/**
 * Tauri process plugin type
 */
export type TauriProcessPlugin = typeof TauriProcessTypes;

/**
 * Tauri HTTP plugin type
 */
export type TauriHttpPlugin = typeof TauriHttpTypes;

/**
 * Tauri global interface (available when withGlobalTauri: true)
 */
export interface TauriGlobal {
  convertFileSrc?: (path: string) => string;
  fs?: TauriFsPlugin;
  shell?: TauriShellPlugin;
  process?: TauriProcessPlugin;
  http?: TauriHttpPlugin;
  [key: string]: unknown;
}

/**
 * Check if we're running in a Tauri environment
 * 
 * Detection strategy:
 * 1. Check for globalThis.__TAURI__ object (Tauri v2 with withGlobalTauri)
 * 2. Check for globalThis.__TAURI_INTERNALS__ (Tauri v2 internals)
 * 
 * @returns true if running in Tauri, false if in Node.js or browser without Tauri
 */
export function isTauri(): boolean {
  const g = globalThis as any;
  return !!(g.__TAURI__ || g.__TAURI_INTERNALS__);
}

/**
 * Get the Tauri global object
 * 
 * @returns The __TAURI__ global or null if not in Tauri
 */
export function getTauri(): TauriGlobal | null {
  if (!isTauri()) return null;
  return (globalThis as any).__TAURI__ as TauriGlobal;
}

/**
 * Get a Tauri plugin from the global object
 * 
 * @param pluginName - Name of the plugin (e.g., 'fs', 'shell', 'process')
 * @throws Error if plugin is not available
 */
export function getTauriPlugin<K extends keyof TauriGlobal>(pluginName: K): NonNullable<TauriGlobal[K]> {
  const tauri = getTauri();
  if (!tauri) {
    throw new Error(`Tauri is not available. Make sure withGlobalTauri is enabled in tauri.conf.json.`);
  }
  
  const plugin = tauri[pluginName];
  if (!plugin) {
    throw new Error(`Tauri plugin '${pluginName}' is not available. Make sure the plugin is installed and enabled.`);
  }
  
  return plugin as NonNullable<TauriGlobal[K]>;
}

/**
 * Check if we're running in Node.js
 * 
 * @returns true if running in Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.node != null;
}

/**
 * Check if we're running in a browser (without Tauri)
 * 
 * @returns true if running in browser without Tauri
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && !isTauri();
}

/**
 * Get the current runtime environment
 * 
 * @returns 'tauri' | 'node' | 'browser'
 */
export function getRuntime(): 'tauri' | 'node' | 'browser' {
  if (isTauri()) {
    return 'tauri';
  }
  if (isNode()) {
    return 'node';
  }
  return 'browser';
}

/**
 * Assert that we're running in a supported environment for the given feature
 * 
 * @param feature - Name of the feature requiring this check
 * @param supportedRuntimes - List of supported runtimes
 * @throws Error if current runtime is not supported
 */
export function assertRuntime(feature: string, supportedRuntimes: ('tauri' | 'node' | 'browser')[]): void {
  const runtime = getRuntime();
  if (!supportedRuntimes.includes(runtime)) {
    throw new Error(
      `${feature} is not supported in ${runtime} environment. ` +
      `Supported environments: ${supportedRuntimes.join(', ')}`
    );
  }
}
