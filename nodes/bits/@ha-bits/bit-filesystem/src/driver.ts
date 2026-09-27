/**
 * @ha-bits/bit-filesystem driver
 * 
 * Node.js implementation using fs module.
 * This file is stubbed for Tauri with stubs/tauri-driver.js
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  created: Date;
  modified: Date;
}

export interface DirectoryFileDetails {
  /** Stable dedup key: absolutePath|size|mtimeMs */
  fileId: string;
  fileName: string;
  filePath: string;
  relativePath: string;
  size: number;
  modified: string;
  created: string;
  mimeType: string;
  /** Base64-encoded file bytes */
  fileContent: string;
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function guessMimeType(filename: string): string {
  const ext = path.extname(filename).replace(/^\./, '').toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

export function buildFileId(filePath: string, size: number, mtimeMs: number): string {
  return `${filePath}|${size}|${mtimeMs}`;
}

/**
 * Resolve and validate path within allowed base directory
 */
export function resolvePath(filePath: string, baseDir?: string): string {
  const base = baseDir || process.cwd();
  const resolved = path.resolve(base, filePath);
  
  // Security: ensure resolved path is within base directory
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error('Path traversal not allowed');
  }
  
  return resolved;
}

export async function readFile(params: { filePath: string; baseDir?: string; encoding?: string }) {
  const { filePath, baseDir, encoding = 'utf-8' } = params;
  const resolved = resolvePath(filePath, baseDir);
  
  if (encoding === 'binary' || encoding === 'base64') {
    const buffer = await fs.readFile(resolved);
    return {
      content: encoding === 'base64' ? buffer.toString('base64') : buffer,
      path: resolved,
      size: buffer.length,
    };
  }
  
  const content = await fs.readFile(resolved, encoding as BufferEncoding);
  return {
    content,
    path: resolved,
    size: content.length,
  };
}

export async function writeFile(params: { filePath: string; content: string; baseDir?: string; createDirs?: boolean; encoding?: string }) {
  const { filePath, content, baseDir, createDirs = true, encoding = 'utf-8' } = params;
  const resolved = resolvePath(filePath, baseDir);
  
  if (createDirs) {
    await fs.mkdir(path.dirname(resolved), { recursive: true });
  }
  
  if (encoding === 'base64') {
    const buffer = Buffer.from(content, 'base64');
    await fs.writeFile(resolved, new Uint8Array(buffer));
    return { success: true, path: resolved, size: buffer.length };
  }
  
  await fs.writeFile(resolved, content, encoding as BufferEncoding);
  return { success: true, path: resolved, size: content.length };
}

export async function appendFile(params: { filePath: string; content: string; baseDir?: string }) {
  const { filePath, content, baseDir } = params;
  const resolved = resolvePath(filePath, baseDir);
  
  await fs.appendFile(resolved, content);
  return { success: true, path: resolved };
}

export async function deleteFile(params: { filePath: string; baseDir?: string }) {
  const { filePath, baseDir } = params;
  const resolved = resolvePath(filePath, baseDir);
  
  await fs.unlink(resolved);
  return { success: true, deletedPath: resolved };
}

export async function listDirectory(params: { dirPath: string; baseDir?: string; recursive?: boolean }): Promise<{ files: FileInfo[]; count: number; path: string }> {
  const { dirPath, baseDir, recursive = false } = params;
  const resolved = resolvePath(dirPath, baseDir);
  
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const files: FileInfo[] = [];
  
  for (const entry of entries) {
    const entryPath = path.join(resolved, entry.name);
    const stats = await fs.stat(entryPath);
    
    files.push({
      name: entry.name,
      path: entryPath,
      isDirectory: entry.isDirectory(),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    });
    
    if (recursive && entry.isDirectory()) {
      const subResult = await listDirectory({ dirPath: entryPath, recursive: true });
      files.push(...subResult.files);
    }
  }
  
  return { files, count: files.length, path: resolved };
}

export async function createDirectory(params: { dirPath: string; baseDir?: string; recursive?: boolean }) {
  const { dirPath, baseDir, recursive = true } = params;
  const resolved = resolvePath(dirPath, baseDir);
  
  await fs.mkdir(resolved, { recursive });
  return { success: true, path: resolved };
}

export async function exists(params: { filePath: string; baseDir?: string }) {
  const { filePath, baseDir } = params;
  const resolved = resolvePath(filePath, baseDir);
  
  try {
    const stats = await fs.stat(resolved);
    return {
      exists: true,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      path: resolved,
    };
  } catch {
    return { exists: false, path: resolved };
  }
}

export async function copyFile(params: { sourcePath: string; destPath: string; baseDir?: string }) {
  const { sourcePath, destPath, baseDir } = params;
  const src = resolvePath(sourcePath, baseDir);
  const dest = resolvePath(destPath, baseDir);
  
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
  return { success: true, source: src, destination: dest };
}

export async function moveFile(params: { sourcePath: string; destPath: string; baseDir?: string }) {
  const { sourcePath, destPath, baseDir } = params;
  const src = resolvePath(sourcePath, baseDir);
  const dest = resolvePath(destPath, baseDir);
  
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.rename(src, dest);
  return { success: true, source: src, destination: dest };
}

/**
 * Read all files in a directory (Node.js only).
 * Returns file metadata and base64 content for each regular file found.
 */
export async function readDirectoryFiles(params: {
  folderPath: string;
  baseDir?: string;
  recursive?: boolean;
}): Promise<{ files: DirectoryFileDetails[]; count: number; folderPath: string }> {
  const { folderPath, baseDir, recursive = false } = params;
  const resolved = resolvePath(folderPath, baseDir);

  let dirStats: Awaited<ReturnType<typeof fs.stat>>;
  try {
    dirStats = await fs.stat(resolved);
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new Error(`Folder does not exist: ${resolved}`);
    }
    throw err;
  }

  if (!dirStats.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolved}`);
  }

  const files: DirectoryFileDetails[] = [];

  async function collectFiles(dir: string, relativeRoot: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const entryPath = path.join(dir, entry.name);
      const relativePath = path.join(relativeRoot, entry.name);

      if (entry.isDirectory()) {
        if (recursive) {
          await collectFiles(entryPath, relativePath);
        }
        continue;
      }

      if (!entry.isFile()) continue;

      const stats = await fs.stat(entryPath);
      const buffer = await fs.readFile(entryPath);
      const mtimeMs = stats.mtimeMs;

      files.push({
        fileId: buildFileId(entryPath, stats.size, mtimeMs),
        fileName: entry.name,
        filePath: entryPath,
        relativePath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        mimeType: guessMimeType(entry.name),
        fileContent: buffer.toString('base64'),
      });
    }
  }

  await collectFiles(resolved, '');

  return { files, count: files.length, folderPath: resolved };
}
