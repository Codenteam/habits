#!/usr/bin/env npx tsx
/**
 * Generate integration → showcase mappings for docs integration pages.
 *
 * Scans each folder under showcase/ for bit and integration usage, then writes:
 *   - docs/.vitepress/theme/data/integration-showcases.json
 *
 * A showcase is marked `improving: true` (hidden on integration pages) when:
 *   - showcase.yaml has improving: true, OR
 *   - no published docs page exists at docs/showcase/<slug>.md
 *
 * Run after generate-showcase.ts so published pages are up to date.
 *
 * Usage: npx tsx scripts/generate-integration-showcases.ts
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';
import { parse as parseYaml } from 'yaml';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const showcaseDir = join(rootDir, 'showcase');
const docsDir = join(rootDir, 'docs');
const docsShowcaseDir = join(docsDir, 'showcase');
const outputPath = join(docsDir, '.vitepress/theme/data/integration-showcases.json');
const integrationsIndexPath = join(docsDir, 'integrations/index.md');

interface IntegrationDef {
  slug: string;
  /** Substrings searched in showcase YAML file contents */
  match: string[];
}

interface ShowcaseYamlMeta {
  name?: string;
  disabled?: boolean;
  improving?: boolean;
}

interface ShowcaseEntry {
  slug: string;
  name: string;
  improving?: boolean;
}

/** Integration slug → bit / env patterns (keep in sync with docs/integrations/index.md) */
const INTEGRATIONS: IntegrationDef[] = [
  { slug: 'gmail', match: ['@ha-bits/bit-email', 'bit-email'] },
  { slug: 'openai', match: ['@ha-bits/bit-openai', 'bit-openai'] },
  { slug: 'slack', match: ['@ha-bits/bit-slack', 'bit-slack'] },
  { slug: 'hubspot', match: ['@ha-bits/bit-hubspot', 'bit-hubspot'] },
  { slug: 'google-drive', match: ['@ha-bits/bit-google-drive', 'bit-google-drive'] },
  { slug: 'google-sheets', match: ['@ha-bits/bit-google-sheets', 'bit-google-sheets'] },
  { slug: 'google-calendar', match: ['@ha-bits/bit-google-calendar', 'bit-google-calendar'] },
  { slug: 'telegram', match: ['@ha-bits/bit-telegram', 'bit-telegram'] },
  { slug: 'linkedin', match: ['@ha-bits/bit-linkedin', 'bit-linkedin'] },
  { slug: 'twitter', match: ['@ha-bits/bit-twitter', 'bit-twitter'] },
  { slug: 'whatsapp', match: ['@ha-bits/bit-whatsapp', 'bit-whatsapp'] },
  { slug: 'intersect', match: ['@ha-bits/bit-intersect', 'bit-intersect'] },
  { slug: 'snov', match: ['@ha-bits/bit-snov', 'bit-snov'] },
  { slug: 'salesforce', match: ['@ha-bits/bit-salesforce', 'bit-salesforce'] },
  { slug: 'gohighlevel', match: ['@ha-bits/bit-gohighlevel', 'bit-gohighlevel'] },
  { slug: 'sumsub', match: ['@ha-bits/bit-sumsub', 'bit-sumsub'] },
  { slug: 'recaptcha', match: ['HABITS_RECAPTCHA_', 'recaptchaenterprise.googleapis.com'] },
  { slug: 'mcp-servers', match: ['mcpServers:'] },
];

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function loadShowcaseMeta(slug: string): ShowcaseYamlMeta | null {
  const yamlPath = join(showcaseDir, slug, 'showcase.yaml');
  if (!existsSync(yamlPath)) return null;
  try {
    return parseYaml(readFileSync(yamlPath, 'utf-8')) as ShowcaseYamlMeta;
  } catch {
    return null;
  }
}

function isPublished(slug: string): boolean {
  return existsSync(join(docsShowcaseDir, `${slug}.md`));
}

function showcaseUsesIntegration(slug: string, integration: IntegrationDef): boolean {
  const pattern = join(showcaseDir, slug, '**/*.{yaml,yml}');
  const files = globSync(pattern, { absolute: true });
  return files.some((file) => {
    const content = readFileSync(file, 'utf-8');
    return integration.match.some((needle) => content.includes(needle));
  });
}

function buildIntegrationShowcases(): Record<string, ShowcaseEntry[]> {
  const result: Record<string, ShowcaseEntry[]> = {};

  const showcaseSlugs = readdirSync(showcaseDir).filter((name) => {
    const fullPath = join(showcaseDir, name);
    return statSync(fullPath).isDirectory();
  });

  for (const integration of INTEGRATIONS) {
    const entries: ShowcaseEntry[] = [];

    for (const slug of showcaseSlugs) {
      const meta = loadShowcaseMeta(slug);
      // Only catalog showcases (must have showcase.yaml and not be disabled)
      if (!meta || meta.disabled) continue;

      if (!showcaseUsesIntegration(slug, integration)) continue;

      const published = isPublished(slug);
      const improving = !published || meta.improving === true;

      entries.push({
        slug,
        name: meta.name ?? slugToTitle(slug),
        ...(improving ? { improving: true } : {}),
      });
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    result[integration.slug] = entries;
  }

  return result;
}

function updateIntegrationsIndexCounts(data: Record<string, ShowcaseEntry[]>): void {
  if (!existsSync(integrationsIndexPath)) return;

  let content = readFileSync(integrationsIndexPath, 'utf-8');
  const match = content.match(/const integrations = (\[[\s\S]*?\])\s*\n<\/script>/);
  if (!match) {
    console.log('  ⚠️  Could not parse integrations index.md — skipping showcaseCount update');
    return;
  }

  type IndexEntry = { slug: string; showcaseCount?: number; [key: string]: unknown };
  const integrations = JSON.parse(match[1]) as IndexEntry[];

  for (const entry of integrations) {
    const showcases = data[entry.slug] ?? [];
    entry.showcaseCount = showcases.filter((s) => !s.improving).length;
  }

  const updatedJson = JSON.stringify(integrations, null, 2);
  content = content.replace(
    /const integrations = \[[\s\S]*?\]\s*\n<\/script>/,
    `const integrations = ${updatedJson}\n</script>`,
  );
  writeFileSync(integrationsIndexPath, content);
  console.log('  📄 docs/integrations/index.md (showcaseCount updated)');
}

function main(): void {
  console.log('🔗 Generating integration showcase mappings...\n');

  const data = buildIntegrationShowcases();

  writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n');

  const integrationCount = Object.keys(data).length;
  const totalLinks = Object.values(data).reduce((sum, entries) => sum + entries.length, 0);
  const visibleLinks = Object.values(data).reduce(
    (sum, entries) => sum + entries.filter((e) => !e.improving).length,
    0,
  );

  console.log(`  📄 ${outputPath.replace(rootDir + '/', '')}`);
  console.log(`  ✅ ${integrationCount} integrations, ${totalLinks} showcase links (${visibleLinks} visible)\n`);

  for (const [slug, entries] of Object.entries(data).sort(([a], [b]) => a.localeCompare(b))) {
    const visible = entries.filter((e) => !e.improving).length;
    const improving = entries.length - visible;
    if (entries.length === 0) continue;
    const suffix = improving > 0 ? ` (${improving} improving)` : '';
    console.log(`     ${slug}: ${visible} visible${suffix}`);
  }

  updateIntegrationsIndexCounts(data);
  console.log('\n✨ Integration showcase generation complete!');
}

main();
