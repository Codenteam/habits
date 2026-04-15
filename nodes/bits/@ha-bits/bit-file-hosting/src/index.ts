/**
 * @ha-bits/bit-file-hosting
 * 
 * L0 (Level 0) base bit for cloud file hosting services.
 * 
 * This bit defines common interfaces, types, and in-memory stub implementations
 * for file hosting operations. It should be replaced by concrete implementations:
 * - @ha-bits/bit-google-drive: Google Drive storage
 * - @ha-bits/bit-dropbox: Dropbox storage
 * - @ha-bits/bit-onedrive: Microsoft OneDrive storage
 * 
 * Level: L0 (Abstract base, not intended for direct production use)
 */

// ============================================================================
// Common Types & Interfaces - exported for child bits to implement
// ============================================================================

export interface FileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  modifiedAt: string;
  path?: string;
  parentId?: string;
  webViewLink?: string;
  downloadUrl?: string;
  isFolder: boolean;
  shared?: boolean;
}

export interface FolderMetadata {
  id: string;
  name: string;
  path?: string;
  parentId?: string;
  createdAt: string;
  webViewLink?: string;
}

// ---- Upload File ----
export interface UploadFileParams {
  fileName: string;
  content: string | Buffer;
  mimeType?: string;
  folderId?: string;
  folderPath?: string;
  overwrite?: boolean;
}

export interface UploadFileResult {
  success: boolean;
  file: FileMetadata;
  message?: string;
}

// ---- Create Folder ----
export interface CreateFolderParams {
  folderName: string;
  parentFolderId?: string;
  parentFolderPath?: string;
}

export interface CreateFolderResult {
  success: boolean;
  folder: FolderMetadata;
  message?: string;
}

// ---- Move File ----
export interface MoveFileParams {
  fileId: string;
  destinationFolderId?: string;
  destinationPath?: string;
  newName?: string;
}

export interface MoveFileResult {
  success: boolean;
  file: FileMetadata;
  previousPath?: string;
  newPath?: string;
  message?: string;
}

// ---- List Files ----
export interface ListFilesParams {
  folderId?: string;
  folderPath?: string;
  query?: string;
  mimeType?: string;
  limit?: number;
  pageToken?: string;
  includeSubfolders?: boolean;
}

export interface ListFilesResult {
  success: boolean;
  files: FileMetadata[];
  folders: FolderMetadata[];
  nextPageToken?: string;
  totalCount?: number;
}

// ---- Share File ----
export interface ShareFileParams {
  fileId: string;
  email?: string;
  role?: 'reader' | 'writer' | 'commenter' | 'owner';
  type?: 'user' | 'group' | 'domain' | 'anyone';
  notifyUser?: boolean;
  message?: string;
}

export interface ShareFileResult {
  success: boolean;
  permissionId?: string;
  shareLink?: string;
  message?: string;
}

// ---- Download File ----
export interface DownloadFileParams {
  fileId: string;
  outputPath?: string;
}

export interface DownloadFileResult {
  success: boolean;
  content?: string | Buffer;
  mimeType?: string;
  fileName?: string;
  message?: string;
}

// ---- Delete File ----
export interface DeleteFileParams {
  fileId: string;
  permanent?: boolean;
}

export interface DeleteFileResult {
  success: boolean;
  deleted: boolean;
  fileId: string;
  message?: string;
}

// ---- Copy File ----
export interface CopyFileParams {
  fileId: string;
  destinationFolderId?: string;
  newName?: string;
}

export interface CopyFileResult {
  success: boolean;
  file: FileMetadata;
  message?: string;
}

// ---- Search Files ----
export interface SearchFilesParams {
  query: string;
  mimeType?: string;
  limit?: number;
  pageToken?: string;
}

export interface SearchFilesResult {
  success: boolean;
  files: FileMetadata[];
  nextPageToken?: string;
}

// ---- Get File Metadata ----
export interface GetFileMetadataParams {
  fileId: string;
}

export interface GetFileMetadataResult {
  success: boolean;
  file?: FileMetadata;
  message?: string;
}

// ============================================================================
// Context Interfaces
// ============================================================================

export interface FileHostingAuth {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
}

export interface FileHostingContext {
  auth?: FileHostingAuth;
  propsValue: Record<string, any>;
}

// ============================================================================
// In-Memory Storage (Demo/Testing Only)
// ============================================================================

const memoryStorage: Map<string, FileMetadata | FolderMetadata> = new Map();
let idCounter = 1;

function generateId(): string {
  return `mem_${Date.now()}_${idCounter++}`;
}

// ============================================================================
// L0 Base Bit Definition
// ============================================================================

const fileHostingBit = {
  displayName: 'File Hosting (Base)',
  description: 'L0 base bit for cloud file hosting - provides common interfaces and in-memory stub implementations',
  logoUrl: 'lucide:FolderCloud',
  runtime: 'all',
  
  /**
   * Declares which bits can replace this one.
   * These bits implement the same interface with real cloud storage backends.
   */
  replaceableBy: [
    '@ha-bits/bit-google-drive',
    '@ha-bits/bit-dropbox',
    '@ha-bits/bit-onedrive',
  ],
  
  actions: {
    /**
     * Upload a file (in-memory stub)
     */
    uploadFile: {
      name: 'uploadFile',
      displayName: 'Upload File',
      description: 'Upload a file to cloud storage (stub: stores in memory)',
      props: {
        fileName: {
          type: 'SHORT_TEXT',
          displayName: 'File Name',
          description: 'Name of the file to upload',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Content',
          description: 'File content (text or base64 encoded)',
          required: true,
        },
        mimeType: {
          type: 'SHORT_TEXT',
          displayName: 'MIME Type',
          description: 'File MIME type (e.g., text/plain, application/pdf)',
          required: false,
          defaultValue: 'application/octet-stream',
        },
        folderId: {
          type: 'SHORT_TEXT',
          displayName: 'Folder ID',
          description: 'ID of the parent folder',
          required: false,
        },
      },
      async run(context: FileHostingContext): Promise<UploadFileResult> {
        const { fileName, content, mimeType, folderId } = context.propsValue;
        
        const now = new Date().toISOString();
        const file: FileMetadata = {
          id: generateId(),
          name: fileName,
          mimeType: mimeType || 'application/octet-stream',
          size: typeof content === 'string' ? content.length : (content as Buffer).length,
          createdAt: now,
          modifiedAt: now,
          parentId: folderId,
          isFolder: false,
        };
        
        memoryStorage.set(file.id, file);
        
        console.log(`📁 [bit-file-hosting] Uploaded file: ${fileName} (ID: ${file.id})`);
        
        return {
          success: true,
          file,
          message: 'File uploaded to in-memory storage (stub)',
        };
      },
    },
    
    /**
     * Create a folder (in-memory stub)
     */
    createFolder: {
      name: 'createFolder',
      displayName: 'Create Folder',
      description: 'Create a new folder (stub: stores in memory)',
      props: {
        folderName: {
          type: 'SHORT_TEXT',
          displayName: 'Folder Name',
          description: 'Name of the folder to create',
          required: true,
        },
        parentFolderId: {
          type: 'SHORT_TEXT',
          displayName: 'Parent Folder ID',
          description: 'ID of the parent folder',
          required: false,
        },
      },
      async run(context: FileHostingContext): Promise<CreateFolderResult> {
        const { folderName, parentFolderId } = context.propsValue;
        
        const now = new Date().toISOString();
        const folder: FolderMetadata = {
          id: generateId(),
          name: folderName,
          parentId: parentFolderId,
          createdAt: now,
        };
        
        memoryStorage.set(folder.id, { ...folder, isFolder: true } as FileMetadata);
        
        console.log(`📁 [bit-file-hosting] Created folder: ${folderName} (ID: ${folder.id})`);
        
        return {
          success: true,
          folder,
          message: 'Folder created in in-memory storage (stub)',
        };
      },
    },
    
    /**
     * Move a file (in-memory stub)
     */
    moveFile: {
      name: 'moveFile',
      displayName: 'Move File',
      description: 'Move a file to a different folder (stub)',
      props: {
        fileId: {
          type: 'SHORT_TEXT',
          displayName: 'File ID',
          description: 'ID of the file to move',
          required: true,
        },
        destinationFolderId: {
          type: 'SHORT_TEXT',
          displayName: 'Destination Folder ID',
          description: 'ID of the destination folder',
          required: true,
        },
        newName: {
          type: 'SHORT_TEXT',
          displayName: 'New Name',
          description: 'Optional new name for the file',
          required: false,
        },
      },
      async run(context: FileHostingContext): Promise<MoveFileResult> {
        const { fileId, destinationFolderId, newName } = context.propsValue;
        
        const file = memoryStorage.get(fileId) as FileMetadata;
        if (!file) {
          return {
            success: false,
            file: {} as FileMetadata,
            message: `File not found: ${fileId}`,
          };
        }
        
        const previousPath = file.parentId;
        file.parentId = destinationFolderId;
        if (newName) {
          file.name = newName;
        }
        file.modifiedAt = new Date().toISOString();
        
        memoryStorage.set(fileId, file);
        
        console.log(`📁 [bit-file-hosting] Moved file: ${file.name} to folder ${destinationFolderId}`);
        
        return {
          success: true,
          file,
          previousPath,
          newPath: destinationFolderId,
          message: 'File moved in in-memory storage (stub)',
        };
      },
    },
    
    /**
     * List files in a folder (in-memory stub)
     */
    listFiles: {
      name: 'listFiles',
      displayName: 'List Files',
      description: 'List files and folders in a directory (stub)',
      props: {
        folderId: {
          type: 'SHORT_TEXT',
          displayName: 'Folder ID',
          description: 'ID of the folder to list (leave empty for root)',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of results',
          required: false,
          defaultValue: 100,
        },
      },
      async run(context: FileHostingContext): Promise<ListFilesResult> {
        const { folderId, limit = 100 } = context.propsValue;
        
        const files: FileMetadata[] = [];
        const folders: FolderMetadata[] = [];
        
        for (const [, item] of memoryStorage) {
          const fileItem = item as FileMetadata;
          if (fileItem.parentId === folderId || (!folderId && !fileItem.parentId)) {
            if (fileItem.isFolder) {
              folders.push({
                id: fileItem.id,
                name: fileItem.name,
                parentId: fileItem.parentId,
                createdAt: fileItem.createdAt,
              });
            } else {
              files.push(fileItem);
            }
          }
          
          if (files.length + folders.length >= limit) break;
        }
        
        console.log(`📁 [bit-file-hosting] Listed ${files.length} files and ${folders.length} folders`);
        
        return {
          success: true,
          files,
          folders,
          totalCount: files.length + folders.length,
        };
      },
    },
    
    /**
     * Share a file (stub - no-op)
     */
    shareFile: {
      name: 'shareFile',
      displayName: 'Share File',
      description: 'Share a file with others (stub: returns mock share link)',
      props: {
        fileId: {
          type: 'SHORT_TEXT',
          displayName: 'File ID',
          description: 'ID of the file to share',
          required: true,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Email address to share with',
          required: false,
        },
        role: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Role',
          description: 'Permission level',
          required: false,
          defaultValue: 'reader',
          options: {
            options: [
              { label: 'Reader', value: 'reader' },
              { label: 'Writer', value: 'writer' },
              { label: 'Commenter', value: 'commenter' },
            ],
          },
        },
      },
      async run(context: FileHostingContext): Promise<ShareFileResult> {
        const { fileId, email, role } = context.propsValue;
        
        const file = memoryStorage.get(fileId);
        if (!file) {
          return {
            success: false,
            message: `File not found: ${fileId}`,
          };
        }
        
        console.log(`📁 [bit-file-hosting] Shared file ${fileId} with ${email || 'anyone'} as ${role}`);
        
        return {
          success: true,
          permissionId: generateId(),
          shareLink: `https://example.com/share/${fileId}`,
          message: 'File sharing stubbed (in-memory)',
        };
      },
    },
  },
  
  triggers: {},
};

// Export the bit and all types
export const fileHosting = fileHostingBit;
export default fileHostingBit;
