/**
 * @ha-bits/bit-filesystem
 * 
 * Filesystem operations bit for reading, writing, and managing files.
 * Provides secure file access with configurable base directory.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface FilesystemContext {
  propsValue: Record<string, any>;
}

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  created: Date;
  modified: Date;
}

/**
 * Resolve and validate path within allowed base directory
 */
function resolvePath(filePath: string, baseDir?: string): string {
  const base = baseDir || process.cwd();
  const resolved = path.resolve(base, filePath);
  
  // Security: ensure resolved path is within base directory
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error('Path traversal not allowed');
  }
  
  return resolved;
}

const filesystemBit = {
  displayName: 'Filesystem',
  description: 'Read, write, and manage files on the local filesystem',
  logoUrl: 'lucide:FolderOpen',

  auth: {
    type: 'NONE',
  },

  actions: {
    /**
     * Read a file's contents
     */
    readFile: {
      name: 'readFile',
      displayName: 'Read File',
      description: 'Read the contents of a file',
      props: {
        filePath: {
          type: 'SHORT_TEXT',
          displayName: 'File Path',
          description: 'Path to the file to read',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths (defaults to cwd)',
          required: false,
        },
        encoding: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Encoding',
          description: 'File encoding',
          required: false,
          defaultValue: 'utf-8',
          options: {
            options: [
              { label: 'UTF-8', value: 'utf-8' },
              { label: 'ASCII', value: 'ascii' },
              { label: 'Base64', value: 'base64' },
              { label: 'Binary', value: 'binary' },
            ],
          },
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { filePath, baseDir, encoding = 'utf-8' } = context.propsValue;
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
      },
    },

    /**
     * Write content to a file
     */
    writeFile: {
      name: 'writeFile',
      displayName: 'Write File',
      description: 'Write content to a file (creates or overwrites)',
      props: {
        filePath: {
          type: 'SHORT_TEXT',
          displayName: 'File Path',
          description: 'Path to the file to write',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Content',
          description: 'Content to write to the file',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths (defaults to cwd)',
          required: false,
        },
        createDirs: {
          type: 'CHECKBOX',
          displayName: 'Create Directories',
          description: 'Create parent directories if they do not exist',
          required: false,
          defaultValue: true,
        },
        encoding: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Encoding',
          description: 'File encoding',
          required: false,
          defaultValue: 'utf-8',
          options: {
            options: [
              { label: 'UTF-8', value: 'utf-8' },
              { label: 'ASCII', value: 'ascii' },
              { label: 'Base64 (decode)', value: 'base64' },
            ],
          },
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { filePath, content, baseDir, createDirs = true, encoding = 'utf-8' } = context.propsValue;
        const resolved = resolvePath(filePath, baseDir);
        
        if (createDirs) {
          await fs.mkdir(path.dirname(resolved), { recursive: true });
        }
        
        if (encoding === 'base64') {
          const buffer = Buffer.from(content, 'base64');
          await fs.writeFile(resolved, buffer);
          return { success: true, path: resolved, size: buffer.length };
        }
        
        await fs.writeFile(resolved, content, encoding as BufferEncoding);
        return { success: true, path: resolved, size: content.length };
      },
    },

    /**
     * Append content to a file
     */
    appendFile: {
      name: 'appendFile',
      displayName: 'Append to File',
      description: 'Append content to the end of a file',
      props: {
        filePath: {
          type: 'SHORT_TEXT',
          displayName: 'File Path',
          description: 'Path to the file',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Content',
          description: 'Content to append',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths',
          required: false,
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { filePath, content, baseDir } = context.propsValue;
        const resolved = resolvePath(filePath, baseDir);
        
        await fs.appendFile(resolved, content);
        return { success: true, path: resolved };
      },
    },

    /**
     * Delete a file
     */
    deleteFile: {
      name: 'deleteFile',
      displayName: 'Delete File',
      description: 'Delete a file from the filesystem',
      props: {
        filePath: {
          type: 'SHORT_TEXT',
          displayName: 'File Path',
          description: 'Path to the file to delete',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths',
          required: false,
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { filePath, baseDir } = context.propsValue;
        const resolved = resolvePath(filePath, baseDir);
        
        await fs.unlink(resolved);
        return { success: true, deletedPath: resolved };
      },
    },

    /**
     * List directory contents
     */
    listDirectory: {
      name: 'listDirectory',
      displayName: 'List Directory',
      description: 'List files and folders in a directory',
      props: {
        dirPath: {
          type: 'SHORT_TEXT',
          displayName: 'Directory Path',
          description: 'Path to the directory',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths',
          required: false,
        },
        recursive: {
          type: 'CHECKBOX',
          displayName: 'Recursive',
          description: 'List subdirectories recursively',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { dirPath, baseDir, recursive = false } = context.propsValue;
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
            const subContext = {
              propsValue: { dirPath: entryPath, recursive: true }
            };
            const subResult = await filesystemBit.actions.listDirectory.run(subContext);
            files.push(...subResult.files);
          }
        }
        
        return { files, count: files.length, path: resolved };
      },
    },

    /**
     * Create a directory
     */
    createDirectory: {
      name: 'createDirectory',
      displayName: 'Create Directory',
      description: 'Create a new directory',
      props: {
        dirPath: {
          type: 'SHORT_TEXT',
          displayName: 'Directory Path',
          description: 'Path to create',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths',
          required: false,
        },
        recursive: {
          type: 'CHECKBOX',
          displayName: 'Create Parent Directories',
          description: 'Create parent directories if they do not exist',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { dirPath, baseDir, recursive = true } = context.propsValue;
        const resolved = resolvePath(dirPath, baseDir);
        
        await fs.mkdir(resolved, { recursive });
        return { success: true, path: resolved };
      },
    },

    /**
     * Check if a file or directory exists
     */
    exists: {
      name: 'exists',
      displayName: 'Check Exists',
      description: 'Check if a file or directory exists',
      props: {
        filePath: {
          type: 'SHORT_TEXT',
          displayName: 'Path',
          description: 'Path to check',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths',
          required: false,
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { filePath, baseDir } = context.propsValue;
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
      },
    },

    /**
     * Copy a file
     */
    copyFile: {
      name: 'copyFile',
      displayName: 'Copy File',
      description: 'Copy a file to a new location',
      props: {
        sourcePath: {
          type: 'SHORT_TEXT',
          displayName: 'Source Path',
          description: 'Path to the source file',
          required: true,
        },
        destPath: {
          type: 'SHORT_TEXT',
          displayName: 'Destination Path',
          description: 'Path to the destination',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths',
          required: false,
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { sourcePath, destPath, baseDir } = context.propsValue;
        const src = resolvePath(sourcePath, baseDir);
        const dest = resolvePath(destPath, baseDir);
        
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(src, dest);
        return { success: true, source: src, destination: dest };
      },
    },

    /**
     * Move/rename a file
     */
    moveFile: {
      name: 'moveFile',
      displayName: 'Move/Rename File',
      description: 'Move or rename a file',
      props: {
        sourcePath: {
          type: 'SHORT_TEXT',
          displayName: 'Source Path',
          description: 'Current path of the file',
          required: true,
        },
        destPath: {
          type: 'SHORT_TEXT',
          displayName: 'Destination Path',
          description: 'New path for the file',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative paths',
          required: false,
        },
      },
      async run(context: FilesystemContext): Promise<any> {
        const { sourcePath, destPath, baseDir } = context.propsValue;
        const src = resolvePath(sourcePath, baseDir);
        const dest = resolvePath(destPath, baseDir);
        
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.rename(src, dest);
        return { success: true, source: src, destination: dest };
      },
    },
  },

  triggers: {},
};

export default filesystemBit;
