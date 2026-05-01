#!/usr/bin/env npx tsx
/**
 * Pack featured showcase habits into .habit files bundled with the app.
 * 
 * Scans showcase/ for directories with showcase.yaml where featured: true.
 * For each, runs the pack command and copies a thumbnail image.
 * Outputs to habits-cortex/www/builtin-habits/ and generates an index.json.
 * 
 * Usage:
 *   npx tsx habits-cortex/scripts/pack-builtin-habits.ts
 * 
 * Run this before building the app for iOS or macOS App Store.
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';
import { execSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..', '..');
const showcaseDir = join(rootDir, 'showcase');
const outputDir = join(__dirname, '..', 'www', 'builtin-habits');

interface ShowcaseMetadata {
  name: string;
  description: string;
  tags: string[];
  difficulty: string;
  featured?: boolean;
  disabled?: boolean;
}

interface BuiltinHabitEntry {
  slug: string;
  name: string;
  description: string;
  habitFile: string;
  thumbnail: string;
  tags: string[];
  difficulty: string;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

function findFirstDemoImage(showcasePath: string): string | null {
  const demoDir = join(showcasePath, 'demo');
  if (!existsSync(demoDir)) return null;

  const images = readdirSync(demoDir)
    .filter(f => IMAGE_EXTENSIONS.includes(extname(f).toLowerCase()))
    .sort((a, b) => {
      const numA = parseInt(basename(a, extname(a)));
      const numB = parseInt(basename(b, extname(b)));
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

  return images.length > 0 ? join(demoDir, images[0]) : null;
}

async function main() {
  console.log('📦 Packing built-in habits...\n');

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true });

  const entries: BuiltinHabitEntry[] = [];

  const dirs = readdirSync(showcaseDir).filter(name => {
    const fullPath = join(showcaseDir, name);
    return statSync(fullPath).isDirectory();
  });

  for (const dir of dirs) {
    const showcasePath = join(showcaseDir, dir);
    const yamlPath = join(showcasePath, 'showcase.yaml');
    const stackPath = join(showcasePath, 'stack.yaml');

    if (!existsSync(yamlPath)) continue;

    let meta: ShowcaseMetadata;
    try {
      meta = parseYaml(readFileSync(yamlPath, 'utf-8')) as ShowcaseMetadata;
    } catch (e) {
      console.error(`  ❌ Error parsing ${dir}/showcase.yaml:`, (e as Error).message);
      continue;
    }

    if (!meta.featured || meta.disabled) continue;
    if (!existsSync(stackPath)) {
      console.log(`  ⚠️  Skipping ${dir}: no stack.yaml found`);
      continue;
    }

    const habitFilename = `${dir}.habit`;
    const habitOutputPath = join(outputDir, habitFilename);
    const relativeStackPath = `showcase/${dir}/stack.yaml`;

    console.log(`  ⏳ Packing ${dir}...`);
    try {
      const command = `npx tsx packages/habits/app/src/main.ts pack --format habit --config "${relativeStackPath}" -o "${habitOutputPath}"`;
      execSync(command, {
        cwd: rootDir,
        stdio: 'pipe',
        timeout: 120000,
      });

      if (!existsSync(habitOutputPath)) {
        console.error(`  ⚠️  Pack completed but file not created: ${habitFilename}`);
        continue;
      }
    } catch (err) {
      const e = err as { status?: number; stderr?: Buffer; stdout?: Buffer };
      console.error(`  ❌ Failed to pack ${dir} (exit ${e.status || 'unknown'})`);
      if (e.stderr) console.error(`     stderr: ${e.stderr.toString().slice(0, 300)}`);
      if (e.stdout) console.error(`     stdout: ${e.stdout.toString().slice(0, 300)}`);
      continue;
    }

    // Copy thumbnail
    let thumbnailFilename = '';
    const demoImage = findFirstDemoImage(showcasePath);
    if (demoImage) {
      thumbnailFilename = `${dir}-thumb${extname(demoImage)}`;
      copyFileSync(demoImage, join(outputDir, thumbnailFilename));
    }

    entries.push({
      slug: dir,
      name: meta.name,
      description: meta.description,
      habitFile: habitFilename,
      thumbnail: thumbnailFilename,
      tags: meta.tags || [],
      difficulty: meta.difficulty || 'beginner',
    });

    console.log(`  ✅ ${meta.name} → ${habitFilename}`);
  }

  // Sort by name for deterministic output
  entries.sort((a, b) => a.name.localeCompare(b.name));

  // Write index.json
  const indexPath = join(outputDir, 'index.json');
  writeFileSync(indexPath, JSON.stringify(entries, null, 2));

  console.log(`\n✨ Done! ${entries.length} built-in habits packed.`);
  console.log(`   Output: habits-cortex/www/builtin-habits/`);
  console.log(`   Index:  habits-cortex/www/builtin-habits/index.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
