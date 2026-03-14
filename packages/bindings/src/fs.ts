/**
 * Filesystem binding
 * 
 * Provides cross-platform filesystem operations that work in both Node.js and Tauri.
 * In Node.js, delegates to the native 'fs' module.
 * In Tauri, uses globalThis.__TAURI__.fs (requires withGlobalTauri: true).
 */

import { isTauri, isNode, assertRuntime, getTauriPlugin, type TauriFsPlugin } from './runtime';

// Conditionally import modules
let nodeFs: typeof import('fs') | null = null;

// Initialize Node.js fs if available
if (isNode()) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nodeFs = require('fs');
}

/**
 * Get Tauri fs plugin from globalThis.__TAURI__
 */
function getTauriFs(): TauriFsPlugin {
  return getTauriPlugin('fs');
}

// ============================================================================
// Async Operations
// ============================================================================

/**
 * Read a file as text
 * 
 * @param path - Path to the file
 * @param encoding - Text encoding (default: 'utf-8')
 * @returns File contents as string
 */
export async function readFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
  if (isTauri()) {
    const fs = getTauriFs();
    return await fs.readTextFile(path);
  }
  
  if (nodeFs) {
    return nodeFs.promises.readFile(path, { encoding });
  }
  
  throw new Error('readFile is not supported in this environment');
}

/**
 * Read a file as binary data
 * 
 * @param path - Path to the file
 * @returns File contents as Uint8Array
 */
export async function readBinaryFile(path: string): Promise<Uint8Array> {
  if (isTauri()) {
    const fs = getTauriFs();
    return await fs.readFile(path);
  }
  
  if (nodeFs) {
    const buffer = await nodeFs.promises.readFile(path);
    return new Uint8Array(buffer);
  }
  
  throw new Error('readBinaryFile is not supported in this environment');
}

/**
 * Write text to a file
 * 
 * @param path - Path to the file
 * @param contents - Text content to write
 */
export async function writeFile(path: string, contents: string): Promise<void> {
  if (isTauri()) {
    const fs = getTauriFs();
    await fs.writeTextFile(path, contents);
    return;
  }
  
  if (nodeFs) {
    await nodeFs.promises.writeFile(path, contents, 'utf-8');
    return;
  }
  
  throw new Error('writeFile is not supported in this environment');
}

/**
 * Write binary data to a file
 * 
 * @param path - Path to the file
 * @param contents - Binary content to write
 */
export async function writeBinaryFile(path: string, contents: Uint8Array): Promise<void> {
  if (isTauri()) {
    const fs = getTauriFs();
    await fs.writeFile(path, contents);
    return;
  }
  
  if (nodeFs) {
    await nodeFs.promises.writeFile(path, Buffer.from(contents));
    return;
  }
  
  throw new Error('writeBinaryFile is not supported in this environment');
}

/**
 * Check if a file or directory exists
 * 
 * @param path - Path to check
 * @returns true if the path exists
 */
export async function exists(path: string): Promise<boolean> {
  if (isTauri()) {
    const fs = getTauriFs();
    return await fs.exists(path);
  }
  
  if (nodeFs) {
    try {
      await nodeFs.promises.access(path);
      return true;
    } catch {
      return false;
    }
  }
  
  throw new Error('exists is not supported in this environment');
}

/**
 * Create a directory
 * 
 * @param path - Path to create
 * @param options - Options for directory creation
 */
export async function mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
  if (isTauri()) {
    const fs = getTauriFs();
    await fs.mkdir(path, { recursive: options?.recursive });
    return;
  }
  
  if (nodeFs) {
    await nodeFs.promises.mkdir(path, { recursive: options?.recursive });
    return;
  }
  
  throw new Error('mkdir is not supported in this environment');
}

/**
 * Remove a file
 * 
 * @param path - Path to remove
 */
export async function remove(path: string): Promise<void> {
  if (isTauri()) {
    const fs = getTauriFs();
    await fs.remove(path);
    return;
  }
  
  if (nodeFs) {
    await nodeFs.promises.unlink(path);
    return;
  }
  
  throw new Error('remove is not supported in this environment');
}

/**
 * Remove a directory
 * 
 * @param path - Path to remove
 * @param options - Options for removal
 */
export async function rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
  if (isTauri()) {
    const fs = getTauriFs();
    await fs.remove(path, { recursive: options?.recursive });
    return;
  }
  
  if (nodeFs) {
    await nodeFs.promises.rm(path, { recursive: options?.recursive });
    return;
  }
  
  throw new Error('rmdir is not supported in this environment');
}

/**
 * Directory entry info
 */
export interface DirEntry {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
  isSymlink: boolean;
}

/**
 * Read a directory
 * 
 * @param path - Path to read
 * @returns Array of directory entries
 */
export async function readDir(path: string): Promise<DirEntry[]> {
  if (isTauri()) {
    const fs = getTauriFs();
    const entries = await fs.readDir(path);
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory,
      isFile: entry.isFile,
      isSymlink: entry.isSymlink,
    }));
  }
  
  if (nodeFs) {
    const entries = await nodeFs.promises.readdir(path, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      isSymlink: entry.isSymbolicLink(),
    }));
  }
  
  throw new Error('readDir is not supported in this environment');
}

/**
 * Copy a file
 * 
 * @param src - Source path
 * @param dest - Destination path
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  if (isTauri()) {
    const fs = getTauriFs();
    await fs.copyFile(src, dest);
    return;
  }
  
  if (nodeFs) {
    await nodeFs.promises.copyFile(src, dest);
    return;
  }
  
  throw new Error('copyFile is not supported in this environment');
}

/**
 * Rename/move a file or directory
 * 
 * @param oldPath - Current path
 * @param newPath - New path
 */
export async function rename(oldPath: string, newPath: string): Promise<void> {
  if (isTauri()) {
    const fs = getTauriFs();
    await fs.rename(oldPath, newPath);
    return;
  }
  
  if (nodeFs) {
    await nodeFs.promises.rename(oldPath, newPath);
    return;
  }
  
  throw new Error('rename is not supported in this environment');
}

/**
 * File/directory stats (Node.js-compatible interface with methods)
 */
export interface FileStats {
  /** Check if this is a regular file */
  isFile(): boolean;
  /** Check if this is a directory */
  isDirectory(): boolean;
  /** Check if this is a symbolic link */
  isSymbolicLink(): boolean;
  /** File size in bytes */
  size: number;
  /** Last modified time */
  mtime: Date | null;
  /** Last accessed time */
  atime: Date | null;
  /** Creation time */
  ctime: Date | null;
}

/**
 * Create a FileStats object with methods
 */
function createFileStats(data: {
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  size: number;
  mtime: Date | null;
  atime: Date | null;
  ctime: Date | null;
}): FileStats {
  return {
    isFile: () => data.isFile,
    isDirectory: () => data.isDirectory,
    isSymbolicLink: () => data.isSymlink,
    size: data.size,
    mtime: data.mtime,
    atime: data.atime,
    ctime: data.ctime,
  };
}

/**
 * Get file/directory stats
 * 
 * @param path - Path to stat
 * @returns File stats
 */
export async function stat(path: string): Promise<FileStats> {
  if (isTauri()) {
    const fs = getTauriFs();
    const stats = await fs.stat(path);
    return createFileStats({
      isFile: stats.isFile,
      isDirectory: stats.isDirectory,
      isSymlink: stats.isSymlink,
      size: stats.size,
      mtime: stats.mtime ? new Date(stats.mtime) : null,
      atime: stats.atime ? new Date(stats.atime) : null,
      ctime: null, // Tauri doesn't provide ctime
    });
  }
  
  if (nodeFs) {
    const stats = await nodeFs.promises.stat(path);
    return createFileStats({
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      mtime: stats.mtime,
      atime: stats.atime,
      ctime: stats.ctime,
    });
  }
  
  throw new Error('stat is not supported in this environment');
}

// ============================================================================
// Sync Operations (Node.js only)
// ============================================================================

/**
 * Read a file synchronously (Node.js only)
 * 
 * @param path - Path to the file
 * @param encoding - Text encoding (default: 'utf-8')
 * @returns File contents as string
 */
export function readFileSync(path: string, encoding: BufferEncoding = 'utf-8'): string {
  assertRuntime('readFileSync', ['node']);
  
  if (nodeFs) {
    return nodeFs.readFileSync(path, { encoding });
  }
  
  throw new Error('readFileSync is not supported in this environment');
}

/**
 * Write a file synchronously (Node.js only)
 * 
 * @param path - Path to the file
 * @param contents - Text content to write
 * @param encoding - Text encoding (default: 'utf-8')
 */
export function writeFileSync(path: string, contents: string, encoding: BufferEncoding = 'utf-8'): void {
  assertRuntime('writeFileSync', ['node']);
  
  if (nodeFs) {
    nodeFs.writeFileSync(path, contents, encoding);
    return;
  }
  
  throw new Error('writeFileSync is not supported in this environment');
}

/**
 * Check if a file or directory exists synchronously (Node.js only)
 * 
 * @param path - Path to check
 * @returns true if the path exists
 */
export function existsSync(path: string): boolean {
  assertRuntime('existsSync', ['node']);
  
  if (nodeFs) {
    return nodeFs.existsSync(path);
  }
  
  return false;
}

/**
 * Create a directory synchronously (Node.js only)
 * 
 * @param path - Path to create
 * @param options - Options for directory creation
 */
export function mkdirSync(path: string, options?: { recursive?: boolean }): void {
  assertRuntime('mkdirSync', ['node']);
  
  if (nodeFs) {
    nodeFs.mkdirSync(path, { recursive: options?.recursive });
    return;
  }
  
  throw new Error('mkdirSync is not supported in this environment');
}

/**
 * Directory entry with file type methods (for Node.js compatibility)
 */
export interface DirentLike {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

/**
 * Read directory synchronously (Node.js only) - returns string[]
 */
export function readdirSync(path: string): string[];
/**
 * Read directory synchronously (Node.js only) - returns DirentLike[] when withFileTypes is true
 */
export function readdirSync(path: string, options: { withFileTypes: true }): DirentLike[];
/**
 * Read directory synchronously (Node.js only) - returns string[] when withFileTypes is false/undefined
 */
export function readdirSync(path: string, options: { withFileTypes?: false }): string[];
/**
 * Read directory synchronously (Node.js only)
 * 
 * @param path - Path to read
 * @param options - Options (withFileTypes returns Dirent-like objects)
 * @returns Array of file names or Dirent-like objects
 */
export function readdirSync(path: string, options?: { withFileTypes?: boolean }): string[] | DirentLike[] {
  assertRuntime('readdirSync', ['node']);
  
  if (nodeFs) {
    if (options?.withFileTypes) {
      const entries = nodeFs.readdirSync(path, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: () => entry.isDirectory(),
        isFile: () => entry.isFile(),
        isSymbolicLink: () => entry.isSymbolicLink(),
      }));
    }
    return nodeFs.readdirSync(path);
  }
  
  throw new Error('readdirSync is not supported in this environment');
}

/**
 * Copy a file or directory synchronously (Node.js only)
 * 
 * @param src - Source path
 * @param dest - Destination path
 * @param options - Copy options
 */
export function cpSync(src: string, dest: string, options?: { recursive?: boolean }): void {
  assertRuntime('cpSync', ['node']);
  
  if (nodeFs && typeof (nodeFs as any).cpSync === 'function') {
    (nodeFs as any).cpSync(src, dest, options);
    return;
  }
  
  throw new Error('cpSync is not supported in this environment (requires Node.js 16.7+)');
}

/**
 * Remove a file or directory synchronously (Node.js only)
 * 
 * @param path - Path to remove
 * @param options - Removal options
 */
export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void {
  assertRuntime('rmSync', ['node']);
  
  if (nodeFs && typeof (nodeFs as any).rmSync === 'function') {
    (nodeFs as any).rmSync(path, options);
    return;
  }
  
  throw new Error('rmSync is not supported in this environment (requires Node.js 14.14+)');
}

/**
 * Create a symbolic link synchronously (Node.js only)
 * 
 * @param target - Path the symlink points to
 * @param path - Path of the symlink itself
 * @param type - Type of symlink ('file', 'dir', or 'junction' on Windows)
 */
export function symlinkSync(target: string, path: string, type?: 'file' | 'dir' | 'junction'): void {
  assertRuntime('symlinkSync', ['node']);
  
  if (nodeFs) {
    nodeFs.symlinkSync(target, path, type);
    return;
  }
  
  throw new Error('symlinkSync is not supported in this environment');
}

/**
 * Get file stats synchronously without following symlinks (Node.js only)
 * 
 * @param path - Path to stat
 * @returns File stats (isSymbolicLink() will return true for symlinks)
 */
export function lstatSync(path: string): FileStats {
  assertRuntime('lstatSync', ['node']);
  
  if (nodeFs) {
    const stats = nodeFs.lstatSync(path);
    return createFileStats({
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      mtime: stats.mtime,
      atime: stats.atime,
      ctime: stats.ctime,
    });
  }
  
  throw new Error('lstatSync is not supported in this environment');
}

/**
 * Read the target of a symbolic link synchronously (Node.js only)
 * 
 * @param path - Path of the symlink
 * @returns The path the symlink points to
 */
export function readlinkSync(path: string): string {
  assertRuntime('readlinkSync', ['node']);
  
  if (nodeFs) {
    return nodeFs.readlinkSync(path, 'utf-8');
  }
  
  throw new Error('readlinkSync is not supported in this environment');
}

/**
 * Get file stats synchronously (Node.js only)
 * 
 * @param path - Path to stat
 * @returns File stats
 */
export function statSync(path: string): FileStats {
  assertRuntime('statSync', ['node']);
  
  if (nodeFs) {
    const stats = nodeFs.statSync(path);
    return createFileStats({
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      mtime: stats.mtime,
      atime: stats.atime,
      ctime: stats.ctime,
    });
  }
  
  throw new Error('statSync is not supported in this environment');
}

// Default export
export default {
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
  readdirSync,
  cpSync,
  rmSync,
  symlinkSync,
  readlinkSync,
  lstatSync,
  statSync,
};
