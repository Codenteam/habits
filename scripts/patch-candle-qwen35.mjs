#!/usr/bin/env node
/**
 * Temporary patch: remove broken save/restore_prefix_kv_cache on ModelWeights
 * in latentcollapse/candle @ 1765abe. Safe — local-ai-core does not use them.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const TAURI_DIR = path.join(REPO_ROOT, 'habits-cortex', 'src-tauri');
const CANDLE_REV = process.env.CANDLE_REV ?? '1765abe';

const BLOCK = `    pub fn save_prefix_kv_cache(&self) -> Vec<(Option<Tensor>, Option<Tensor>)> {
        self.layers
            .iter()
            .map(|l| l.save_prefix_kv_cache())
            .collect()
    }

    pub fn restore_prefix_kv_cache(&mut self, saved: Vec<(Option<Tensor>, Option<Tensor>)>) {
        for (layer, (k, v)) in self.layers.iter_mut().zip(saved) {
            layer.restore_prefix_kv_cache(k, v);
        }
    }

`;

function findQuantizedQwen35Path() {
  const root = path.join(os.homedir(), '.cargo', 'git', 'checkouts');
  if (!fs.existsSync(root)) return null;

  for (const checkout of fs.readdirSync(root)) {
    const checkoutPath = path.join(root, checkout);
    if (!fs.statSync(checkoutPath).isDirectory()) continue;

    for (const revDir of fs.readdirSync(checkoutPath)) {
      if (!revDir.startsWith(CANDLE_REV)) continue;
      const candidate = path.join(
        checkoutPath,
        revDir,
        'candle-transformers',
        'src',
        'models',
        'quantized_qwen35.rs',
      );
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  for (const checkout of fs.readdirSync(root)) {
    const checkoutPath = path.join(root, checkout);
    if (!fs.statSync(checkoutPath).isDirectory()) continue;

    for (const revDir of fs.readdirSync(checkoutPath)) {
      const candidate = path.join(
        checkoutPath,
        revDir,
        'candle-transformers',
        'src',
        'models',
        'quantized_qwen35.rs',
      );
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return null;
}

if (!fs.existsSync(TAURI_DIR)) {
  console.error(`error: ${TAURI_DIR} not found`);
  process.exit(1);
}

console.log('==> cargo fetch...');
execSync('cargo fetch', { cwd: TAURI_DIR, stdio: 'inherit' });

const target = findQuantizedQwen35Path();
if (!target) {
  console.error('quantized_qwen35.rs not found after cargo fetch');
  process.exit(1);
}

const text = fs.readFileSync(target, 'utf8');

if (text.includes(BLOCK)) {
  fs.writeFileSync(target, text.replace(BLOCK, ''));
  console.log(`Patched ${target}`);
} else if (!text.includes('save_prefix_kv_cache')) {
  console.log(`Already patched: ${target}`);
} else {
  console.error(`Patch block not found in ${target} — rev/file may have changed`);
  process.exit(1);
}
