/**
 * Tauri OAuth Plugins
 * 
 * Defines Tauri plugins required for OAuth authentication in desktop/mobile apps:
 * - opener: Opens URLs in the system browser (for authorization)
 * - deep-link: Handles deep link callbacks (for OAuth redirect)
 * 
 * These plugins are automatically added when:
 * 1. A workflow contains bits with OAuth2 authentication
 * 2. The stack.yaml has application.scheme configured
 */

import type { TauriPlugin } from './bundle-generator-wrapper';

/**
 * Tauri Opener Plugin
 * 
 * Opens URLs in the system's default browser.
 * Used to redirect users to OAuth authorization pages.
 * 
 * @see https://v2.tauri.app/plugin/opener/
 */
export const TAURI_OPENER_PLUGIN: TauriPlugin = {
  name: 'opener',
  cargo: 'tauri-plugin-opener = "2"',
  init: 'tauri_plugin_opener::init()',
  permissions: [
    'opener:default',
    'opener:allow-open-url',
    'opener:allow-open-path',
  ],
};

/**
 * Tauri Deep Link Plugin
 * 
 * Registers custom URL schemes and handles deep link callbacks.
 * Used to receive OAuth callbacks like: myapp://oauth/callback?code=...
 * 
 * @see https://v2.tauri.app/plugin/deep-link/
 */
export const TAURI_DEEP_LINK_PLUGIN: TauriPlugin = {
  name: 'deep-link',
  cargo: 'tauri-plugin-deep-link = "2"',
  init: 'tauri_plugin_deep_link::init()',
  permissions: [
    'deep-link:default',
  ],
};

/**
 * All OAuth-related Tauri plugins
 */
export const TAURI_OAUTH_PLUGINS: TauriPlugin[] = [
  TAURI_OPENER_PLUGIN,
  TAURI_DEEP_LINK_PLUGIN,
];

/**
 * Check if a list of Tauri plugins includes OAuth plugins
 */
export function hasOAuthPlugins(plugins: TauriPlugin[]): boolean {
  return plugins.some(p => p.name === 'opener' || p.name === 'deep-link');
}

/**
 * Merge OAuth plugins with existing plugins (avoiding duplicates)
 */
export function addOAuthPlugins(existingPlugins: TauriPlugin[]): TauriPlugin[] {
  const pluginNames = new Set(existingPlugins.map(p => p.name));
  const merged = [...existingPlugins];
  
  for (const oauthPlugin of TAURI_OAUTH_PLUGINS) {
    if (!pluginNames.has(oauthPlugin.name)) {
      merged.push(oauthPlugin);
      pluginNames.add(oauthPlugin.name);
    }
  }
  
  return merged;
}
