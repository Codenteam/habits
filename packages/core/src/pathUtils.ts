import * as path from "path";
import * as fs from 'fs';
import * as os from 'os';
export function getTmpDir(): string {
  if(process.env.DEBUG=='true'){
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }
  return tmpDir;
  } else {
  return os.tmpdir();
  }

}
/**
 * Find the base server main file from multiple possible locations
 */
export function findBaseServerPath(): string | undefined {
  const possiblePaths = [
    // When running from pack/npx (bundled base-server)
    path.resolve(__dirname, '../base-server/main.cjs'),
    path.resolve(__dirname, '../../base-server/main.cjs'),
    // When running with tsx in dev
    path.join(process.cwd(), 'packages/base/server/src/main.ts'),
    // When running from dist (cjs extension)
    path.join(process.cwd(), 'dist/packages/base/server/main.cjs'),
    // When running from dist (js extension - legacy)
    path.join(process.cwd(), 'dist/packages/base/server/main.js'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}


/**
 * Get the templates base path - resolved at runtime for different environments
 */
export function getTemplatesBasePath(): string {
  // Check env var first (set by habits CLI for ncc bundles)
  if (process.env.HABITS_TEMPLATES_PATH && fs.existsSync(process.env.HABITS_TEMPLATES_PATH)) {
    return process.env.HABITS_TEMPLATES_PATH;
  }
  
  // Templates are stored in examples (dev) or examples (npx)
  const possiblePaths = [
    path.join(__dirname, '../../../cortex/server/examshowcaseples'),           // Dev: relative to server src
    path.join(__dirname, '../../cortex/server/showcase'),              // Dev: another relative path
    path.join(process.cwd(), 'showcase'),       // Dev: from workspace root
    path.join(__dirname, '../showcase'),                               // npx: relative to base-server/index.cjs
    path.join(__dirname, '../../showcase'),                            // npx: another relative path
    path.join(__dirname, 'templates'),                                  // Prod: bundled templates
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  
  // Return the most likely dev path even if not exists (for error messaging)
  return possiblePaths[2];
}
// UI static files directory - resolved at runtime
export function getCortexUiDistPath(): string {
  // Try multiple paths to find the built UI:
  // 1. Development (tsx/ts-node from workspace root): packages/cortex/ui/dist
  // 2. Development (tsx from packages/cortex/server): ../ui/dist
  // 3. Production (bundled in dist/packages/cortex): dist/packages/cortex/ui or adjacent ui folder
  const possiblePaths = [
    path.join(__dirname, '../ui/'),                    // Dev: relative to server src
    path.join(__dirname, '../../ui/'),                 // Dev: another relative path
    '/app/dist/ui',                 // Playground Docker: /app/dist/ui (hardcoded)
    path.join(__dirname, '../ui'),                         // Playground Docker: relative from server dir

    path.join(__dirname, 'ui'),                            // Prod: bundled alongside server
    path.join(process.cwd(), 'dist/packages/cortex/ui'),   // Prod: in dist folder
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  
  // Return the most likely dev path even if not exists (for error messaging)
  return possiblePaths[0];
}


/**
 * Get the UI dist path - resolved at runtime for different environments
 */
export function getBaseUiDistPath(): string {
  // Try multiple paths to find the built UI:
  // 1. Development (tsx/ts-node from workspace root): packages/base/ui/dist or dist/packages/base/ui
  // 2. Production (bundled in dist/packages/base): adjacent ui folder
  // 3. NPM package: ui folder relative to pack/index.cjs
  // 4. Habits package: base-ui folder relative to base-server
  const possiblePaths = [
    path.join(__dirname, '../base-ui/'),                   // Habits: bundled in habits package
    path.join(__dirname, '../../base-ui/'),                // Habits: another relative path
    path.join(__dirname, '../ui/'),                        // Dev: relative to server src
    path.join(__dirname, '../../ui/'),                     // Dev: another relative path
    path.join(__dirname, '../ui'),                         // Prod: bundled alongside server
    path.join(__dirname, 'ui'),                            // Prod: in same dir as server
    path.join(process.cwd(), 'dist/packages/base/ui'),     // Prod: in dist folder
    path.join(process.cwd(), 'packages/base/ui/dist'),     // Dev: vite output
    path.join(process.cwd(), 'dist/packages/habits/base-ui'), // Habits: in habits dist folder
  ];
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  
  // Return the most likely dev path even if not exists (for error messaging)
  return possiblePaths[0];
}

/**
 * Find UI path from multiple possible locations
 */
export function findUiPath(name: string): string | undefined {
  const possiblePaths = [
    // When running from pack (npx habits)
    path.resolve(__dirname, `../${name}`),
    path.resolve(__dirname, `../../${name}`),
    // When running from dist
    path.resolve(__dirname, `../../../${name}`),
    // When running with tsx in dev
    path.join(process.cwd(), `dist/packages/habits/${name}`),
    path.join(process.cwd(), `dist/packages/${name.replace('-ui', '')}/ui`),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return undefined;
}

/**
 * Convert bracket notation to dot notation in expression paths.
 * This normalizes paths like `node.result[0].data` to `node.result.0.data`
 * which is the canonical format for habits YAML.
 * 
 * @param value - The string value containing potential bracket notation
 * @returns The string with bracket notation converted to dot notation
 * 
 * @example
 * normalizeBracketsToDots('{{node.result[0].data}}') // '{{node.result.0.data}}'
 * normalizeBracketsToDots('{{node[0][1]}}') // '{{node.0.1}}'
 * normalizeBracketsToDots('plain text') // 'plain text'
 */
export function normalizeBracketsToDots(value: string): string {
  if (typeof value !== 'string') {
    return value;
  }
  // Replace [N] with .N where N is a number
  // Also handles ["N"] and ['N'] formats
  return value.replace(/\[['"]?(\d+)['"]?\]/g, '.$1');
}

/**
 * Recursively normalize bracket notation to dot notation in all string values
 * of an object or array.
 * 
 * @param obj - The object, array, or primitive to normalize
 * @returns The normalized value
 */
export function normalizePathsInObject(obj: any): any {
  if (typeof obj === 'string') {
    return normalizeBracketsToDots(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizePathsInObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = normalizePathsInObject(value);
    }
    return result;
  }
  
  return obj;
}