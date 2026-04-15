#!/usr/bin/env npx tsx
/**
 * Generate bits documentation pages and gallery.
 * Scans nodes/bits/@ha-bits/ for bit packages with catalog: true in package.json.
 * 
 * Usage: npx tsx scripts/generate-bits.ts
 * 
 * Output:
 *   - docs/bits/<bit-slug>.md - Individual bit pages
 *   - docs/bits/index.md - Bits gallery with search/filter
 *   - docs/.vitepress/theme/data/bits-data.json - Data for Vue components
 * 
 * Package.json schema for bits:
 *   {
 *     "name": "@ha-bits/bit-example",
 *     "description": "...",
 *     "keywords": ["bits", "habits", "ai", "..."],
 *     "habits": {
 *       "catalog": true,     // Include in gallery/pages
 *       "featured": false,   // Show on homepage
 *       "icon": "Sparkles"   // Lucide icon name (optional)
 *     }
 *   }
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';
import { parse as parseYaml } from 'yaml';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const bitsDir = join(rootDir, 'nodes/bits/@ha-bits');
const examplesDir = join(rootDir, 'showcase');
const docsDir = join(rootDir, 'docs');
const bitsPagesDir = join(docsDir, 'bits');
const dataDir = join(docsDir, '.vitepress/theme/data');

// ============================================================================
// Types
// ============================================================================

interface HabitsConfig {
  catalog?: boolean;
  featured?: boolean;
  icon?: string;
}

interface PackageJson {
  name: string;
  version?: string;
  description?: string;
  keywords?: string[];
  habits?: HabitsConfig;
}

interface ActionInfo {
  name: string;
  displayName: string;
  description: string;
}

interface TriggerInfo {
  name: string;
  displayName: string;
  description: string;
}

interface BitData {
  slug: string;
  packageName: string;
  name: string;
  displayName: string;
  description: string;
  version: string;
  categories: string[];
  featured: boolean;
  icon: string;
  actions: ActionInfo[];
  triggers: TriggerInfo[];
  showcases: string[];  // Slugs of showcases that use this bit
  hasReadme: boolean;
  downloads: number;  // Lifetime npm downloads
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format download count for display (e.g., 1234 -> "1.2K", 1234567 -> "1.2M")
 * Returns "-" for 0 (placeholder when downloads fetched separately)
 */
function formatDownloads(count: number): string {
  if (count === 0) {
    return '-';
  }
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
}

/**
 * Load download stats from bits-stats.json if it exists.
 * Returns a map of packageName -> downloads count.
 */
function loadDownloadStats(): Record<string, number> {
  const statsPath = join(docsDir, 'public/bits-stats.json');
  if (!existsSync(statsPath)) {
    console.log('ℹ️  No bits-stats.json found. Run "npx tsx scripts/update-bits-stats.ts" first for download counts.');
    return {};
  }
  try {
    const data = JSON.parse(readFileSync(statsPath, 'utf-8'));
    const stats: Record<string, number> = {};
    for (const [pkg, info] of Object.entries(data.stats || {})) {
      stats[pkg] = (info as { downloads: number }).downloads;
    }
    console.log(`📊 Loaded download stats for ${Object.keys(stats).length} packages`);
    return stats;
  } catch (err) {
    console.warn('⚠️  Failed to load bits-stats.json:', (err as Error).message);
    return {};
  }
}

// ============================================================================
// Category/Icon mappings
// ============================================================================

// Keywords to exclude from categories (internal/structural)
const EXCLUDED_KEYWORDS = [
  'bits', 'habits', 'type:bit', 'scope:bits', 'bit', 
  'module', 'workflow', 'node'
];

// Map categories to Lucide icons
const CATEGORY_ICONS: Record<string, string> = {
  ai: 'Brain',
  openai: 'Sparkles',
  anthropic: 'Sparkles',
  intersect: 'Sparkles',
  database: 'Database',
  storage: 'HardDrive',
  mongodb: 'Database',
  mysql: 'Database',
  email: 'Mail',
  imap: 'Mail',
  smtp: 'Mail',
  discord: 'MessageCircle',
  slack: 'MessageSquare',
  telegram: 'Send',
  whatsapp: 'MessageCircle',
  github: 'Github',
  filesystem: 'FolderOpen',
  files: 'File',
  http: 'Globe',
  api: 'Server',
  auth: 'Shield',
  jwt: 'Key',
  cookie: 'Cookie',
  crm: 'Users',
  agent: 'Bot',
  langchain: 'Link',
  mcp: 'Plug',
  conditional: 'GitBranch',
  'flow-control': 'GitBranch',
  'if': 'GitBranch',
  loop: 'Repeat',
  shell: 'Terminal',
  text: 'Type',
  string: 'Type',
  json: 'Braces',
  'hello-world': 'Hand',
  demo: 'Play',
};

const DEFAULT_ICON = 'Package';

// ============================================================================
// Scanning & Extraction
// ============================================================================

/**
 * Extract categories from package.json keywords
 */
function extractCategories(keywords: string[] = []): string[] {
  return keywords
    .map(k => k.toLowerCase())
    .filter(k => !EXCLUDED_KEYWORDS.includes(k))
    .slice(0, 5); // Limit to 5 categories
}

/**
 * Get icon for a bit based on its categories or explicit config
 */
function getIcon(habitsConfig?: HabitsConfig, categories: string[] = []): string {
  // Explicit icon takes precedence
  if (habitsConfig?.icon) return habitsConfig.icon;
  
  // Find first matching category icon
  for (const cat of categories) {
    if (CATEGORY_ICONS[cat]) return CATEGORY_ICONS[cat];
  }
  
  return DEFAULT_ICON;
}

/**
 * Parse src/index.ts to extract createBit metadata, actions, and triggers
 */
function parseIndexTs(bitPath: string): {
  displayName: string;
  description: string;
  actions: ActionInfo[];
  triggers: TriggerInfo[];
} {
  const indexPath = join(bitPath, 'src/index.ts');
  const result = {
    displayName: '',
    description: '',
    actions: [] as ActionInfo[],
    triggers: [] as TriggerInfo[],
  };
  
  if (!existsSync(indexPath)) {
    return result;
  }
  
  try {
    const content = readFileSync(indexPath, 'utf-8');
    
    // Extract displayName from createBit
    const displayNameMatch = content.match(/displayName:\s*['"`]([^'"`]+)['"`]/);
    if (displayNameMatch) {
      result.displayName = displayNameMatch[1];
    }
    
    // Extract description from createBit (but not from individual actions)
    // Look for description right after displayName in createBit call
    const createBitMatch = content.match(/createBit\s*\(\s*\{([^}]+displayName[^}]+)\}/s);
    if (createBitMatch) {
      const createBitBlock = createBitMatch[1];
      const descMatch = createBitBlock.match(/^\s*description:\s*['"`]([^'"`]+)['"`]/m);
      if (descMatch) {
        result.description = descMatch[1];
      }
    }
    
    // Extract actions array content
    const actionsMatch = content.match(/actions:\s*\[([^\]]+)\]/s);
    if (actionsMatch) {
      const actionsBlock = actionsMatch[1];
      // Find imported action names
      const actionNames = actionsBlock
        .split(',')
        .map(s => s.trim())
        .filter(s => s && !s.includes('createCustomApiCallAction'));
      
      // For each action, try to find its definition in lib/actions/
      for (const actionName of actionNames) {
        const actionInfo = findActionInfo(bitPath, actionName, content);
        if (actionInfo) {
          result.actions.push(actionInfo);
        }
      }
    }
    
    // Extract triggers (similar pattern)
    const triggersMatch = content.match(/triggers:\s*\[([^\]]*)\]/s);
    if (triggersMatch) {
      const triggersBlock = triggersMatch[1].trim();
      if (triggersBlock && triggersBlock !== '') {
        // Find imported trigger names
        const triggerNames = triggersBlock
          .split(',')
          .map(s => s.trim())
          .filter(s => s);
        
        for (const triggerName of triggerNames) {
          const triggerInfo = findTriggerInfo(bitPath, triggerName, content);
          if (triggerInfo) {
            result.triggers.push(triggerInfo);
          }
        }
      }
    }
    
    // For simpler bits without createBit pattern, look for actions object
    if (result.actions.length === 0) {
      const simpleActionsMatch = content.match(/actions:\s*\{([^}]+)\}/s);
      if (simpleActionsMatch) {
        result.actions = parseSimpleActions(simpleActionsMatch[1]);
      }
    }
    
  } catch (err) {
    console.error(`  ⚠️  Error parsing ${indexPath}:`, (err as Error).message);
  }
  
  return result;
}

/**
 * Find action info by checking lib/actions/ files or inline definitions
 */
function findActionInfo(bitPath: string, actionVarName: string, indexContent: string): ActionInfo | null {
  // First, check if we can find the import and then the file
  const importMatch = indexContent.match(
    new RegExp(`import\\s*\\{[^}]*\\b${actionVarName}\\b[^}]*\\}\\s*from\\s*['"\`]([^'"\`]+)['"\`]`)
  );
  
  if (importMatch) {
    const importPath = importMatch[1];
    const srcDir = join(bitPath, 'src');
    const result = resolveImportAndExtractAction(srcDir, importPath, actionVarName);
    if (result) return result;
  }
  
  // Try to find inline definition in index.ts
  return extractActionFromContent(indexContent, actionVarName);
}

/**
 * Resolve import path (handling barrel exports) and extract action info
 * @param baseDir - The directory to resolve relative imports from
 * @param importPath - The import path (e.g., './lib/actions' or './run-agent')
 * @param actionVarName - The variable name to find
 */
function resolveImportAndExtractAction(baseDir: string, importPath: string, actionVarName: string): ActionInfo | null {
  let targetPath: string;
  
  if (importPath.startsWith('./')) {
    targetPath = join(baseDir, importPath.slice(2));
  } else if (importPath.startsWith('../')) {
    targetPath = join(baseDir, importPath);
  } else {
    return null;
  }
  
  // Try direct file first (e.g., ./lib/actions/run-agent.ts)
  const directFilePath = targetPath + '.ts';
  if (existsSync(directFilePath)) {
    const content = readFileSync(directFilePath, 'utf-8');
    return extractActionFromContent(content, actionVarName);
  }
  
  // Try barrel/index.ts (e.g., ./lib/actions -> ./lib/actions/index.ts)
  const indexFilePath = join(targetPath, 'index.ts');
  if (existsSync(indexFilePath)) {
    const indexContent = readFileSync(indexFilePath, 'utf-8');
    
    // Look for re-export: export { actionName } from './action-file'
    const reExportMatch = indexContent.match(
      new RegExp(`export\\s*\\{[^}]*\\b${actionVarName}\\b[^}]*\\}\\s*from\\s*['"\`]([^'"\`]+)['"\`]`)
    );
    
    if (reExportMatch) {
      const reExportPath = reExportMatch[1];
      // Recursively resolve the re-export, using the barrel's directory as base
      return resolveImportAndExtractAction(dirname(indexFilePath), reExportPath, actionVarName);
    }
    
    // Maybe it's defined inline in the barrel file
    return extractActionFromContent(indexContent, actionVarName);
  }
  
  return null;
}

/**
 * Extract action info from file content
 */
function extractActionFromContent(content: string, varName: string): ActionInfo | null {
  // Look for createAction with the variable name
  const patterns = [
    // export const varName = createAction({...})
    new RegExp(`export\\s+const\\s+${varName}\\s*=\\s*createAction\\s*\\(\\s*\\{([\\s\\S]*?)^\\}\\s*\\)`, 'm'),
    // const varName = createAction({...})
    new RegExp(`const\\s+${varName}\\s*=\\s*createAction\\s*\\(\\s*\\{([\\s\\S]*?)^\\}\\s*\\)`, 'm'),
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const block = match[1];
      const name = block.match(/name:\s*['"`]([^'"`]+)['"`]/)?.[1] || varName;
      const displayName = block.match(/displayName:\s*['"`]([^'"`]+)['"`]/)?.[1] || name;
      const description = block.match(/description:\s*['"`]([^'"`]+)['"`]/)?.[1] || '';
      
      return { name, displayName, description };
    }
  }
  
  return null;
}

/**
 * Similar to findActionInfo but for triggers
 */
function findTriggerInfo(bitPath: string, triggerVarName: string, indexContent: string): TriggerInfo | null {
  // First, check if we can find the import and then the file
  const importMatch = indexContent.match(
    new RegExp(`import\\s*\\{[^}]*\\b${triggerVarName}\\b[^}]*\\}\\s*from\\s*['"\`]([^'"\`]+)['"\`]`)
  );
  
  if (importMatch) {
    const importPath = importMatch[1];
    const srcDir = join(bitPath, 'src');
    const result = resolveImportAndExtractTrigger(srcDir, importPath, triggerVarName);
    if (result) return result;
  }
  
  return extractTriggerFromContent(indexContent, triggerVarName);
}

/**
 * Resolve import path (handling barrel exports) and extract trigger info
 * @param baseDir - The directory to resolve relative imports from
 * @param importPath - The import path (e.g., './lib/triggers' or './new-email')
 * @param triggerVarName - The variable name to find
 */
function resolveImportAndExtractTrigger(baseDir: string, importPath: string, triggerVarName: string): TriggerInfo | null {
  let targetPath: string;
  
  if (importPath.startsWith('./')) {
    targetPath = join(baseDir, importPath.slice(2));
  } else if (importPath.startsWith('../')) {
    targetPath = join(baseDir, importPath);
  } else {
    return null;
  }
  
  // Try direct file first
  const directFilePath = targetPath + '.ts';
  if (existsSync(directFilePath)) {
    const content = readFileSync(directFilePath, 'utf-8');
    return extractTriggerFromContent(content, triggerVarName);
  }
  
  // Try barrel/index.ts
  const indexFilePath = join(targetPath, 'index.ts');
  if (existsSync(indexFilePath)) {
    const indexContent = readFileSync(indexFilePath, 'utf-8');
    
    // Look for re-export
    const reExportMatch = indexContent.match(
      new RegExp(`export\\s*\\{[^}]*\\b${triggerVarName}\\b[^}]*\\}\\s*from\\s*['"\`]([^'"\`]+)['"\`]`)
    );
    
    if (reExportMatch) {
      const reExportPath = reExportMatch[1];
      return resolveImportAndExtractTrigger(dirname(indexFilePath), reExportPath, triggerVarName);
    }
    
    return extractTriggerFromContent(indexContent, triggerVarName);
  }
  
  return null;
}

/**
 * Extract trigger info from file content
 */
function extractTriggerFromContent(content: string, varName: string): TriggerInfo | null {
  const patterns = [
    new RegExp(`export\\s+const\\s+${varName}\\s*=\\s*createTrigger\\s*\\(\\s*\\{([\\s\\S]*?)^\\}\\s*\\)`, 'm'),
    new RegExp(`const\\s+${varName}\\s*=\\s*createTrigger\\s*\\(\\s*\\{([\\s\\S]*?)^\\}\\s*\\)`, 'm'),
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const block = match[1];
      const name = block.match(/name:\s*['"`]([^'"`]+)['"`]/)?.[1] || varName;
      const displayName = block.match(/displayName:\s*['"`]([^'"`]+)['"`]/)?.[1] || name;
      const description = block.match(/description:\s*['"`]([^'"`]+)['"`]/)?.[1] || '';
      
      return { name, displayName, description };
    }
  }
  
  return null;
}

/**
 * Parse simple actions object (for bits without createBit pattern)
 */
function parseSimpleActions(actionsBlock: string): ActionInfo[] {
  const actions: ActionInfo[] = [];
  
  // Look for action definitions like: sendMessage: { name: '...', displayName: '...', ... }
  const actionPattern = /(\w+):\s*\{([^}]+name:[^}]+)\}/g;
  let match;
  
  while ((match = actionPattern.exec(actionsBlock)) !== null) {
    const block = match[2];
    const name = block.match(/name:\s*['"`]([^'"`]+)['"`]/)?.[1] || match[1];
    const displayName = block.match(/displayName:\s*['"`]([^'"`]+)['"`]/)?.[1] || name;
    const description = block.match(/description:\s*['"`]([^'"`]+)['"`]/)?.[1] || '';
    
    actions.push({ name, displayName, description });
  }
  
  return actions;
}

/**
 * Find showcases that use this bit by scanning example YAML files
 */
function findShowcasesUsingBit(packageName: string): string[] {
  const showcases: string[] = [];
  
  try {
    // Scan all yaml files in showcase/
    const yamlFiles = globSync('**/*.yaml', { cwd: examplesDir, absolute: true });
    
    for (const yamlFile of yamlFiles) {
      const content = readFileSync(yamlFile, 'utf-8');
      
      // Check if this file references the bit
      if (content.includes(packageName)) {
        // Extract example slug (parent directory name)
        const relativePath = yamlFile.replace(examplesDir + '/', '');
        const slug = relativePath.split('/')[0];
        
        // Check if this example has showcase.yaml (is a showcase) and isn't disabled
        const showcaseYaml = join(examplesDir, slug, 'showcase.yaml');

        if (existsSync(showcaseYaml) && !showcases.includes(slug)) {
          try {
            const showcaseContent = readFileSync(showcaseYaml, 'utf-8');
            const showcaseData = parseYaml(showcaseContent);
            if (!showcaseData.disabled) {
              showcases.push(slug);
            }
          } catch {
            // If we can't parse the yaml, skip it
          }
        }
      }
    }
  } catch (err) {
    console.error(`  ⚠️  Error scanning for showcases:`, (err as Error).message);
  }
  
  return showcases;
}

/**
 * Scan all bits and extract their data (including npm downloads)
 */
async function scanBits(): Promise<BitData[]> {
  const bits: BitData[] = [];
  
  if (!existsSync(bitsDir)) {
    console.error(`❌ Bits directory not found: ${bitsDir}`);
    return bits;
  }
  
  const bitDirs = readdirSync(bitsDir).filter(name => {
    const fullPath = join(bitsDir, name);
    return statSync(fullPath).isDirectory() && name.startsWith('bit-');
  });
  
  // First pass: collect all bit metadata
  const bitCandidates: Array<{
    dir: string;
    packageJson: PackageJson;
    bitPath: string;
  }> = [];
  
  for (const dir of bitDirs) {
    const bitPath = join(bitsDir, dir);
    const packageJsonPath = join(bitPath, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
      console.log(`  ⚠️  Skipping ${dir}: no package.json`);
      continue;
    }
    
    try {
      const packageJson: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      // Check if bit should be included in catalog
      const habitsConfig = packageJson.habits || {};
      if (habitsConfig.catalog === false) {
        console.log(`  ⏭️  Skipping ${dir}: catalog disabled`);
        continue;
      }
      
      bitCandidates.push({ dir, packageJson, bitPath });
    } catch (err) {
      console.error(`❌ Error processing ${dir}:`, (err as Error).message);
    }
  }

  // Load download stats from bits-stats.json (if available)
  const downloadStats = loadDownloadStats();

  // Build BitData for each candidate
  for (let i = 0; i < bitCandidates.length; i++) {
    const { packageJson, bitPath } = bitCandidates[i];

    try {
      const habitsConfig = packageJson.habits || {};

      // Extract categories from keywords
      const categories = extractCategories(packageJson.keywords);

      // Parse index.ts for actions/triggers
      const parsedIndex = parseIndexTs(bitPath);

      // Get icon
      const icon = getIcon(habitsConfig, categories);

      // Create slug from package name
      const slug = packageJson.name.replace('@ha-bits/', '');

      // Find showcases using this bit
      const showcases = findShowcasesUsingBit(packageJson.name);

      // Check for README
      const hasReadme = existsSync(join(bitPath, 'README.md'));

      // Get downloads from stats (or 0 if not available)
      const downloads = downloadStats[packageJson.name] || 0;

      const bitData: BitData = {
        slug,
        packageName: packageJson.name,
        name: slug.replace('bit-', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        displayName: parsedIndex.displayName || packageJson.name.replace('@ha-bits/bit-', ''),
        description: parsedIndex.description || packageJson.description || '',
        version: packageJson.version || '1.0.0',
        categories,
        featured: habitsConfig.featured ?? false,
        icon,
        actions: parsedIndex.actions,
        triggers: parsedIndex.triggers,
        showcases,
        hasReadme,
        downloads,
      };

      bits.push(bitData);
      console.log(`✅ ${bitData.displayName}: ${bitData.actions.length} actions, ${bitData.triggers.length} triggers, ${showcases.length} showcases`);
      
    } catch (err) {
      console.error(`❌ Error processing ${packageJson.name}:`, (err as Error).message);
    }
  }
  
  return bits;
}

// ============================================================================
// Generation Functions
// ============================================================================

/**
 * Generate bits-data.json for Vue components
 */
function generateDataFile(bits: BitData[]): void {
  console.log('\n💾 Generating data file...');
  
  // Sort featured first, then alphabetically
  const sortedBits = [...bits].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
  
  const data = sortedBits.map(b => ({
    slug: b.slug,
    packageName: b.packageName,
    name: b.name,
    displayName: b.displayName,
    description: b.description,
    version: b.version,
    categories: b.categories,
    featured: b.featured,
    icon: b.icon,
    actionCount: b.actions.length,
    triggerCount: b.triggers.length,
    showcaseCount: b.showcases.length,
    downloads: b.downloads,
    downloadsFormatted: formatDownloads(b.downloads),
  }));
  
  mkdirSync(dataDir, { recursive: true });
  const dataFilePath = join(dataDir, 'bits-data.json');
  writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  console.log(`  📄 .vitepress/theme/data/bits-data.json (${bits.length} bits)`);
}

/**
 * Generate individual bit landing page
 */
function generateBitPage(bit: BitData): string {
  const categoriesBadges = bit.categories
    .map(cat => `<span class="bit-category">${cat}</span>`)
    .join(' ');
  
  // Actions table
  const actionsTable = bit.actions.length > 0
    ? `
## Actions

| Action | Description |
|--------|-------------|
${bit.actions.map(a => `| **${a.displayName}** | ${a.description} |`).join('\n')}
`
    : '';
  
  // Triggers table
  const triggersTable = bit.triggers.length > 0
    ? `
## Triggers

| Trigger | Description |
|---------|-------------|
${bit.triggers.map(t => `| **${t.displayName}** | ${t.description} |`).join('\n')}
`
    : '';
  
  // Showcases section
  const showcasesSection = bit.showcases.length > 0
    ? `
## Used In Showcases

${bit.showcases.map(s => `- [${s}](/showcase/${s})`).join('\n')}
`
    : '';

  // Downloads badge (always show for SEO, JS will update with real values)
  const downloadsBadge = `<span class="bit-downloads" data-package="${bit.packageName}">📥 <span class="download-count">${formatDownloads(bit.downloads)}</span> downloads</span>`;

  return `---
title: "${bit.displayName}"
description: "${bit.description}"
aside: false
---

<script setup>
import { ${bit.icon} } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useData } from 'vitepress'

onMounted(async () => {
  try {
    const { site } = useData()
    const base = site.value.base || '/'
    const res = await fetch(\`\${base}bits-stats.json\`)
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats['${bit.packageName}']
      if (stats) {
        const el = document.querySelector('[data-package="${bit.packageName}"] .download-count')
        if (el) el.textContent = stats.downloadsFormatted
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

# <component :is="${bit.icon}" :size="32" class="inline-icon" /> ${bit.displayName}

<div class="bit-meta">
  <span class="bit-package">\`${bit.packageName}\`</span>
  <span class="bit-version">v${bit.version}</span>
  ${downloadsBadge}
  <span class="bit-categories">${categoriesBadges}</span>
</div>

${bit.description}

## Usage

\`\`\`yaml
# In your habit YAML
nodes:
  - id: my-${bit.slug}-node
    type: bit
    framework: bits
    module: "${bit.packageName}"
    action: "${bit.actions[0]?.name || 'action_name'}"
    data:
      # action properties...
\`\`\`
${actionsTable}${triggersTable}${showcasesSection}
<style>
.bit-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 16px 0 24px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.bit-package {
  font-family: var(--vp-font-family-mono);
  font-size: 0.9em;
}

.bit-version {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
}

.bit-downloads {
  color: var(--vp-c-text-2);
  font-size: 0.85em;
  background: var(--vp-c-bg-alt);
  padding: 4px 10px;
  border-radius: 12px;
}

.bit-categories {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.bit-category {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8em;
}

.inline-icon {
  display: inline;
  vertical-align: middle;
  margin-right: 8px;
}

.vp-doc h2 {
  border-top-width: 0px;
}
</style>
`;
}

/**
 * Generate bits gallery index page
 */
function generateIndexPage(bits: BitData[]): string {
  // Sort featured first, then alphabetically
  const sortedBits = [...bits].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
  
  const bitsJson = JSON.stringify(sortedBits.map(b => ({
    slug: b.slug,
    packageName: b.packageName,
    name: b.name,
    displayName: b.displayName,
    description: b.description,
    version: b.version,
    categories: b.categories,
    featured: b.featured,
    icon: b.icon,
    actionCount: b.actions.length,
    triggerCount: b.triggers.length,
    showcaseCount: b.showcases.length,
    downloads: b.downloads,
    downloadsFormatted: formatDownloads(b.downloads),
  })));

  return `---
title: "Bits Catalog"
description: "Explore reusable bits for building habits - AI integrations, databases, messaging, and more"
aside: false
---

<script setup>
const bits = ${bitsJson}
</script>

# Bits Catalog

Discover pre-built bits to accelerate your habit development.
Each bit provides actions and triggers for common integrations.

<BitsGrid :bits="bits" />

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

/**
 * Generate all markdown files
 */
function generateMarkdownFiles(bits: BitData[]): void {
  console.log('\n📝 Generating markdown files...');
  
  // Create bits directory
  mkdirSync(bitsPagesDir, { recursive: true });
  
  // Generate individual pages
  for (const bit of bits) {
    const content = generateBitPage(bit);
    const filePath = join(bitsPagesDir, `${bit.slug}.md`);
    writeFileSync(filePath, content);
    console.log(`  📄 ${bit.slug}.md`);
  }
  
  // Generate index page
  const indexContent = generateIndexPage(bits);
  writeFileSync(join(bitsPagesDir, 'index.md'), indexContent);
  console.log(`  📄 index.md`);
}

/**
 * Print sidebar config for manual addition to config.ts
 */
function printSidebarConfig(bits: BitData[]): void {
  console.log('\n📋 Sidebar config for .vitepress/config.ts:');
  console.log('─'.repeat(50));
  
  const featuredBits = bits.filter(b => b.featured);
  const sidebarItems = [
    "{ text: 'Browse All', link: '/bits/' }",
    ...featuredBits.map(b => `{ text: '${b.displayName}', link: '/bits/${b.slug}' }`),
  ];
  
  console.log(`{
  text: '🧩 Bits',
  items: [
    ${sidebarItems.join(',\n    ')}
  ]
}`);
  console.log('─'.repeat(50));
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('🧩 Generating Bits Documentation...\n');
  
  // Scan for bits (includes npm download fetching)
  const bits = await scanBits();

  if (bits.length === 0) {
    console.log('\n⚠️  No eligible bits found.');
    console.log('   Bits need package.json with habits.catalog: true (or omitted)');
    process.exit(0);
  }

  console.log(`\n📦 Found ${bits.length} bits`);

  // Generate data file for Vue components
  generateDataFile(bits);

  // Generate markdown pages
  generateMarkdownFiles(bits);

  // Print sidebar config
  printSidebarConfig(bits);

  console.log('\n✨ Bits documentation generation complete!');
  console.log(`   ${bits.length} bits processed`);
  console.log(`   Output: docs/bits/`);
  console.log(`\n💡 Run "npx tsx scripts/update-bits-stats.ts" to fetch npm download stats`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
