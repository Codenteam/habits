#!/usr/bin/env node
/**
 * Round-trip email-demo YAML through the UiSpec builder parse/emit pipeline.
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Dynamic import of TS module via tsx when run as `pnpm tsx scripts/test-uibuilder-roundtrip.mjs`
const builderUrl = pathToFileURL(path.join(root, 'packages/base/frontend-builder/src/uiSpecYaml.ts')).href;
const { builderRoundTripYaml } = await import(builderUrl);

const sourcePath = path.join(root, 'showcase/email-demo/frontend/index.yaml');
const sourceYaml = fs.readFileSync(sourcePath, 'utf8');
const emitted = builderRoundTripYaml(sourceYaml);

function stripSchemaComment(s) {
  return s.replace(/^#.*\n/, '').trim();
}

function normalize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(normalize);
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj).sort()) {
      out[k] = normalize(obj[k]);
    }
    return out;
  }
  return obj;
}

const sourceParsed = yaml.parse(stripSchemaComment(sourceYaml));
const emittedParsed = yaml.parse(stripSchemaComment(emitted));

const sourceNorm = JSON.stringify(normalize(sourceParsed));
const emittedNorm = JSON.stringify(normalize(emittedParsed));

if (sourceNorm !== emittedNorm) {
  console.error('FAIL round-trip mismatch');
  console.error('--- emitted ---');
  console.error(emitted);
  process.exit(1);
}

console.log('OK email-demo round-trip produces identical YAML structure');
console.log('OK emitted length:', emitted.length, 'bytes');

// Compile check
const compileRes = await fetch('http://localhost:3000/api/ui/compile-yaml', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ yaml: emitted }),
});
const compileJson = await compileRes.json();
if (!compileJson.success) {
  console.error('FAIL compile-yaml on emitted yaml:', compileJson.error);
  process.exit(1);
}
console.log('OK compile-yaml on round-tripped yaml');
