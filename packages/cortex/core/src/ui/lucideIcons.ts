import iconManifest from '../../assets/icons/manifest.json';
import { lucideIconUrl } from './assetPaths';

const ICON_NAMES = iconManifest as string[];
const ICON_SET = new Set(ICON_NAMES);

/** PascalCase Lucide icon names shipped with cortex-core. */
export function getLucideIconNames(): string[] {
  return ICON_NAMES;
}

export function hasLucideIcon(name: string): boolean {
  return ICON_SET.has(name);
}

/** Web path to a bundled Lucide SVG (works in Node-compiled HTML and Tauri webview). */
export function getLucideIconPath(name: string): string | undefined {
  return hasLucideIcon(name) ? lucideIconUrl(name) : undefined;
}
