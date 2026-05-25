import * as fs from '@ha-bits/bindings/fs';
import * as path from '@ha-bits/bindings/path';
import { isNode } from '@ha-bits/bindings/runtime';
import { HA_ASSETS_WEB_ROOT } from './assetPaths';

/** Resolve cortex-core `assets/` directory on disk (Node runtime/deploy only). */
export function resolveCortexCoreAssetsDir(): string | null {
  if (!isNode()) return null;

  const candidates = [
    path.join(__dirname, 'assets'),
    path.join(__dirname, '../assets'),
    path.join(__dirname, '../../assets'),
    path.join(process.cwd(), 'packages/cortex/core/assets'),
    path.join(process.cwd(), 'dist/packages/cortex/core/assets'),
    path.join(process.cwd(), '../dist/packages/cortex/core/assets'),
    path.join(process.cwd(), '../packages/cortex/core/assets'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

function readZipEntry(abs: string): string | Uint8Array {
  if (/\.(woff2?|png|jpe?g|webp|gif)$/i.test(abs)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:fs').readFileSync(abs);
  }
  return fs.readFileSync(abs);
}

function copyFileSync(from: string, to: string): void {
  const data = readZipEntry(from);
  if (typeof data === 'string') {
    fs.writeFileSync(to, data);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node:fs').writeFileSync(to, data);
  }
}

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(from, to);
    } else {
      copyFileSync(from, to);
    }
  }
}

/** Copy cortex-core assets into `<destRoot>/ha-assets/` (app/runtime deploy only, not per-habit). */
export function copyHaAssetsTo(destRoot: string): boolean {
  const assetsDir = resolveCortexCoreAssetsDir();
  if (!assetsDir) return false;
  copyDirRecursive(assetsDir, path.join(destRoot, HA_ASSETS_WEB_ROOT));
  return true;
}
