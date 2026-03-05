/**
 * Electron Preload Script Template
 * 
 * Runs before web content loads and sets up the context bridge
 * for secure communication between renderer and main process.
 */

/**
 * Generate the Electron preload script
 */
export function getElectronPreload(): string {
  return `
const { contextBridge } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('habitsElectron', {
  platform: process.platform,
  isElectron: true,
  version: process.versions.electron,
});

console.log('[Habits] Electron preload initialized');
`.trim();
}
