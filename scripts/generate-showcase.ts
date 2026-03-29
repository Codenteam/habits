#!/usr/bin/env npx tsx
/**
 * Generate showcase pages for examples with demo images.
 * Scans showcase/ for directories containing demo/ folder and showcase.yaml.
 * 
 * Usage: npx tsx scripts/generate-showcase.ts
 * 
 * Output:
 *   - docs/showcase/<example>.md - Individual landing pages
 *   - docs/showcase/index.md - Showcase index with search/filter
 *   - docs/public/showcase/<example>/ - Copied demo images
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'fs';
import { join, relative, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';
import { execSync, spawn } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const examplesDir = join(rootDir, 'showcase');
const docsDir = join(rootDir, 'docs');
const showcaseDir = join(docsDir, 'showcase');
const publicShowcaseDir = join(docsDir, 'public/showcase');

interface ShowcaseMetadata {
  name: string;
  description: string;
  longDescription?: string;
  type?: 'agent' | 'automation' | 'fullstack' | 'api' | 'frontend';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  featured?: boolean;
  author?: string;
  version?: string;
  requirements?: string[];
  habits?: string[];
  links?: {
    github?: string;
    demo?: string;
    video?: string;
  };
  disabled?: boolean; // If true, example is skipped from generation
}

interface DownloadFile {
  filename: string;
  platform: 'mac' | 'windows' | 'linux' | 'android' | 'ios' | 'universal';
  size: number; // bytes
  displaySize: string; // human-readable
}

interface ExampleData extends ShowcaseMetadata {
  slug: string;
  images: string[];
  path: string;
  keyFiles: string[];
  habitFiles: string[];
  downloads: DownloadFile[];
  useDefaultImage?: boolean;
}

// Default images for different example types (stored in docs/public/showcase-defaults/)
const DEFAULT_IMAGES: Record<string, string> = {
  agent: 'agent-default.svg',
  automation: 'automation-default.svg',
  fullstack: 'fullstack-default.svg',
  api: 'api-default.svg',
  frontend: 'frontend-default.svg',
};
const defaultImagesDir = join(docsDir, 'public/showcase-defaults');

// Tag to Lucide icon mapping
const TAG_ICONS: Record<string, string> = {
  ai: 'Brain',
  openai: 'Sparkles',
  anthropic: 'Sparkles',
  llm: 'Brain',
  automation: 'Zap',
  workflow: 'GitBranch',
  api: 'Server',
  email: 'Mail',
  imap: 'Mail',
  smtp: 'Mail',
  database: 'Database',
  frontend: 'Layout',
  backend: 'Server',
  blog: 'FileText',
  cms: 'FileText',
  agent: 'Bot',
  mcp: 'Plug',
  tools: 'Wrench',
  classification: 'Tags',
  nlp: 'MessageSquare',
  chat: 'MessageCircle',
  image: 'Image',
  vision: 'Eye',
  recipe: 'UtensilsCrossed',
  journal: 'BookOpen',
  cookbook: 'ChefHat',
  legal: 'Scale',
  forms: 'ClipboardList',
  http: 'Globe',
  webhook: 'Webhook',
  schedule: 'Clock',
  cron: 'Timer',
};
const DEFAULT_TAG_ICON = 'Tag';

function getImageFiles(demoDir: string): string[] {
  if (!existsSync(demoDir)) return [];
  
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  return readdirSync(demoDir)
    .filter(file => imageExtensions.includes(extname(file).toLowerCase()))
    .sort((a, b) => {
      // Sort numerically if possible (1.png, 2.png, 10.png)
      const numA = parseInt(basename(a, extname(a)));
      const numB = parseInt(basename(b, extname(b)));
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
}

// Key files to look for in each example (in display order)
const KEY_FILES = [
  'stack.yaml',
  'habit.yaml',
  '.env.example',
];

function getKeyFiles(examplePath: string): string[] {
  const found: string[] = [];
  
  for (const file of KEY_FILES) {
    if (existsSync(join(examplePath, file))) {
      found.push(file);
    }
  }
  
  // Also check for habit files in habits/ subdirectory
  const habitsDir = join(examplePath, 'habits');
  if (existsSync(habitsDir) && statSync(habitsDir).isDirectory()) {
    const habitFiles = readdirSync(habitsDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .slice(0, 3); // Limit to first 3 habit files
    
    for (const file of habitFiles) {
      found.push(`habits/${file}`);
    }
  }
  
  return found;
}

// Platform detection from file extensions
const PLATFORM_EXTENSIONS: Record<string, DownloadFile['platform']> = {
  '.dmg': 'mac',
  '.pkg': 'mac',
  '.app': 'mac',
  '.exe': 'windows',
  '.msi': 'windows',
  '.msix': 'windows',
  '.apk': 'android',
  '.aab': 'android',
  '.ipa': 'ios',
  '.deb': 'linux',
  '.rpm': 'linux',
  '.AppImage': 'linux',
  '.snap': 'linux',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getDownloadFiles(downloadsDir: string): DownloadFile[] {
  if (!existsSync(downloadsDir)) return [];
  
  const supportedExtensions = Object.keys(PLATFORM_EXTENSIONS);
  const files = readdirSync(downloadsDir).filter(file => {
    const ext = extname(file);
    // Check exact extension match or AppImage (special case)
    return supportedExtensions.includes(ext) || file.endsWith('.AppImage');
  });
  
  return files.map(file => {
    const ext = file.endsWith('.AppImage') ? '.AppImage' : extname(file);
    const platform = PLATFORM_EXTENSIONS[ext] || 'universal';
    const filePath = join(downloadsDir, file);
    const stats = statSync(filePath);
    
    return {
      filename: file,
      platform,
      size: stats.size,
      displaySize: formatFileSize(stats.size),
    };
  }).sort((a, b) => {
    // Sort by platform priority: mac, windows, linux, android, ios, universal
    const platformOrder = ['mac', 'windows', 'linux', 'android', 'ios', 'universal'];
    return platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform);
  });
}

function scanExamples(): ExampleData[] {
  const examples: ExampleData[] = [];
  
  const dirs = readdirSync(examplesDir).filter(name => {
    const fullPath = join(examplesDir, name);
    return statSync(fullPath).isDirectory();
  });
  
  for (const dir of dirs) {
    const examplePath = join(examplesDir, dir);
    const demoDir = join(examplePath, 'demo');
    const showcaseYaml = join(examplePath, 'showcase.yaml');
    
    // Must have showcase.yaml
    if (!existsSync(showcaseYaml)) {
      console.log(`⚠️  Skipping ${dir}: has no showcase.yaml`);
      continue;
    }
    
    try {
      const yamlContent = readFileSync(showcaseYaml, 'utf-8');
      const metadata = parseYaml(yamlContent) as ShowcaseMetadata;
      if(metadata.disabled){
        console.log(`⚠️  Skipping ${dir}: marked as disabled in showcase.yaml`);
        continue;
      }
      
      // Validate required fields
      if (!metadata.name || !metadata.description || !metadata.tags || !metadata.difficulty) {
        console.log(`⚠️  Skipping ${dir}: showcase.yaml missing required fields`);
        continue;
      }
      
      // Get images from demo folder OR use default based on type
      let images = getImageFiles(demoDir);
      let useDefaultImage = false;
      
      if (images.length === 0 && metadata.type) {
        // No demo images but has type - use default image
        const defaultImage = DEFAULT_IMAGES[metadata.type];
        if (defaultImage && existsSync(join(defaultImagesDir, defaultImage))) {
          images = [defaultImage];
          useDefaultImage = true;
          console.log(`  🖼️  Using default ${metadata.type} image for ${dir}`);
        } else {
          console.log(`⚠️  Skipping ${dir}: no demo images and no default for type '${metadata.type}'`);
          continue;
        }
      } else if (images.length === 0) {
        console.log(`⚠️  Skipping ${dir}: has no demo images and no type specified`);
        continue;
      }
      
      // Determine habit files: use showcase.yaml habits if specified, otherwise auto-detect
      let habitFiles: string[] = [];
      if (metadata.habits && metadata.habits.length > 0) {
        // Use explicitly specified habits (validate they exist)
        habitFiles = metadata.habits.filter(file => {
          const fullPath = join(examplePath, file);
          if (!existsSync(fullPath)) {
            console.log(`  ⚠️  Habit file not found: ${file}`);
            return false;
          }
          return true;
        });
      } else {
        // Auto-detect from habits/ folder
        const habitsDir = join(examplePath, 'habits');
        if (existsSync(habitsDir) && statSync(habitsDir).isDirectory()) {
          habitFiles = readdirSync(habitsDir)
            .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
            .slice(0, 3)
            .map(f => `habits/${f}`);
        }
      }
      
      // Get download files from downloads/ folder
      const downloadsDir = join(examplePath, 'downloads');
      const downloads = getDownloadFiles(downloadsDir);
      
      examples.push({
        ...metadata,
        slug: dir,
        images,
        path: examplePath,
        keyFiles: getKeyFiles(examplePath),
        habitFiles,
        downloads,
        useDefaultImage,
      });
      
      const downloadInfo = downloads.length > 0 ? `, ${downloads.length} downloads` : '';
      console.log(`✅ Found: ${metadata.name} (${images.length} images, ${habitFiles.length} habits${downloadInfo})${useDefaultImage ? ' [default image]' : ''}`);
    } catch (err) {
      console.error(`❌ Error parsing ${dir}/showcase.yaml:`, (err as Error).message);
    }
  }
  
  return examples;
}

function copyShowcaseAssets(examples: ExampleData[]): void {
  console.log('\n📸 Copying showcase assets (images, habits, stack files)...');
  
  // Create showcase public folder if it doesn't exist (don't wipe existing content)
  mkdirSync(publicShowcaseDir, { recursive: true });
  
  for (const example of examples) {
    const destDir = join(publicShowcaseDir, example.slug);
    
    // Clean only the specific example's folder (not the entire showcase folder)
    if (existsSync(destDir)) {
      rmSync(destDir, { recursive: true });
    }
    mkdirSync(destDir, { recursive: true });
    
    // Copy demo images
    for (const image of example.images) {
      let srcPath: string;
      if (example.useDefaultImage) {
        // Use default image from showcase-defaults folder
        srcPath = join(defaultImagesDir, image);
      } else {
        // Use demo image from example folder
        srcPath = join(example.path, 'demo', image);
      }
      const destPath = join(destDir, image);
      copyFileSync(srcPath, destPath);
    }
    
    // Copy stack.yaml if exists
    const stackFile = join(example.path, 'stack.yaml');
    if (existsSync(stackFile)) {
      copyFileSync(stackFile, join(destDir, 'stack.yaml'));
    }
    
    // Copy habit files
    for (const habitFile of example.habitFiles) {
      const srcPath = join(example.path, habitFile);
      if (existsSync(srcPath)) {
        // Keep the filename only (flatten the path)
        const destFileName = basename(habitFile);
        copyFileSync(srcPath, join(destDir, destFileName));
      }
    }
    
    // Copy download files
    if (example.downloads.length > 0) {
      const downloadsDestDir = join(destDir, 'downloads');
      mkdirSync(downloadsDestDir, { recursive: true });
      
      for (const download of example.downloads) {
        const srcPath = join(example.path, 'downloads', download.filename);
        const destPath = join(downloadsDestDir, download.filename);
        copyFileSync(srcPath, destPath);
      }
    }
    
    const assetCount = example.images.length + example.habitFiles.length + example.downloads.length + (existsSync(stackFile) ? 1 : 0);
    const downloadNote = example.downloads.length > 0 ? ` [${example.downloads.length} downloads]` : '';
    console.log(`  📁 ${example.slug}/ (${assetCount} files)${example.useDefaultImage ? ' [default image]' : ''}${downloadNote}`);
  }
}

function generateLandingPage(example: ExampleData): string {
  const imagesList = example.images
    .map(img => `{ img: '/showcase/${example.slug}/${img}', caption: '${example.name}' }`)
    .join(',\n    ');
  
  const tagBadges = example.tags
    .map(tag => {
      const iconName = TAG_ICONS[tag.toLowerCase()] || DEFAULT_TAG_ICON;
      return `<span class="showcase-tag tag-${tag}"><component :is="${iconName}" :size="12" /> ${tag}</span>`;
    })
    .join(' ');
  
  const requirements = example.requirements?.length
    ? `\n## Requirements\n\n${example.requirements.map(r => `- ${r}`).join('\n')}\n`
    : '';
  
  const links = example.links
    ? Object.entries(example.links)
        .filter(([, url]) => url)
        .map(([type, url]) => `- [${type.charAt(0).toUpperCase() + type.slice(1)}](${url})`)
        .join('\n')
    : '';
  
  const linksSection = links ? `\n## Links\n\n${links}\n` : '';

  // Generate key files code-group section
  const keyFilesSection = example.keyFiles.length > 0
    ? `
## Key Files

::: code-group
${example.keyFiles.map(file => {
  const displayName = basename(file);
  return `<<< @/../showcase/${example.slug}/${file} [${displayName}]`;
}).join('\n\n')}
:::
`
    : '';

  // Use habit files from ExampleData (either from showcase.yaml or auto-detected)
  const habitFiles = example.habitFiles;
  
  // Generate tabs data for habit viewer using URLs (files are copied to public/showcase/{slug}/)
  const habitTabsArray = habitFiles.map(file => {
    const label = basename(file, extname(file));
    const fileName = basename(file);
    return `{ label: '${label}', url: '/showcase/${example.slug}/${fileName}' }`;
  }).join(',\n    ');
  
  const habitViewerSection = habitFiles.length > 0
    ? `

<hr style="clear:both;">

## Run Your .habit File

<Checklist name="dot-habit/mobile" title="Run on Mobile" icon="smartphone">

<!--@include: ../getting-started/checklists/dot-habit/mobile.md{3,}-->

</Checklist>

<Checklist name="dot-habit/desktop" title="Run on Desktop" icon="monitor">

<!--@include: ../getting-started/checklists/dot-habit/desktop.md{3,}-->

</Checklist>

<Checklist name="dot-habit/server" title="Run on Server" icon="server">

<!--@include: ../getting-started/checklists/dot-habit/server.md{3,}-->

</Checklist>

<Checklist name="dot-habit/serverless" title="Run Serverless" icon="cloud">

<!--@include: ../getting-started/checklists/dot-habit/serverless.md{3,}-->

</Checklist>

## Workflow Visualization

<HabitViewerTabs :tabs="habitTabs" :height="450" />
`
    : '';

  // Get unique icons needed for tags
  const tagIconsNeeded = [...new Set(example.tags.map(tag => TAG_ICONS[tag.toLowerCase()] || DEFAULT_TAG_ICON))];
  const iconImport = tagIconsNeeded.length > 0 
    ? `import { ${tagIconsNeeded.join(', ')} } from 'lucide-vue-next'`
    : '';

  // Generate downloads data for the component
  const downloadsData = example.downloads.map(d => 
    `{ filename: '${d.filename}', platform: '${d.platform}', size: ${d.size}, displaySize: '${d.displaySize}' }`
  ).join(',\n    ');
  
  const appDownloadsSection = example.downloads.length > 0
    ? `
## App Downloads

<DownloadBuilds :downloads="downloads" basePath="/showcase/${example.slug}/downloads" />
`
    : '';

  // Build script setup content
  const scriptSetupContent = [
    iconImport,
    `const images = [\n    ${imagesList}\n]`,
    habitFiles.length > 0 ? `const habitTabs = [\n    ${habitTabsArray}\n]` : '',
    example.downloads.length > 0 ? `const downloads = [\n    ${downloadsData}\n]` : '',
  ].filter(Boolean).join('\n\n');

  return `---
title: "${example.name}"
description: "${example.description}"
aside: false
---

<script setup>
${scriptSetupContent}
</script>

# ${example.name}

<div class="showcase-header">
  <div class="showcase-meta">
    <div class="meta-left">
      <span class="difficulty-pill difficulty-${example.difficulty}">
        <span class="difficulty-dot"></span>
        ${example.difficulty.charAt(0).toUpperCase() + example.difficulty.slice(1)}
      </span>
      <span class="meta-divider"></span>
      <div class="tags">${tagBadges}</div>
    </div>
    <div class="meta-right">
      <DownloadExample examplePath="${example.slug}" />
    </div>
  </div>
</div>

<div class="gallery-container">
  <ShowcaseHero :images="images" />
</div>

<p class="showcase-description">${example.description}</p>

${example.longDescription || ''}
${appDownloadsSection}${habitViewerSection}${requirements}${keyFilesSection}
## Quick Start

<ExampleRunner examplePath="${example.slug}" />

<DownloadExample examplePath="${example.slug}" />${linksSection}
<style>
.showcase-header {
  margin: 20px 0 28px;
}

.showcase-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-right {
  flex-shrink: 0;
}

.meta-divider {
  width: 1px;
  height: 20px;
  background: var(--vp-c-divider);
}

.difficulty-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8em;
  font-weight: 500;
  letter-spacing: 0.01em;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
}

.difficulty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.difficulty-beginner .difficulty-dot {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.4);
}

.difficulty-intermediate .difficulty-dot {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
}

.difficulty-advanced .difficulty-dot {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.4);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.showcase-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 0.75em;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  transition: all 0.15s ease;
}

.showcase-tag:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.showcase-tag svg {
  opacity: 0.7;
}

.showcase-description {
  font-size: 1.1em;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  margin: 0 0 24px;
}

.gallery-container {
  float: right;
  width: 400px;
  margin-left: 24px;
  margin-bottom: 16px;
}

.vp-doc h2 {
  border-top-width: 0;
}

@media (max-width: 768px) {
  .showcase-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .meta-divider {
    display: none;
  }
  
  .gallery-container {
    float: none;
    width: 100%;
    margin: 0 0 20px;
  }
}
</style>
`;
}

function generateIndexPage(examples: ExampleData[]): string {
  // Sort featured first, then by name
  const sortedExamples = [...examples].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });
  
  const examplesJson = JSON.stringify(sortedExamples.map(e => ({
    slug: e.slug,
    name: e.name,
    description: e.description,
    tags: e.tags,
    difficulty: e.difficulty,
    featured: e.featured || false,
    thumbnail: `/showcase/${e.slug}/${e.images[0]}`,
    imageCount: e.images.length,
  })));

  return `---
title: "Showcase"
description: "Explore ready-to-use Habits examples with beautiful UIs and powerful AI integrations"
aside: false
---

<script setup>
const examples = ${examplesJson}
</script>

<div class="showcase-index-header">
  <h1>Showcase</h1>
  <p class="showcase-subtitle">Ready-to-use examples showcasing what you can build with Habits</p>
  <p class="showcase-note">Each example includes source code, demo images, and one-click deployment.</p>
</div>

<ShowcaseGrid :showcases="examples" />

<style>
.showcase-index-header {
  text-align: center;
  padding: 32px 0 40px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.showcase-index-header h1 {
  font-size: 2.5em;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  color: var(--vp-c-text-1);
}

.showcase-subtitle {
  font-size: 1.2em;
  color: var(--vp-c-text-2);
  margin: 0 0 8px;
  font-weight: 400;
}

.showcase-note {
  font-size: 0.9em;
  color: var(--vp-c-text-3);
  margin: 0;
}

.vp-doc > h1:first-of-type {
  display: none;
}
</style>
`;
}

function generateMarkdownFiles(examples: ExampleData[]): void {
  console.log('\n📝 Generating markdown files...');
  
  // Create showcase directory if it doesn't exist (don't wipe existing content)
  mkdirSync(showcaseDir, { recursive: true });
  
  // Generate individual pages (only for examples with showcase.yaml + demo images)
  for (const example of examples) {
    const content = generateLandingPage(example);
    const filePath = join(showcaseDir, `${example.slug}.md`);
    writeFileSync(filePath, content);
    console.log(`  📄 ${example.slug}.md`);
  }
  
  // Generate index page
  const indexContent = generateIndexPage(examples);
  writeFileSync(join(showcaseDir, 'index.md'), indexContent);
  console.log(`  📄 index.md`);
}

function generateZipFiles(examples: ExampleData[]): void {
  console.log('\n📦 Generating download zip files...');
  
  for (const example of examples) {
    const zipName = `${example.slug}.zip`;
    const destDir = join(publicShowcaseDir, example.slug);
    const zipPath = join(destDir, zipName);
    
    // Ensure destination directory exists
    mkdirSync(destDir, { recursive: true });
    
    // Remove existing zip if present
    if (existsSync(zipPath)) {
      rmSync(zipPath);
    }
    
    try {
      // Create zip from example directory, excluding .env and existing .zip files
      execSync(
        `zip -r "${zipPath}" . -x ".env" -x "*.zip" -x "node_modules/*" -x ".git/*"`,
        { cwd: example.path, stdio: 'pipe' }
      );
      console.log(`  📦 ${example.slug}/${zipName}`);
    } catch (err) {
      console.error(`  ❌ Failed to create ${zipName}:`, (err as Error).message);
    }
  }
}

/**
 * Generate .habit files for each showcase example (without env).
 * Uses the pack command to create self-contained portable habit files.
 * Runs sequentially to avoid tsx/npx concurrency conflicts.
 */
async function generateHabitFiles(examples: ExampleData[]): Promise<void> {
  console.log('\n📦 Generating .habit files...');
  
  const tasks = examples.map(example => async () => {
    const stackPath = join(example.path, 'stack.yaml');
    
    // Skip if no stack.yaml exists
    if (!existsSync(stackPath)) {
      console.log(`  ⚠️  Skipping ${example.slug}: no stack.yaml found`);
      return;
    }
    
    const habitName = `${example.slug}.habit`;
    const destDir = join(publicShowcaseDir, example.slug);
    const habitPath = join(destDir, habitName);
    
    // Ensure destination directory exists
    mkdirSync(destDir, { recursive: true });
    
    // Remove existing .habit if present
    if (existsSync(habitPath)) {
      rmSync(habitPath);
    }
    
    const relativeStackPath = `showcase/${example.slug}/stack.yaml`;
    
    console.log(`  ⏳ Creating .habit for ${example.slug}...`);
    
    try {
      // Use execSync for reliable synchronous execution
      const command = `npx tsx packages/habits/app/src/main.ts pack --format habit --config "${relativeStackPath}" -o "${habitPath}"`;
      execSync(command, { 
        cwd: rootDir, 
        stdio: 'pipe',
        timeout: 120000 // 2 minute timeout per file
      });
      
      // Verify file was actually created
      if (existsSync(habitPath)) {
        console.log(`  📦 ${example.slug}/${habitName}`);
      } else {
        console.error(`  ⚠️  Pack completed but file not created: ${habitName}`);
      }
    } catch (err: unknown) {
      const error = err as { status?: number; stderr?: Buffer; stdout?: Buffer };
      console.error(`  ⚠️  Failed to create ${habitName} (exit ${error.status || 'unknown'})`);
      if (error.stderr) console.error(`     stderr: ${error.stderr.toString().slice(0, 300)}`);
      if (error.stdout) console.error(`     stdout: ${error.stdout.toString().slice(0, 300)}`);
    }
  });
  
  // Run sequentially (execSync is blocking anyway)
  for (const task of tasks) {
    await task();
  }
}

function generateDataFile(examples: ExampleData[]): void {
  console.log('\n💾 Generating data files...');
  
  // Sort featured first, then by name
  const sortedExamples = [...examples].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Showcase data for Vue components
  const data = sortedExamples.map(e => ({
    slug: e.slug,
    name: e.name,
    description: e.description,
    tags: e.tags,
    difficulty: e.difficulty,
    featured: e.featured || false,
    thumbnail: `/showcase/${e.slug}/${e.images[0]}`,
    imageCount: e.images.length,
  }));
  
  // Write JSON file for Vue components to import
  const dataFilePath = join(docsDir, '.vitepress/theme/data/showcase-data.json');
  mkdirSync(join(docsDir, '.vitepress/theme/data'), { recursive: true });
  writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  console.log('  📄 .vitepress/theme/data/showcase-data.json');
  
  // Sidebar items for VitePress config
  const sidebarItems = [
    { text: 'Browse All', link: '/showcase/' },
    ...examples.map(e => ({
      text: e.name,
      link: `/showcase/${e.slug}`,
    }))
  ];
}

/**
 * Generate public/showcase/index.json with all .habit files info
 * for the Cortex app to fetch and display as a browsable list.
 */
function generateHabitsIndexJson(examples: ExampleData[]): void {
  console.log('\n📋 Generating habits index JSON...');
  
  const habitsIndex: Array<{
    slug: string;
    name: string;
    description: string;
    habitUrl: string;
    thumbnail: string;
    tags: string[];
    difficulty: string;
  }> = [];
  
  for (const example of examples) {
    const habitFilename = `${example.slug}.habit`;
    const habitPath = join(publicShowcaseDir, example.slug, habitFilename);
    
    // Only include if .habit file exists
    if (existsSync(habitPath)) {
      habitsIndex.push({
        slug: example.slug,
        name: example.name,
        description: example.description,
        habitUrl: `/showcase/${example.slug}/${habitFilename}`,
        thumbnail: `/showcase/${example.slug}/${example.images[0]}`,
        tags: example.tags,
        difficulty: example.difficulty,
      });
    }
  }
  
  // Sort by name
  habitsIndex.sort((a, b) => a.name.localeCompare(b.name));
  
  // Write to public/showcase/index.json
  const indexPath = join(publicShowcaseDir, 'index.json');
  writeFileSync(indexPath, JSON.stringify(habitsIndex, null, 2));
  console.log(`  📄 public/showcase/index.json (${habitsIndex.length} habits)`);
}

async function main(): Promise<void> {
  console.log('🛒 Generating Habits Showcase...\n');
  
  // Scan for eligible examples
  const examples = scanExamples();
  
  if (examples.length === 0) {
    console.log('\n⚠️  No eligible examples found.');
    console.log('   Examples need: demo/ folder with images + showcase.yaml');
    process.exit(0);
  }
  
  console.log(`\n📦 Found ${examples.length} showcase examples`);
  
  // Copy showcase assets (images, habits, stack files) to public folder
  copyShowcaseAssets(examples);
  
  // Generate .habit files (portable self-contained packages)
  await generateHabitFiles(examples);
  
  // Generate zip files for download
  generateZipFiles(examples);
  
  // Generate markdown pages
  generateMarkdownFiles(examples);
  
  // Generate JSON data for components
  generateDataFile(examples);
  
  // Generate habits index for Cortex app
  generateHabitsIndexJson(examples);
  
  console.log('\n✨ Showcase generation complete!');
  console.log(`   ${examples.length} examples processed`);
  console.log(`   Output: docs/showcase/`);
}

main().catch(console.error);
