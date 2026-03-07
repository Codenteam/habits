/**
 * Shared utilities for pack handlers
 */

import * as fs from 'fs';
import * as path from 'path';
import { getTmpDir, LoggerFactory } from '@ha-bits/core';
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
 * Create temporary work directory with prefix
 */
export function createTmpWorkDir(prefix: string): string {
  return fs.mkdtempSync(path.join(getTmpDir(), `habits-${prefix}-`));
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
