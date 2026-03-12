/**
 * @ha-bits/bindings
 * 
 * Platform bindings that abstract Node.js native modules for cross-platform support.
 * Provides unified APIs that work in both Node.js and Tauri environments.
 * 
 * @example
 * ```typescript
 * import { fs, path, shell, process as proc } from '@ha-bits/bindings';
 * 
 * // These work in both Node.js and Tauri
 * const content = await fs.readFile('/path/to/file.txt');
 * const joined = path.join('dir', 'file.txt');
 * const result = await shell.exec('echo hello');
 * await proc.exit(0);
 * ```
 * 
 * @example Individual imports
 * ```typescript
 * import { readFile, writeFile } from '@ha-bits/bindings/fs';
 * import { join, dirname } from '@ha-bits/bindings/path';
 * import { exec, spawn } from '@ha-bits/bindings/shell';
 * import { isTauri, isNode } from '@ha-bits/bindings/runtime';
 * ```
 */

// Re-export all modules
export * as fs from './fs';
export * as path from './path';
export * as shell from './shell';
export * as process from './process';
export * as runtime from './runtime';
export * as http from './fetch';

// Re-export commonly used functions directly
export {
  isTauri,
  isNode,
  isBrowser,
  getRuntime,
  assertRuntime,
} from './runtime';

// Re-export fs functions
export {
  readFile,
  readBinaryFile,
  writeFile,
  writeBinaryFile,
  exists,
  mkdir,
  remove,
  rmdir,
  readDir,
  copyFile,
  rename,
  stat,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from './fs';

// Re-export path functions
export {
  join,
  resolve,
  dirname,
  basename,
  extname,
  isAbsolute,
  normalize,
  relative,
  parse,
  format,
  sep,
  delimiter,
} from './path';

// Re-export shell functions
export {
  exec,
  execAsync,
  execSync,
  spawn,
  spawnSync,
  promisifyExec,
} from './shell';

// Re-export process functions
export {
  getEnv,
  getAllEnv,
  setEnv,
  cwd,
  cwdSync,
  chdir,
  platform,
  arch,
  nodeVersion,
  versions,
  exit,
  restart,
  argv,
  execPath,
  memoryUsage,
  uptime,
  hrtime,
} from './process';

// Re-export fetch functions
export { fetch } from './fetch';

// Type re-exports
export type { DirEntry, FileStats } from './fs';
export type { ExecOptions, ExecResult, SpawnOptions, SpawnedProcess } from './shell';
export type { ProcessEventHandler } from './process';
export type { FetchOptions, FetchResponse } from './fetch';
