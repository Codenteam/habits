#!/usr/bin/env npx tsx
/**
 * Generate showcase pages for examples with demo images.
 * Scans examples/ for directories containing demo/ folder and showcase.yaml.
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
import { execSync } from 'child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const examplesDir = join(rootDir, 'examples');
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

interface ExampleData extends ShowcaseMetadata {
  slug: string;
  images: string[];
  path: string;
  keyFiles: string[];
  habitFiles: string[];
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
      
      examples.push({
        ...metadata,
        slug: dir,
        images,
        path: examplePath,
        keyFiles: getKeyFiles(examplePath),
        habitFiles,
        useDefaultImage,
      });
      
      console.log(`✅ Found: ${metadata.name} (${images.length} images, ${habitFiles.length} habits)${useDefaultImage ? ' [default image]' : ''}`);
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
    
    const assetCount = example.images.length + example.habitFiles.length + (existsSync(stackFile) ? 1 : 0);
    console.log(`  📁 ${example.slug}/ (${assetCount} files)${example.useDefaultImage ? ' [default image]' : ''}`);
  }
}

function generateLandingPage(example: ExampleData): string {
  const imagesList = example.images
    .map(img => `{ img: '/showcase/${example.slug}/${img}', caption: '${example.name}' }`)
    .join(',\n    ');
  
  const tagBadges = example.tags
    .map(tag => {
      const iconName = TAG_ICONS[tag.toLowerCase()] || DEFAULT_TAG_ICON;
      return `<span class="showcase-tag tag-${tag}"><component :is="${iconName}" :size="14" /> ${tag}</span>`;
    })
    .join(' ');
  
  const difficultyBadge = `<span class="showcase-difficulty difficulty-${example.difficulty}">${example.difficulty.charAt(0).toUpperCase() + example.difficulty.slice(1)}</span>`;
  
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
  return `<<< @/../examples/${example.slug}/${file} [${displayName}]`;
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
## Workflow Visualization

<HabitViewerTabs :tabs="habitTabs" :height="450" />
`
    : '';

  // Get unique icons needed for tags
  const tagIconsNeeded = [...new Set(example.tags.map(tag => TAG_ICONS[tag.toLowerCase()] || DEFAULT_TAG_ICON))];
  const iconImport = tagIconsNeeded.length > 0 
    ? `import { ${tagIconsNeeded.join(', ')} } from 'lucide-vue-next'`
    : '';

  // Build script setup content
  const scriptSetupContent = [
    iconImport,
    `const images = [\n    ${imagesList}\n]`,
    habitFiles.length > 0 ? `const habitTabs = [\n    ${habitTabsArray}\n]` : '',
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
<div class="showcase-meta">
  <span class="difficulty-badge difficulty-${example.difficulty}">${difficultyBadge}</span>
  <span class="tags">${tagBadges}</span>
  <DownloadExample examplePath="${example.slug}" />
</div>

<div class="gallery-container" >
<ShowcaseHero :images="images" />
</div>

>${example.description}

${example.longDescription || ''}
${habitViewerSection}${requirements}${keyFilesSection}
## Quick Start

<ExampleRunner examplePath="${example.slug}" />

<DownloadExample examplePath="${example.slug}" />
${linksSection}
<style>
.showcase-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0 24px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  justify-content: space-between;
}
.showcase-tag {
    display: flex;
    gap: 5px;
    align-items: center;
  }
.difficulty-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85em;
}
  .gallery-container {
  float: right;
  width: 400px;
  }

.difficulty-beginner {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.difficulty-intermediate {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}

.difficulty-advanced {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tags code {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
}

.vp-doc h2 {
    border-top-width:0px;
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

# Habits Showcase

Discover production-ready examples showcasing what you can build with Habits.
Each example includes source code, demo images, and one-click deployment.

<ShowcaseGrid :examples="examples" />

<style>
.vp-doc h1 {
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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

function generateDataFile(examples: ExampleData[]): void {
  console.log('\n💾 Generating data files...');
  
  // Showcase data for Vue components
  const data = examples.map(e => ({
    slug: e.slug,
    name: e.name,
    description: e.description,
    tags: e.tags,
    difficulty: e.difficulty,
    featured: e.featured || false,
    images: e.images.map(img => `/showcase/${e.slug}/${img}`),
  }));
  
  
  // Sidebar items for VitePress config
  const sidebarItems = [
    { text: 'Browse All', link: '/showcase/' },
    ...examples.map(e => ({
      text: e.name,
      link: `/showcase/${e.slug}`,
    }))
  ];
}

function main(): void {
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
  
  // Generate zip files for download
  generateZipFiles(examples);
  
  // Generate markdown pages
  generateMarkdownFiles(examples);
  
  // Generate JSON data for components
  generateDataFile(examples);
  
  console.log('\n✨ Showcase generation complete!');
  console.log(`   ${examples.length} examples processed`);
  console.log(`   Output: docs/showcase/`);
}

main();
