/**
 * Pack Command Handler
 * 
 * Main entry point for the `habits pack` command.
 * Orchestrates packing into different formats:
 * - single-executable: Node.js SEA binary (server/desktop/serverless)
 * - desktop: Electron app (frontend-only with backend URL)
 * - desktop-full: Full Electron app with embedded backend (coming soon)
 * - mobile: Cordova app (frontend-only with backend URL)
 * - mobile-full: Full mobile app with embedded backend (coming soon)
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import {
  PackCommandOptions,
  PackFormat,
  HabitData,
  ParsedConfig,
  PackResult,
} from './types';
import { packSingleExecutable } from './single-executable';
import { packDesktop, getSupportedDesktopPlatforms } from './desktop';
import { packMobile, getSupportedMobileTargets } from './mobile';

// Re-export types and utilities
export * from './types';
export { getSupportedDesktopPlatforms } from './desktop';
export { getSupportedMobileTargets } from './mobile';
export { packSingleExecutable } from './single-executable';
export { packDesktop } from './desktop';
export { packMobile } from './mobile';

/**
 * Get supported pack formats
 */
export function getSupportedPackFormats(): PackFormat[] {
  return ['single-executable', 'desktop', 'desktop-full', 'mobile', 'mobile-full'];
}

/**
 * Run the pack command with the given options
 */
export async function runPackCommand(options: PackCommandOptions): Promise<PackResult> {
  const { config: configFile, format } = options;

  // Resolve config path
  const configPath = path.resolve(configFile);
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configPath)) {
    return {
      success: false,
      error: `Config file not found: ${configPath}`,
      format,
    };
  }

  // Parse config file
  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = yaml.parse(configContent) as ParsedConfig;

  // Load habits from config
  const habits = loadHabits(config, configDir);

  if (habits.length === 0) {
    return {
      success: false,
      error: 'No valid habits found in config file',
      format,
    };
  }

  // Load .env content
  let envContent = '';
  const envPath = path.join(configDir, '.env');
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Route to appropriate handler
  switch (format) {
    case 'single-executable':
      return packSingleExecutable({
        configPath,
        configDir,
        config,
        habits,
        envContent,
        platform: options.platform || 'current',
        output: options.output,
      });

    case 'desktop':
      if (!options.backendUrl) {
        return {
          success: false,
          error: 'Desktop format requires --backend-url option',
          format,
        };
      }
      return packDesktop({
        configPath,
        configDir,
        config,
        habits,
        backendUrl: options.backendUrl,
        desktopPlatform: options.desktopPlatform || 'all',
        output: options.output,
      });

    case 'desktop-full':
      console.log('\n🚧 Desktop Full Mode - Coming Soon!\n');
      console.log('   This mode will create a complete Electron app with the');
      console.log('   backend embedded, so it can run entirely offline.\n');
      console.log('   For now, use --format desktop with --backend-url to create');
      console.log('   a frontend-only app that connects to your backend.\n');
      console.log('   Example:');
      console.log('   npx habits pack --config stack.yaml --format desktop --backend-url https://api.example.com\n');
      return {
        success: false,
        error: 'Desktop-full format is coming soon',
        format,
      };

    case 'mobile':
      if (!options.backendUrl) {
        return {
          success: false,
          error: 'Mobile format requires --backend-url option',
          format,
        };
      }
      return packMobile({
        configPath,
        configDir,
        config,
        habits,
        backendUrl: options.backendUrl,
        mobileTarget: options.mobileTarget || 'both',
        output: options.output,
      });

    case 'mobile-full':
      console.log('\n🚧 Mobile Full Mode - Coming Soon!\n');
      console.log('   This mode will create a complete mobile app with the');
      console.log('   backend embedded, so it can run entirely offline.\n');
      console.log('   For now, use --format mobile with --backend-url to create');
      console.log('   a frontend-only app that connects to your backend.\n');
      console.log('   Example:');
      console.log('   npx habits pack --config stack.yaml --format mobile --backend-url https://api.example.com --target android\n');
      return {
        success: false,
        error: 'Mobile-full format is coming soon',
        format,
      };

    default:
      return {
        success: false,
        error: `Unknown format: ${format}. Supported: ${getSupportedPackFormats().join(', ')}`,
        format,
      };
  }
}

/**
 * Load habits from config file
 */
export function loadHabits(config: ParsedConfig, configDir: string): HabitData[] {
  const habits: HabitData[] = [];

  // Get habit references from config
  const habitRefs: Array<{ id?: string; path: string; enabled?: boolean }> = [];

  // Support 'workflows' key
  if (config.workflows && Array.isArray(config.workflows)) {
    habitRefs.push(...config.workflows);
  }

  // Support 'habits' key (string paths)
  if (config.habits && Array.isArray(config.habits)) {
    for (const h of config.habits) {
      if (typeof h === 'string') {
        habitRefs.push({ path: h });
      }
    }
  }

  // Load each habit file
  for (const ref of habitRefs) {
    if (ref.enabled === false) continue;

    const habitPath = path.isAbsolute(ref.path)
      ? ref.path
      : path.resolve(configDir, ref.path);

    if (!fs.existsSync(habitPath)) {
      console.error(`   ⚠️  Habit file not found: ${habitPath}`);
      continue;
    }

    try {
      const habitContent = fs.readFileSync(habitPath, 'utf8');
      const habit = yaml.parse(habitContent) as {
        id?: string;
        name?: string;
        slug?: string;
        nodes?: any[];
        edges?: any[];
      };

      const habitName = habit.name || habit.id || ref.id || path.basename(habitPath, '.yaml');
      console.log(`   📄 Loading: ${habitName}`);

      habits.push({
        name: habitName,
        slug: habit.slug || habit.id || habitName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        nodes: habit.nodes || [],
        edges: habit.edges || [],
      });
    } catch (error: any) {
      console.error(`   ❌ Failed to parse habit file ${habitPath}: ${error.message}`);
    }
  }

  return habits;
}
