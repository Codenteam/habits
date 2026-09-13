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

interface BitsPollingStore {
  hasSeenItem(itemId: string, itemDate?: string): Promise<boolean>;
  markItemSeen(itemId: string, sourceDate: string, data?: any): Promise<void>;
}

interface FolderWatcherContext {
  propsValue: {
    folderPath?: string;
    baseDir?: string;
    recursive?: boolean;
    cronExpression?: string;
  };
  pollingStore?: BitsPollingStore;
  setSchedule?: (options: { cronExpression: string; timezone?: string }) => void;
}

function assertNodeRuntime(): void {
  const isNode = typeof process !== 'undefined' && !!process.versions?.node;
  const globalRef = globalThis as any;
  const isTauri = !!(
    globalRef.__TAURI__?.core?.invoke ||
    globalRef.__TAURI__?.invoke
  );

  if (!isNode || isTauri) {
    throw new Error(
      'The folder file watcher trigger requires Node.js (Cortex server). It is not available in the Tauri app.'
    );
  }
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

  triggers: {
    /**
     * Poll a folder for new files (Node.js / Cortex server only).
     * Returns only files not yet seen, deduplicated via PollingStore.
     * Cortex executes the workflow once per returned file.
     */
    newFiles: {
      name: 'newFiles',
      displayName: 'New Files in Folder',
      description:
        'Polls a directory for new or modified files on a schedule. Returns each unseen file with metadata and base64 content. Node.js only.',
      type: 'POLLING',
      props: {
        folderPath: {
          type: 'SHORT_TEXT',
          displayName: 'Folder Path',
          description: 'Absolute or relative path to the directory to watch',
          required: true,
        },
        baseDir: {
          type: 'SHORT_TEXT',
          displayName: 'Base Directory',
          description: 'Base directory for relative folder paths (defaults to cwd)',
          required: false,
        },
        recursive: {
          type: 'CHECKBOX',
          displayName: 'Recursive',
          description: 'Include files in subdirectories',
          required: false,
          defaultValue: false,
        },
        cronExpression: {
          type: 'SHORT_TEXT',
          displayName: 'Poll Interval',
          description: 'Cron expression for polling (default: every 1 minute)',
          required: false,
          defaultValue: '*/1 * * * *',
        },
      },

      async onEnable(context: FolderWatcherContext): Promise<void> {
        const cron = context.propsValue.cronExpression || '*/1 * * * *';
        context.setSchedule?.({ cronExpression: cron, timezone: 'UTC' });
      },

      async onDisable(_context: FolderWatcherContext): Promise<void> {
        // Server stops the cron job on disable.
      },

      async run(context: FolderWatcherContext): Promise<any[]> {
        assertNodeRuntime();

        const folderPath = String(context.propsValue.folderPath || '').trim();
        if (!folderPath) {
          console.log('[bit-filesystem] newFiles: no folderPath provided, skipping');
          return [];
        }

        const { baseDir, recursive = false } = context.propsValue;
        const pollingStore = context.pollingStore;

        let scanResult: Awaited<ReturnType<typeof driver.readDirectoryFiles>>;
        try {
          scanResult = await driver.readDirectoryFiles({
            folderPath,
            baseDir,
            recursive: Boolean(recursive),
          });
        } catch (err: any) {
          console.error(`[bit-filesystem] newFiles: ${err.message}`);
          throw err;
        }

        const newFiles: any[] = [];

        for (const file of scanResult.files) {
          const seen = pollingStore
            ? await pollingStore.hasSeenItem(file.fileId, file.modified)
            : false;

          if (!seen) {
            newFiles.push({
              fileId: file.fileId,
              fileName: file.fileName,
              filePath: file.filePath,
              relativePath: file.relativePath,
              size: file.size,
              modified: file.modified,
              created: file.created,
              mimeType: file.mimeType,
              fileContent: file.fileContent,
              folderPath: scanResult.folderPath,
            });
          }
        }

        if (pollingStore) {
          for (const file of newFiles) {
            await pollingStore.markItemSeen(file.fileId, file.modified, {
              fileName: file.fileName,
              filePath: file.filePath,
              size: file.size,
            });
          }
        }

        console.log(
          `[bit-filesystem] newFiles: ${newFiles.length} new file(s) in ${scanResult.folderPath} (${scanResult.count} total)`
        );

        return newFiles;
      },

      sampleData: {
        fileId: '/data/knowledge/company-info.pdf|12345|1700000000000',
        fileName: 'company-info.pdf',
        filePath: '/data/knowledge/company-info.pdf',
        relativePath: 'company-info.pdf',
        size: 12345,
        modified: new Date().toISOString(),
        created: new Date().toISOString(),
        mimeType: 'application/pdf',
        fileContent: 'JVBERi0xLjQK...',
        folderPath: '/data/knowledge',
      },
    },
  },
};

export default filesystemBit;
