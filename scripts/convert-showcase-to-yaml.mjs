#!/usr/bin/env node
/**
 * Convert static "showcase" dashboards in `all-frontends/` to YAML.
 *
 * Showcase pages share a fixed structure: header + 4 stat cards + 3x2 habit
 * card grid + status footer. We parse the HTML with a regex pass and emit
 * a UiSpec YAML using `layout: showcase` and the `habit-grid` widget.
 *
 * Run: node scripts/convert-showcase-to-yaml.mjs
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const dir = path.join(repoRoot, 'all-frontends');

const SHOWCASE_PREFIXES = [
  'ecommerce-retail-',
  'finance-banking-',
  'healthcare-',
  'manufacturing-',
  'real-estate-',
];

// `real-estate.html` (single page about real-estate suite) is also a showcase.
const STANDALONE_SHOWCASES = new Set(['real-estate.html']);

function unescape(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function pickAll(html, re) {
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m);
  return out;
}

function yamlQuote(s) {
  if (s == null) return '""';
  const str = String(s);
  if (str === '') return '""';
  if (/^[\w./\- ]+$/.test(str) && !/^(true|false|null|yes|no|on|off)$/i.test(str) && !/^[\d.]+$/.test(str)) {
    return str;
  }
  return JSON.stringify(str);
}

function parseShowcase(html, file) {
  const title = (html.match(/<h1>([\s\S]*?)<\/h1>/) || [, ''])[1].trim();
  const subtitle = (html.match(/<h1>[\s\S]*?<\/h1>\s*<p>([\s\S]*?)<\/p>/) || [, ''])[1].trim();
  const icon = (html.match(/<div class="header-icon"[^>]*>([\s\S]*?)<\/div>/) || [, ''])[1].trim();

  const stats = pickAll(
    html,
    /<div class="stat-card">[\s\S]*?<div class="stat-value">([\s\S]*?)<\/div>[\s\S]*?<div class="stat-label">([\s\S]*?)<\/div>/g,
  ).map(([, v, l]) => ({ value: unescape(v.trim()), label: unescape(l.trim()) }));

  const habitBlocks = pickAll(html, /<div class="habit-card">([\s\S]*?)<\/div>\s*<\/div>/g);
  const habits = habitBlocks.map(([, body]) => {
    const name = (body.match(/<span class="habit-name">([\s\S]*?)<\/span>/) || [, ''])[1].trim();
    const triggerMatch = body.match(/<span class="trigger-pill( webhook)?">([\s\S]*?)<\/span>/);
    const trigger = triggerMatch ? triggerMatch[2].trim() : 'webhook';
    const desc = (body.match(/<p class="habit-desc">([\s\S]*?)<\/p>/) || [, ''])[1].trim();
    const tags = pickAll(body, /<span class="bit-tag">([\s\S]*?)<\/span>/g).map(([, t]) => unescape(t.trim()));
    return { name: unescape(name), trigger, description: unescape(desc), tags };
  });

  const statusText = (html.match(/<span class="status-text">([\s\S]*?)<\/span>/) || [, ''])[1]
    .replace(/<[^>]+>/g, '')
    .trim();
  const portMatch = statusText.match(/Port\s+(\d+)/i);

  return {
    file,
    meta: { title: unescape(title), subtitle: unescape(subtitle), icon: unescape(icon) },
    stats,
    habits,
    status: { text: unescape(statusText), port: portMatch ? Number(portMatch[1]) : undefined },
  };
}

function emitYaml(spec, sourceName) {
  const lines = [];
  lines.push('# ' + spec.meta.title + ' — converted from ' + sourceName);
  lines.push('# Showcase dashboard rendered by @ha-bits/cortex-core compileUiSpec.');
  lines.push('');
  lines.push('version: 1');
  lines.push('meta:');
  lines.push('  id: ' + yamlQuote(sourceName.replace(/\.html?$/, '')));
  lines.push('  title: ' + yamlQuote(spec.meta.title));
  if (spec.meta.subtitle) lines.push('  subtitle: ' + yamlQuote(spec.meta.subtitle));
  if (spec.meta.icon) lines.push('  icon: ' + yamlQuote(spec.meta.icon));
  lines.push('  documentTitle: ' + yamlQuote(spec.meta.title));
  lines.push('');
  lines.push('theme:');
  lines.push('  preset: showcase-flat');
  lines.push('  mode: dark');
  lines.push('');
  lines.push('layout:');
  lines.push('  type: showcase');
  lines.push('  header:');
  lines.push('    title: ' + yamlQuote(spec.meta.title));
  if (spec.meta.subtitle) lines.push('    subtitle: ' + yamlQuote(spec.meta.subtitle));
  if (spec.meta.icon) lines.push('    icon: ' + yamlQuote(spec.meta.icon));
  if (spec.status.text) {
    lines.push('  footerStatus:');
    lines.push('    dot: live');
    lines.push('    text: ' + yamlQuote(spec.status.text));
    if (spec.status.port) lines.push('    port: ' + spec.status.port);
  }
  lines.push('');
  lines.push('widgets:');
  if (spec.stats.length) {
    lines.push('  - kind: metric-grid');
    lines.push('    columns: ' + spec.stats.length);
    lines.push('    metrics:');
    for (const s of spec.stats) {
      lines.push('      - { value: ' + yamlQuote(s.value) + ', label: ' + yamlQuote(s.label) + ' }');
    }
  }
  if (spec.habits.length) {
    lines.push('  - kind: section');
    lines.push('    title: Habits');
    lines.push('    children:');
    lines.push('      - kind: habit-grid');
    lines.push('        columns: 3');
    lines.push('        items:');
    for (const h of spec.habits) {
      lines.push('          - name: ' + yamlQuote(h.name));
      if (h.description) lines.push('            description: ' + yamlQuote(h.description));
      if (h.trigger) lines.push('            trigger: ' + yamlQuote(h.trigger));
      if (h.tags && h.tags.length) {
        lines.push('            tags: [' + h.tags.map((t) => yamlQuote(t)).join(', ') + ']');
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

const files = await readdir(dir);
const targets = files.filter(
  (f) => /\.html?$/i.test(f) && (SHOWCASE_PREFIXES.some((p) => f.startsWith(p)) || STANDALONE_SHOWCASES.has(f)),
);
let ok = 0;
let failed = 0;
for (const file of targets) {
  const inPath = path.join(dir, file);
  const outPath = path.join(dir, file.replace(/\.html?$/i, '.yaml'));
  try {
    const html = await readFile(inPath, 'utf-8');
    if (!/class="habit-card"/.test(html) || !/class="stat-card"/.test(html)) {
      console.warn(`- skip (not a showcase): ${file}`);
      continue;
    }
    const spec = parseShowcase(html, file);
    const yamlText = emitYaml(spec, file);
    await writeFile(outPath, yamlText, 'utf-8');
    console.log(`✓ ${file} → ${path.basename(outPath)} (${spec.habits.length} habits, ${spec.stats.length} stats)`);
    ok += 1;
  } catch (err) {
    console.error(`✖ ${file}: ${err && err.message ? err.message : err}`);
    failed += 1;
  }
}
console.log(`\n${ok} converted, ${failed} failed`);
