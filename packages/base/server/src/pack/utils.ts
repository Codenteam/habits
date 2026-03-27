/**
 * Shared utilities for pack handlers
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoggerFactory } from '@ha-bits/core/logger';
import { getTmpDir } from '@ha-bits/core/pathUtils';
import JSZip from 'jszip';

const logger = LoggerFactory.getRoot();

/**
 * Sanitize stack name for use in filenames
 */
export function sanitizeStackName(name: string | undefined): string {
  if (!name || name.trim() === '' || name === 'Stack Name') {
    return 'habits';
  }
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Find the workspace root by looking for nx.json or package.json with workspaces
 */
export function findWorkspaceRoot(startDir?: string): string | null {
  let dir = startDir || process.cwd();
  
  // Walk up the directory tree
  while (dir !== path.dirname(dir)) {
    // Check for habits workspace markers
    if (fs.existsSync(path.join(dir, 'nx.json')) && fs.existsSync(path.join(dir, 'nodes', 'bits', '@ha-bits'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  
  return null;
}

/**
 * Get the path to the bits node_modules directory
 * This is where @ha-bits/* packages are located (nodes/bits/)
 */
export function getBitsNodeModulesPath(workspaceRoot?: string): string | null {
  const root = workspaceRoot || findWorkspaceRoot();
  if (!root) return null;
  
  const bitsPath = path.join(root, 'nodes', 'bits');
  if (fs.existsSync(bitsPath)) {
    return bitsPath;
  }
  
  return null;
}

/**
 * Create temporary work directory with prefix using timestamp
 */
export function createTmpWorkDir(prefix: string): string {
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  const workDir = path.join(getTmpDir(), `habits-${prefix}-${timestamp}`);
  fs.mkdirSync(workDir, { recursive: true });
  return workDir;
}

/**
 * Get or create work directory with optional stack ID for caching.
 * If stackId is provided, uses a predictable directory name for incremental builds.
 * Returns whether the directory already existed (for cache hit detection).
 */
export function getOrCreateWorkDir(prefix: string, stackId?: string): { workDir: string; existed: boolean } {
  if (stackId) {
    // Use predictable path based on stack ID for build caching
    const workDir = path.join(getTmpDir(), `habits-${prefix}-${stackId}`);
    const existed = fs.existsSync(workDir);
    
    if (!existed) {
      fs.mkdirSync(workDir, { recursive: true });
      logger.info(`Created new work directory for stack`, { workDir, stackId });
    } else {
      logger.info(`Reusing existing work directory for stack`, { workDir, stackId });
    }
    
    return { workDir, existed };
  }
  
  // Fallback to timestamp-based directory (no caching)
  return { workDir: createTmpWorkDir(prefix), existed: false };
}

/**
 * Sync files to an existing work directory.
 * Overwrites all files but preserves build artifacts (node_modules, target).
 */
export function syncWorkDir(workDir: string, files: Record<string, string | Buffer>): void {
  logger.info(`Syncing files to work directory`, { workDir, fileCount: Object.keys(files).length });
  
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(workDir, relativePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(fullPath, content);
    } else {
      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }
}

/**
 * Create cleanup handler for temporary directory
 */
export function createCleanupHandler(workDir: string): () => void {
  return () => {
    try {
      if (process.env.DEBUG) {
        logger.info(`Debug mode - skipping cleanup of ${workDir}`);
        return;
      }
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  };
}

/**
 * Get MIME type for file extension
 */
export function getMimeTypeForExtension(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.dmg': 'application/x-apple-diskimage',
    '.exe': 'application/x-msdownload',
    '.msi': 'application/x-msi',
    '.AppImage': 'application/x-executable',
    '.deb': 'application/x-debian-package',
    '.rpm': 'application/x-rpm',
    '.apk': 'application/vnd.android.package-archive',
    '.ipa': 'application/octet-stream',
    '.zip': 'application/zip',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Add directory contents to JSZip recursively
 */
export function addDirectoryToZip(dir: string, zip: JSZip, baseDir?: string): void {
  const base = baseDir || dir;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    const relativePath = path.relative(base, filePath);
    
    if (stat.isDirectory()) {
      addDirectoryToZip(filePath, zip, base);
    } else {
      zip.file(relativePath, fs.readFileSync(filePath));
    }
  }
}

/**
 * Extract error message from execSync error
 */
export function buildErrorMessage(error: any, context?: string): string {
  const message = error.stderr?.toString() || error.stdout?.toString() || error.message || 'Unknown error';
  return context ? `${context}: ${message}` : message;
}

/**
 * Write multiple files in batch
 */
export function writeProjectFiles(workDir: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(workDir, relativePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content);
  }
}

/**
 * Placeholder icon as base64 (1x1 transparent PNG)
 * Used as fallback when no custom icon or default logo is available
 */
export const PLACEHOLDER_ICON_BASE64 = 
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
