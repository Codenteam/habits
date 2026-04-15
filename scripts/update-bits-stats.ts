#!/usr/bin/env npx tsx
/**
 * Lightweight script to update bits download statistics.
 * Reads package names from existing bits-data.json and fetches NPM download counts.
 *
 * Usage: npx tsx scripts/update-bits-stats.ts
 *
 * Output:
 *   - docs/public/bits-stats.json - Runtime stats for Vue components
 *
 * This script is designed to be fast (~2-5 seconds) and run on every CI/CD deploy,
 * while the full bits pages remain persisted in git.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Paths
const BITS_DATA_PATH = join(ROOT_DIR, 'docs/.vitepress/theme/data/bits-data.json');
const STATS_OUTPUT_PATH = join(ROOT_DIR, 'docs/public/bits-stats.json');

// ============================================================================
// NPM Download Stats
// ============================================================================

/**
 * Fetch lifetime npm downloads for a package
 * Uses npm registry API with a wide date range for "lifetime" downloads
 */
async function fetchNpmDownloads(packageName: string, retries = 2): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const url = `https://api.npmjs.org/downloads/point/2015-01-01:${today}/${encodeURIComponent(packageName)}`;

    const response = await fetch(url);
    if (!response.ok) {
      // 429 = rate limited, retry with backoff
      if (response.status === 429 && retries > 0) {
        console.warn(`  ⚠️  ${packageName}: rate limited, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchNpmDownloads(packageName, retries - 1);
      }
      return 0; // 404 or other errors = not published
    }

    const data = await response.json() as { downloads?: number };
    return data.downloads || 0;
  } catch (err) {
    console.warn(`  ⚠️  ${packageName}: ${(err as Error).message}`);
    return 0;
  }
}

/**
 * Fetch downloads with rate limiting (batch of N with delay between batches)
 */
async function fetchAllDownloads(packageNames: string[]): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  const BATCH_SIZE = 3;
  const DELAY_MS = 1000;

  for (let i = 0; i < packageNames.length; i += BATCH_SIZE) {
    const batch = packageNames.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (pkg) => {
        const downloads = await fetchNpmDownloads(pkg);
        return { pkg, downloads };
      })
    );

    for (const { pkg, downloads } of batchResults) {
      results.set(pkg, downloads);
    }

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < packageNames.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}

/**
 * Format download count for display (e.g., 1234 -> "1.2K", 1234567 -> "1.2M")
 */
function formatDownloads(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
}

// ============================================================================
// Main
// ============================================================================

interface BitInfo {
  packageName: string;
  slug: string;
}

interface BitsStats {
  stats: Record<string, { downloads: number; downloadsFormatted: string }>;
  lastUpdated: string;
}

async function main() {
  console.log('📊 Updating bits download statistics...\n');

  // Read existing bits-data.json to get package names
  if (!existsSync(BITS_DATA_PATH)) {
    console.error(`❌ bits-data.json not found at ${BITS_DATA_PATH}`);
    console.error('   Run "npx tsx scripts/generate-bits.ts" first to generate bits pages.');
    process.exit(1);
  }

  const bitsData: BitInfo[] = JSON.parse(readFileSync(BITS_DATA_PATH, 'utf-8'));
  const packageNames = bitsData.map(b => b.packageName);
  console.log(`📦 Found ${bitsData.length} bits to fetch stats for\n`);

  // Fetch downloads with rate limiting
  const downloadCounts = await fetchAllDownloads(packageNames);

  // Build stats object
  const stats: BitsStats = {
    stats: {},
    lastUpdated: new Date().toISOString(),
  };

  for (const bit of bitsData) {
    const downloads = downloadCounts.get(bit.packageName) || 0;
    stats.stats[bit.packageName] = {
      downloads,
      downloadsFormatted: formatDownloads(downloads),
    };
    console.log(`  ${bit.packageName}: ${formatDownloads(downloads)} downloads`);
  }

  // Ensure output directory exists
  const outputDir = dirname(STATS_OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write stats JSON
  writeFileSync(STATS_OUTPUT_PATH, JSON.stringify(stats, null, 2));
  console.log(`\n✅ Written stats to ${STATS_OUTPUT_PATH}`);
  console.log(`   Last updated: ${stats.lastUpdated}`);
}

main().catch((err) => {
  console.error('Failed to update bits stats:', err);
  process.exit(1);
});
