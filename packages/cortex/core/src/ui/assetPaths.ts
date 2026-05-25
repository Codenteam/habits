/** Web-root folder name for cortex-core static assets shipped beside index.html. */
export const HA_ASSETS_WEB_ROOT = 'ha-assets';

/** Relative URL to a Lucide SVG under ha-assets/icons/lucide/. */
export function lucideIconUrl(name: string): string {
  return `${HA_ASSETS_WEB_ROOT}/icons/lucide/${name}.svg`;
}

/** Relative URL to a bundled font file under ha-assets/fonts/. */
export function fontAssetUrl(filename: string): string {
  return `${HA_ASSETS_WEB_ROOT}/fonts/${filename}`;
}
