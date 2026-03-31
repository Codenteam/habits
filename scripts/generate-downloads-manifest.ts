#!/usr/bin/env npx tsx
/**
 * Generate downloads manifest for the website.
 * 
 * Creates a JSON file with information about available downloads:
 * - Cortex app binaries (from GitHub Releases)
 * - Habit bundle files (from docs/public/downloads/)
 * 
 * Usage:
 *   npx tsx scripts/generate-downloads-manifest.ts
 * 
 * Environment Variables:
 *   GITHUB_TOKEN - GitHub personal access token (optional, for higher rate limits)
 */

import { readdir, stat, writeFile } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync } from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  assets: GitHubAsset[];
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

interface CortexDownload {
  platform: string;
  filename: string;
  url: string;
  version: string;
  size: string;
  description: string;
  available: boolean;
  publishedAt?: string;
}

interface HabitBundle {
  name: string;
  filename: string;
  url: string;
  size: string;
  description: string;
}

interface LatestRelease {
  version: string;
  name: string;
  url: string;
  publishedAt: string;
}

interface DownloadsManifest {
  cortexApp: CortexDownload[];
  habitBundles: HabitBundle[];
  latestRelease: LatestRelease | null;
  lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const REPO_OWNER = 'codenteam'; // Update with your GitHub org/user
const REPO_NAME = 'habits'; // Update with your repo name
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

const PLATFORM_CONFIGS: Record<string, { description: string; icon: string }> = {
  android: {
    description: 'Android 8.0+ (ARM64)',
    icon: 'android',
  },
  windows: {
    description: 'Windows 10/11 (x64)',
    icon: 'windows',
  },
  macos: {
    description: 'macOS 11+ (Intel & Apple Silicon)',
    icon: 'mac',
  },
  linux: {
    description: 'Linux (x64)',
    icon: 'linux',
  },
  ios: {
    description: 'iOS 14+ (Ad Hoc)',
    icon: 'apple',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getPlatformFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.apk')) return 'android';
  if (lower.endsWith('.exe') || lower.endsWith('.msi')) return 'windows';
  if (lower.endsWith('.dmg')) return 'macos';
  if (lower.endsWith('.appimage')) return 'linux';
  if (lower.endsWith('.ipa')) return 'ios';
  return null;
}

function getAndroidArchDescription(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('arm64') || lower.includes('aarch64')) return 'Android 8.0+ (ARM64)';
  if (lower.includes('x86_64') || lower.includes('x64')) return 'Android 8.0+ (x86_64)';
  if (lower.includes('arm')) return 'Android 8.0+ (ARM)';
  if (lower.includes('x86')) return 'Android 8.0+ (x86)';
  return 'Android 8.0+ (ARM64)'; // Default fallback
}

// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB RELEASES
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  console.log('🔍 Fetching latest release from GitHub...');
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'habits-download-generator',
  };
  
  // Add GitHub token if available for higher rate limits
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }
  
  try {
    const response = await fetch(GITHUB_API_URL, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('  ℹ️  No releases found yet');
        return null;
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const release = await response.json() as GitHubRelease;
    console.log(`  ✓ Found ${release.tag_name} with ${release.assets.length} assets`);
    return release;
  } catch (error) {
    console.error('  ⚠️  Failed to fetch release:', (error as Error).message);
    return null;
  }
}

function processCortexDownloads(release: GitHubRelease | null): CortexDownload[] {
  const downloads: CortexDownload[] = [];
  
  // Process assets from GitHub release
  if (release) {
    for (const asset of release.assets) {
      const platform = getPlatformFromFilename(asset.name);
      if (!platform) continue;
      
      const config = PLATFORM_CONFIGS[platform];
      if (!config) continue;
      
      // Use architecture-specific description for Android
      const description = platform === 'android' 
        ? getAndroidArchDescription(asset.name) 
        : config.description;
      
      downloads.push({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        filename: asset.name,
        url: asset.browser_download_url,
        version: release.tag_name.replace(/^v/, ''),
        size: formatBytes(asset.size),
        description,
        available: true,
        publishedAt: release.published_at,
      });
    }
  }
  
  // Add placeholders for platforms not in release
  const existingPlatforms = new Set(downloads.map(d => d.platform.toLowerCase()));
  for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
    if (!existingPlatforms.has(platform)) {
      downloads.push({
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        filename: `habits-cortex.${platform === 'android' ? 'apk' : platform === 'windows' ? 'exe' : platform === 'macos' ? 'dmg' : platform === 'ios' ? 'ipa' : 'AppImage'}`,
        url: '',
        version: '1.0.0',
        size: 'Coming Soon',
        description: config.description,
        available: false,
      });
    }
  }
  
  // Sort: available first, then by platform name
  downloads.sort((a, b) => {
    if (a.available && !b.available) return -1;
    if (!a.available && b.available) return 1;
    return a.platform.localeCompare(b.platform);
  });
  
  return downloads;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HABIT BUNDLES
// ═══════════════════════════════════════════════════════════════════════════════

async function scanHabitBundles(downloadsDir: string): Promise<HabitBundle[]> {
  console.log('\n📦 Scanning habit bundles...');
  
  if (!existsSync(downloadsDir)) {
    console.log('  ℹ️  Downloads directory not found, skipping habit bundles');
    return [];
  }
  
  const bundles: HabitBundle[] = [];
  const files = await readdir(downloadsDir);
  
  for (const file of files) {
    if (file === '.gitkeep' || file === '.DS_Store') continue;
    
    const ext = extname(file);
    if (ext !== '.zip' && ext !== '.habit') continue;
    
    const filePath = join(downloadsDir, file);
    const stats = await stat(filePath);
    
    // Extract name from filename (remove extension)
    const name = basename(file, extname(file))
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    bundles.push({
      name,
      filename: file,
      url: `/downloads/${file}`,
      size: formatBytes(stats.size),
      description: `Self-contained ${ext === '.habit' ? '.habit' : 'ZIP'} bundle`,
    });
  }
  
  console.log(`  ✓ Found ${bundles.length} habit bundles`);
  return bundles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  console.log('📥 Generating downloads manifest...\n');
  
  const rootDir = join(import.meta.dirname!, '..');
  const downloadsDir = join(rootDir, 'docs/public/downloads');
  const outputPath = join(rootDir, 'docs/public/downloads-manifest.json');
  
  // Fetch latest release
  const release = await fetchLatestRelease();
  
  // Process Cortex app downloads
  const cortexApp = processCortexDownloads(release);
  console.log(`\n  ✓ Processed ${cortexApp.length} Cortex app platforms`);
  console.log(`     Available: ${cortexApp.filter(d => d.available).length}`);
  console.log(`     Coming Soon: ${cortexApp.filter(d => !d.available).length}`);
  
  // Scan habit bundles
  const habitBundles = await scanHabitBundles(downloadsDir);
  
  // Create manifest
  const manifest: DownloadsManifest = {
    cortexApp,
    habitBundles,
    latestRelease: release ? {
      version: release.tag_name.replace(/^v/, ''),
      name: release.name,
      url: release.html_url,
      publishedAt: release.published_at,
    } : null,
    lastUpdated: new Date().toISOString(),
  };
  
  // Write JSON file
  await writeFile(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✅ Manifest written to: docs/public/downloads-manifest.json`);
  console.log(`   Cortex Apps: ${cortexApp.length} platforms`);
  console.log(`   Habit Bundles: ${habitBundles.length} files`);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
