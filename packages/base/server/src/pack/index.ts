/**
 * Pack Command Handler
 *
 * Main entry point for the `habits pack` command.
 * Packages habits into a .habit file for import into habits-cortex.
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
import { generateBundle, BundleGeneratorResult } from './bundle-generator-wrapper';
import { getHabitsFetchProxyScript } from './habits-fetch-proxy';
import JSZip from 'jszip';
import { compileUiYaml } from '@ha-bits/cortex-core';
import { processHtmlFile, InjectScript } from './html-asset-inliner';

export * from './types';
export { generateBundle, BundleGeneratorOptions, BundleGeneratorResult } from './bundle-generator-wrapper';

/**
 * Get supported pack formats
 */
export function getSupportedPackFormats(): PackFormat[] {
  return ['habit'];
}

/**
 * Run the pack command with the given options
 */
export async function runPackCommand(options: PackCommandOptions): Promise<PackResult> {
  const format: PackFormat = options.format || 'habit';
  const { config: configFile } = options;

  if (format !== 'habit') {
    return {
      success: false,
      error: `Unsupported format: ${format}. Only 'habit' is supported.`,
      format,
    };
  }

  const configPath = path.resolve(configFile);
  const configDir = path.dirname(configPath);

  if (!fs.existsSync(configPath)) {
    return {
      success: false,
      error: `Config file not found: ${configPath}`,
      format,
    };
  }

  const configContent = fs.readFileSync(configPath, 'utf8');
  const config = yaml.parse(configContent) as ParsedConfig;

  const habits = loadHabits(config, configDir);

  if (habits.length === 0) {
    return {
      success: false,
      error: 'No valid habits found in config file',
      format,
    };
  }

  let envContent = '';
  const envPath = path.join(configDir, '.env');
  if (options.includeEnv && fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('   📋 Including .env values in bundle');
  } else if (fs.existsSync(envPath) && !options.includeEnv) {
    console.log('   🔒 Skipping .env (use --include-env to include)');
  }

  return packHabitFile({
    configPath,
    configDir,
    config,
    habits,
    envContent,
    output: options.output,
    skipBundle: options.skipBundle,
  });
}

interface PackHabitFileOptions {
  configPath: string;
  configDir: string;
  config: ParsedConfig;
  habits: HabitData[];
  envContent: string;
  output?: string;
  skipBundle?: boolean;
}

function parseEnvContent(envContent: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  }
  return envVars;
}

/**
 * Pack habits into a .habit file (zip archive containing cortex-bundle.js and frontend assets)
 */
async function packHabitFile(options: PackHabitFileOptions): Promise<PackResult> {
  const { config, habits, envContent, output, configDir, configPath, skipBundle } = options;

  console.log('\n📦 Generating .habit file...\n');

  const hasFrontend = !!config.server?.frontend;
  let frontendPath: string | null = null;
  let hasIndexHtml = false;
  let hasIndexYaml = false;

  if (hasFrontend) {
    frontendPath = path.isAbsolute(config.server!.frontend!)
      ? config.server!.frontend!
      : path.resolve(configDir, config.server!.frontend!);

    if (!fs.existsSync(frontendPath)) {
      return {
        success: false,
        error: `Frontend directory not found: ${frontendPath}`,
        format: 'habit',
      };
    }

    const indexHtmlPath = path.join(frontendPath, 'index.html');
    const indexYamlPath = path.join(frontendPath, 'index.yaml');
    hasIndexHtml = fs.existsSync(indexHtmlPath);
    hasIndexYaml = fs.existsSync(indexYamlPath) || fs.existsSync(path.join(frontendPath, 'index.yml'));
    if (!hasIndexHtml && !hasIndexYaml) {
      return {
        success: false,
        error: `No frontend entry found in ${frontendPath} (expected index.yaml or index.html)`,
        format: 'habit',
      };
    }
    if (hasIndexYaml && !hasIndexHtml) {
      console.log('   📄 Using declarative frontend (index.yaml)');
    }
  } else {
    console.log('   📱 No frontend specified - Cortex app will auto-generate UI from schema');
  }

  const envVars = parseEnvContent(envContent);

  const workflows = habits.map(h => ({
    ...h,
    id: h.slug,
  }));

  let bundleResult: BundleGeneratorResult | null = null;
  if (!skipBundle) {
    bundleResult = await generateBundle({
      habits: workflows,
      appName: config.name || 'HabitsApp',
      envVars,
    });

    if (!bundleResult.success) {
      return {
        success: false,
        error: bundleResult.error || 'Bundle generation failed',
        format: 'habit',
      };
    }
  } else {
    console.log('   ⏩ Skipping bundle generation (cortex-bundle-all.js will be used)');
  }

  const zip = new JSZip();
  const inlinedFiles = new Set<string>();

  if (hasFrontend && frontendPath) {
    const frontendDirName = config.server!.frontend!.replace(/^\.[\/\\]/, '');
    const injectScripts: InjectScript[] = [];

    if (hasIndexHtml && !hasIndexYaml) {
      console.log('   🔧 Processing HTML files for offline use...');
      const processedHtmlFiles = await processHtmlFilesInDirectory(frontendPath, inlinedFiles, injectScripts);

      for (const [relativePath, processedResult] of processedHtmlFiles) {
        const processedHtml = processedResult.html;

        if (processedResult.tailwindProcessed) {
          console.log(`   ✨ ${relativePath}: Tailwind CSS generated`);
        }

        const htmlZipPath = path.join(frontendDirName, relativePath);
        zip.file(htmlZipPath, processedHtml);

        const originalHtmlPath = path.join(frontendPath, relativePath);
        const originalHtml = fs.readFileSync(originalHtmlPath, 'utf8');
        const srcHtmlZipPath = path.join(`${frontendDirName}-src`, relativePath);
        zip.file(srcHtmlZipPath, originalHtml);
      }

      addFrontendFilesToZip(frontendPath, zip, inlinedFiles, processedHtmlFiles, undefined, frontendDirName);
      addOriginalFrontendFilesToZip(frontendPath, zip, `${frontendDirName}-src`);
    } else {
      addFrontendFilesToZip(frontendPath, zip, inlinedFiles, new Map(), undefined, frontendDirName);

      const yamlPath =
        fs.existsSync(path.join(frontendPath, 'index.yaml'))
          ? path.join(frontendPath, 'index.yaml')
          : path.join(frontendPath, 'index.yml');
      if (fs.existsSync(yamlPath)) {
        const yamlSource = fs.readFileSync(yamlPath, 'utf8');
        const { html } = compileUiYaml(yamlSource);
        const htmlZipPath = path.join(frontendDirName, 'index.html');
        zip.file(htmlZipPath, html);
        console.log('   ✨ Compiled index.yaml → index.html for .habit package');
      }
    }
  }

  if (!hasFrontend) {
    zip.file('_auto-ui', 'true');
  }

  if (bundleResult?.code) {
    zip.file('cortex-bundle.js', bundleResult.code);
  }

  const fetchProxyScript = getHabitsFetchProxyScript({ mode: 'full' });
  zip.file('habits-fetch-proxy.js', fetchProxyScript);

  for (const habit of habits) {
    const habitPath = habit.relativePath || habit.filename;
    if (habit.content) {
      zip.file(habitPath!, habit.content);
    }
  }

  const stackYamlContent = fs.readFileSync(configPath, 'utf8');
  zip.file('stack.yaml', stackYamlContent);

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  const stackName = config.name || path.basename(configDir);
  const sanitizedName = stackName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const outputPath = output || path.join(configDir, 'dist', `${sanitizedName}.habit`);
  const outputDir = path.dirname(outputPath);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, zipBuffer);

  const habitSize = zipBuffer.length;
  console.log(`   ✅ Habit file created: ${outputPath}`);
  console.log(`   📦 Size: ${(habitSize / 1024).toFixed(2)} KB`);
  if (skipBundle) {
    console.log(`   🧩 Bundle: skipped (using cortex-bundle-all.js)`);
  } else {
    console.log(`   🧩 Bundled bits: ${bundleResult?.bundledBits?.join(', ') || 'none'}`);
  }
  if (hasFrontend) {
    console.log(`   📄 Frontend: ${frontendPath}`);
    console.log(`   🌐 Offline ready: All assets inlined`);
  } else {
    console.log(`   📱 UI: Auto-generated from schema at runtime`);
  }

  return {
    success: true,
    outputPath,
    format: 'habit',
    size: habitSize,
  };
}

async function processHtmlFilesInDirectory(
  dir: string,
  inlinedFiles: Set<string>,
  injectScripts?: InjectScript[]
): Promise<Map<string, { html: string; tailwindProcessed: boolean }>> {
  const results = new Map<string, { html: string; tailwindProcessed: boolean }>();

  const processDir = async (currentDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
        const htmlContent = fs.readFileSync(fullPath, 'utf8');
        const relativePath = path.relative(dir, fullPath);
        const htmlDir = path.dirname(fullPath);

        const beforeInline = () => {
          const cssMatches = htmlContent.matchAll(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi);
          for (const match of cssMatches) {
            const href = match[1];
            if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('//')) {
              const cssRelative = path.relative(dir, path.resolve(htmlDir, href));
              inlinedFiles.add(cssRelative);
            }
          }

          const jsMatches = htmlContent.matchAll(/<script[^>]*src=["']([^"']+\.js)["'][^>]*>/gi);
          for (const match of jsMatches) {
            const src = match[1];
            if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//') && !src.includes('cortex-bundle')) {
              const jsRelative = path.relative(dir, path.resolve(htmlDir, src));
              inlinedFiles.add(jsRelative);
            }
          }

          const imgMatches = htmlContent.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi);
          for (const match of imgMatches) {
            const src = match[1];
            if (!src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//')) {
              const imgRelative = path.relative(dir, path.resolve(htmlDir, src));
              inlinedFiles.add(imgRelative);
            }
          }
        };

        beforeInline();

        const processed = await processHtmlFile(htmlContent, {
          baseDir: htmlDir,
          injectScripts,
        });

        results.set(relativePath, processed);
      }
    }
  };

  await processDir(dir);
  return results;
}

function addFrontendFilesToZip(
  dir: string,
  zip: JSZip,
  inlinedFiles: Set<string>,
  processedHtmlFiles: Map<string, any>,
  baseDir?: string,
  prefix?: string
): void {
  const base = baseDir || dir;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(base, filePath);

    if (stat.isDirectory()) {
      addFrontendFilesToZip(filePath, zip, inlinedFiles, processedHtmlFiles, base, prefix);
    } else {
      if (file.endsWith('.html') || file.endsWith('.htm')) {
        continue;
      }

      if (inlinedFiles.has(relativePath)) {
        continue;
      }

      const zipPath = prefix ? path.join(prefix, relativePath) : relativePath;
      zip.file(zipPath, fs.readFileSync(filePath));
    }
  }
}

function addOriginalFrontendFilesToZip(
  dir: string,
  zip: JSZip,
  prefix: string,
  baseDir?: string
): void {
  const base = baseDir || dir;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(base, filePath);

    if (stat.isDirectory()) {
      addOriginalFrontendFilesToZip(filePath, zip, prefix, base);
    } else {
      if (file.endsWith('.html') || file.endsWith('.htm')) {
        continue;
      }

      const zipPath = path.join(prefix, relativePath);
      zip.file(zipPath, fs.readFileSync(filePath));
    }
  }
}

/**
 * Load habits from config file
 */
export function loadHabits(config: ParsedConfig, configDir: string): HabitData[] {
  const habits: HabitData[] = [];

  const habitRefs: Array<{ id?: string; path: string; enabled?: boolean }> = [];

  if (config.workflows && Array.isArray(config.workflows)) {
    habitRefs.push(...config.workflows);
  }

  if (config.habits && Array.isArray(config.habits)) {
    for (const h of config.habits) {
      if (typeof h === 'string') {
        habitRefs.push({ path: h });
      }
    }
  }

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
      const habit = yaml.parse(habitContent) as Record<string, any>;

      const habitName = habit.name || habit.id || ref.id || path.basename(habitPath, '.yaml');
      const habitFilename = path.basename(habitPath);
      const habitRelativePath = path.relative(configDir, habitPath);
      console.log(`   📄 Loading: ${habitName}`);

      habits.push({
        ...habit,
        name: habitName,
        slug: habit.slug || habit.id || habitName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        nodes: habit.nodes || [],
        edges: habit.edges || [],
        filename: habitFilename,
        relativePath: habitRelativePath,
        content: habitContent,
      });
    } catch (error: any) {
      console.error(`   ❌ Failed to parse habit file ${habitPath}: ${error.message}`);
    }
  }

  return habits;
}
