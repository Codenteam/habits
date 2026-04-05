/**
 * @ha-bits/bit-onedrive
 * 
 * Microsoft OneDrive integration bit for file hosting and cloud storage.
 * Replaces @ha-bits/bit-file-hosting with OneDrive implementation.
 * 
 * Authentication: OAuth 2.0 (Microsoft Identity Platform)
 * Required scopes: Files.ReadWrite, Files.ReadWrite.All, offline_access
 * 
 * Level: L2 (Service-specific auth, CRUD operations)
 */

import type {
  FileMetadata,
  FolderMetadata,
  UploadFileResult,
  CreateFolderResult,
  ListFilesResult,
} from '@ha-bits/bit-file-hosting';

// Re-export types from base
export type {
  FileMetadata,
  FolderMetadata,
  UploadFileResult,
  CreateFolderResult,
  ListFilesResult,
} from '@ha-bits/bit-file-hosting';

interface OneDriveContext {
  auth?: { accessToken?: string };
  propsValue: Record<string, any>;
}

// Microsoft Graph API response types
interface OneDriveItem {
  id: string;
  name: string;
  size?: number;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  webUrl?: string;
  '@microsoft.graph.downloadUrl'?: string;
  parentReference?: {
    id?: string;
    path?: string;
  };
  folder?: {
    childCount: number;
  };
  file?: {
    mimeType?: string;
  };
}

interface OneDriveListResponse {
  value: OneDriveItem[];
  '@odata.nextLink'?: string;
}

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com';
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';
const DEFAULT_SCOPES = ['Files.ReadWrite', 'Files.ReadWrite.All', 'offline_access'];

/**
 * Make a request to Microsoft Graph API
 */
async function graphRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: any,
  contentType: string = 'application/json'
): Promise<any> {
  const url = `${GRAPH_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  };
  
  if (body && contentType) {
    headers['Content-Type'] = contentType;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? (contentType === 'application/json' ? JSON.stringify(body) : body) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Microsoft Graph API Error (${response.status}): ${errorText}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
}

/**
 * Convert OneDrive item to common FileMetadata
 */
function toFileMetadata(item: OneDriveItem): FileMetadata {
  return {
    id: item.id,
    name: item.name,
    mimeType: item.file?.mimeType || 'application/octet-stream',
    size: item.size || 0,
    createdAt: item.createdDateTime || new Date().toISOString(),
    modifiedAt: item.lastModifiedDateTime || new Date().toISOString(),
    parentId: item.parentReference?.id,
    path: item.parentReference?.path,
    webViewLink: item.webUrl,
    downloadUrl: item['@microsoft.graph.downloadUrl'],
    isFolder: !!item.folder,
  };
}

/**
 * Convert OneDrive folder to common FolderMetadata
 */
function toFolderMetadata(item: OneDriveItem): FolderMetadata {
  return {
    id: item.id,
    name: item.name,
    parentId: item.parentReference?.id,
    path: item.parentReference?.path,
    createdAt: item.createdDateTime || new Date().toISOString(),
    webViewLink: item.webUrl,
  };
}

const oneDriveBit = {
  displayName: 'Microsoft OneDrive',
  description: 'Microsoft OneDrive cloud storage integration for file hosting operations',
  logoUrl: 'lucide:Cloud',
  runtime: 'all',
  
  // This bit replaces the base file-hosting bit
  replaces: '@ha-bits/bit-file-hosting',
  
  // OAuth 2.0 authentication for Microsoft Graph API
  auth: {
    type: 'OAUTH2' as const,
    displayName: 'Microsoft OneDrive',
    description: 'Connect to Microsoft OneDrive using OAuth2',
    required: true,
    authorizationUrl: `${MICROSOFT_AUTH_URL}/common/oauth2/v2.0/authorize`,
    tokenUrl: `${MICROSOFT_AUTH_URL}/common/oauth2/v2.0/token`,
    scopes: DEFAULT_SCOPES,
  },
  
  actions: {
    /**
     * Upload a file to OneDrive
     */
    uploadFile: {
      name: 'uploadFile',
      displayName: 'Upload File',
      description: 'Upload a file to OneDrive',
      props: {
        fileName: {
          type: 'SHORT_TEXT',
          displayName: 'File Name',
          description: 'Name of the file (including path, e.g., Documents/file.txt)',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Content',
          description: 'File content (text or base64 encoded)',
          required: true,
        },
        conflictBehavior: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Conflict Behavior',
          description: 'How to handle existing files',
          required: false,
          defaultValue: 'rename',
          options: {
            options: [
              { label: 'Rename (auto-rename if exists)', value: 'rename' },
              { label: 'Replace', value: 'replace' },
              { label: 'Fail', value: 'fail' },
            ],
          },
        },
      },
      async run(context: OneDriveContext): Promise<UploadFileResult> {
        if (!context.auth?.accessToken) {
          throw new Error('Please authorize OneDrive access first.');
        }
        
        const { fileName, content, conflictBehavior = 'rename' } = context.propsValue;
        
        // Prepare path - OneDrive uses /me/drive/root:/path:/content for path-based upload
        const path = fileName.startsWith('/') ? fileName.slice(1) : fileName;
        
        // Determine if content is base64
        let fileContent: string | Buffer = content;
        if (typeof content === 'string' && content.match(/^[A-Za-z0-9+/=]+$/)) {
          try {
            fileContent = Buffer.from(content, 'base64');
          } catch {
            fileContent = content;
          }
        }
        
        // For small files (< 4MB), use simple upload
        const endpoint = `/me/drive/root:/${encodeURIComponent(path)}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;
        
        const response = await graphRequest(
          endpoint,
          'PUT',
          context.auth.accessToken,
          fileContent,
          'application/octet-stream'
        );
        
        console.log(`📁 [bit-onedrive] Uploaded file: ${path} (ID: ${response.id})`);
        
        return {
          success: true,
          file: toFileMetadata(response),
        };
      },
    },
    
    /**
     * Create a folder in OneDrive
     */
    createFolder: {
      name: 'createFolder',
      displayName: 'Create Folder',
      description: 'Create a new folder in OneDrive',
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
          description: 'ID of the parent folder (leave empty for root)',
          required: false,
        },
        parentPath: {
          type: 'SHORT_TEXT',
          displayName: 'Parent Path',
          description: 'Alternative: Parent folder path (e.g., Documents/Projects)',
          required: false,
        },
      },
      async run(context: OneDriveContext): Promise<CreateFolderResult> {
        if (!context.auth?.accessToken) {
          throw new Error('Please authorize OneDrive access first.');
        }
        
        const { folderName, parentFolderId, parentPath } = context.propsValue;
        
        let endpoint: string;
        if (parentFolderId) {
          endpoint = `/me/drive/items/${parentFolderId}/children`;
        } else if (parentPath) {
          const path = parentPath.startsWith('/') ? parentPath.slice(1) : parentPath;
          endpoint = `/me/drive/root:/${encodeURIComponent(path)}:/children`;
        } else {
          endpoint = '/me/drive/root/children';
        }
        
        const response = await graphRequest(
          endpoint,
          'POST',
          context.auth.accessToken,
          {
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename',
          }
        );
        
        console.log(`📁 [bit-onedrive] Created folder: ${folderName} (ID: ${response.id})`);
        
        return {
          success: true,
          folder: toFolderMetadata(response),
        };
      },
    },
    
    /**
     * List files and folders in a directory
     */
    listFiles: {
      name: 'listFiles',
      displayName: 'List Files',
      description: 'List files and folders in a OneDrive directory',
      props: {
        folderId: {
          type: 'SHORT_TEXT',
          displayName: 'Folder ID',
          description: 'ID of the folder to list (leave empty for root)',
          required: false,
        },
        folderPath: {
          type: 'SHORT_TEXT',
          displayName: 'Folder Path',
          description: 'Alternative: Folder path (e.g., Documents/Projects)',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of results (default: 100)',
          required: false,
          defaultValue: 100,
        },
        pageToken: {
          type: 'SHORT_TEXT',
          displayName: 'Page Token',
          description: 'Token for pagination (nextLink URL)',
          required: false,
        },
      },
      async run(context: OneDriveContext): Promise<ListFilesResult> {
        if (!context.auth?.accessToken) {
          throw new Error('Please authorize OneDrive access first.');
        }
        
        const { folderId, folderPath, limit = 100, pageToken } = context.propsValue;
        
        let endpoint: string;
        
        // If we have a page token (nextLink), use it directly
        if (pageToken) {
          // pageToken is the full nextLink URL, extract the path
          const url = new URL(pageToken);
          endpoint = url.pathname.replace('/v1.0', '') + url.search;
        } else if (folderId) {
          endpoint = `/me/drive/items/${folderId}/children?$top=${limit}`;
        } else if (folderPath) {
          const path = folderPath.startsWith('/') ? folderPath.slice(1) : folderPath;
          endpoint = `/me/drive/root:/${encodeURIComponent(path)}:/children?$top=${limit}`;
        } else {
          endpoint = `/me/drive/root/children?$top=${limit}`;
        }
        
        const response = await graphRequest(
          endpoint,
          'GET',
          context.auth.accessToken
        ) as OneDriveListResponse;
        
        const files: FileMetadata[] = [];
        const folders: FolderMetadata[] = [];
        
        for (const item of response.value) {
          if (item.folder) {
            folders.push(toFolderMetadata(item));
          } else {
            files.push(toFileMetadata(item));
          }
        }
        
        console.log(`📁 [bit-onedrive] Listed ${files.length} files and ${folders.length} folders`);
        
        return {
          success: true,
          files,
          folders,
          nextPageToken: response['@odata.nextLink'],
          totalCount: files.length + folders.length,
        };
      },
    },
  },
  
  triggers: {
    /**
     * Trigger when a new file is added
     */
    newFile: {
      name: 'newFile',
      displayName: 'New File',
      description: 'Triggers when a new file is added to OneDrive',
      type: 'POLLING',
      props: {
        folderId: {
          type: 'SHORT_TEXT',
          displayName: 'Folder ID',
          description: 'Folder to watch',
          required: false,
        },
      },
      async run(context: OneDriveContext) {
        // Polling trigger - would check for new files since last poll
        return { files: [] };
      },
    },
  },
};

export const oneDrive = oneDriveBit;
export default oneDriveBit;
