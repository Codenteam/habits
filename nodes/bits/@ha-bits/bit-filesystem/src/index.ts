/**
 * @ha-bits/bit-filesystem
 * 
 * Filesystem operations bit for reading, writing, and managing files.
 * Uses driver.ts for actual filesystem operations (stubbed for Tauri).
 */

// Relative import - bundle generator's plugin will intercept and stub for Tauri
import * as driver from './driver';

interface FilesystemContext {
  propsValue: Record<string, any>;
}

const filesystemBit = {
  displayName: 'Filesystem',
  description: 'Read, write, and manage files on the local filesystem',
  logoUrl: 'lucide:FolderOpen',
  runtime: 'all',

  auth: {
    type: 'NONE',
  },

  actions: {
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
      async run(context: FilesystemContext) {
        return driver.readFile(context.propsValue as any);
      },
    },

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
      async run(context: FilesystemContext) {
        return driver.writeFile(context.propsValue as any);
      },
    },

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
      async run(context: FilesystemContext) {
        return driver.appendFile(context.propsValue as any);
      },
    },

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
      async run(context: FilesystemContext) {
        return driver.deleteFile(context.propsValue as any);
      },
    },

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
      async run(context: FilesystemContext) {
        return driver.listDirectory(context.propsValue as any);
      },
    },

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
      async run(context: FilesystemContext) {
        return driver.createDirectory(context.propsValue as any);
      },
    },

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
      async run(context: FilesystemContext) {
        return driver.exists(context.propsValue as any);
      },
    },

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
      async run(context: FilesystemContext) {
        return driver.copyFile(context.propsValue as any);
      },
    },

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
      async run(context: FilesystemContext) {
        return driver.moveFile(context.propsValue as any);
      },
    },
  },

  triggers: {},
};

export default filesystemBit;
