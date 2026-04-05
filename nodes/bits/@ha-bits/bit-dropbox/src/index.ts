/**
 * @ha-bits/bit-dropbox
 * 
 * Dropbox integration bit for file hosting and cloud storage.
 * Replaces @ha-bits/bit-file-hosting with Dropbox implementation.
 * 
 * Authentication: OAuth 2.0 (Authorization Code Flow)
 * Required scopes: files.content.write, files.content.read, sharing.write
 * 
 * Level: L2 (Service-specific auth, CRUD operations)
 */

import type {
  FileMetadata,
  FolderMetadata,
  UploadFileResult,
  CreateFolderResult,
  MoveFileResult,
  ListFilesResult,
  FileHostingAuth,
} from '@ha-bits/bit-file-hosting';

// Re-export types from base
export type {
  FileMetadata,
  FolderMetadata,
  UploadFileResult,
  CreateFolderResult,
  MoveFileResult,
  ListFilesResult,
} from '@ha-bits/bit-file-hosting';

interface DropboxContext {
  auth?: FileHostingAuth;
  propsValue: Record<string, any>;
}

// Dropbox API response types
interface DropboxFileMetadata {
  '.tag': 'file' | 'folder';
  id: string;
  name: string;
  path_lower?: string;
  path_display?: string;
  client_modified?: string;
  server_modified?: string;
  size?: number;
  content_hash?: string;
}

interface DropboxListResponse {
  entries: DropboxFileMetadata[];
  cursor: string;
  has_more: boolean;
}

const DROPBOX_API_BASE = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_API_BASE = 'https://content.dropboxapi.com/2';
const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';

/**
 * Make a request to Dropbox API
 */
async function dropboxRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: any,
  isContentApi: boolean = false
): Promise<any> {
  const baseUrl = isContentApi ? DROPBOX_CONTENT_API_BASE : DROPBOX_API_BASE;
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
  };
  
  if (body && !isContentApi) {
    headers['Content-Type'] = 'application/json';
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? (isContentApi ? body : JSON.stringify(body)) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox API Error (${response.status}): ${errorText}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
}

/**
 * Upload file to Dropbox content API
 */
async function dropboxUpload(
  endpoint: string,
  accessToken: string,
  content: string | Buffer,
  apiArg: any
): Promise<any> {
  const url = `${DROPBOX_CONTENT_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/octet-stream',
    'Dropbox-API-Arg': JSON.stringify(apiArg),
  };
  
  const bodyBuffer = typeof content === 'string' ? Buffer.from(content) : content;
  const body = new Uint8Array(bodyBuffer);
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dropbox Upload Error (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

/**
 * Convert Dropbox file metadata to common FileMetadata
 */
function toFileMetadata(file: DropboxFileMetadata): FileMetadata {
  return {
    id: file.id,
    name: file.name,
    mimeType: 'application/octet-stream', // Dropbox doesn't return mime type
    size: file.size || 0,
    createdAt: file.client_modified || new Date().toISOString(),
    modifiedAt: file.server_modified || new Date().toISOString(),
    path: file.path_display,
    isFolder: file['.tag'] === 'folder',
  };
}

/**
 * Convert Dropbox folder metadata to common FolderMetadata
 */
function toFolderMetadata(file: DropboxFileMetadata): FolderMetadata {
  return {
    id: file.id,
    name: file.name,
    path: file.path_display,
    createdAt: new Date().toISOString(),
  };
}

const dropboxBit = {
  displayName: 'Dropbox',
  description: 'Dropbox cloud storage integration for file hosting operations',
  logoUrl: 'lucide:Inbox',
  runtime: 'all',
  
  // This bit replaces the base file-hosting bit
  replaces: '@ha-bits/bit-file-hosting',
  
  // OAuth 2.0 - handled automatically by cortex
  auth: {
    type: 'OAUTH2',
    displayName: 'Dropbox',
    description: 'Connect to Dropbox using OAuth2',
    required: true,
    authorizationUrl: DROPBOX_AUTH_URL,
    tokenUrl: DROPBOX_TOKEN_URL,
    scopes: ['files.content.write', 'files.content.read', 'sharing.write'],
    extraAuthParams: {
      token_access_type: 'offline',
    },
  },
  
  actions: {
    /**
     * Upload a file to Dropbox
     */
    uploadFile: {
      name: 'uploadFile',
      displayName: 'Upload File',
      description: 'Upload a file to Dropbox',
      props: {
        fileName: {
          type: 'SHORT_TEXT',
          displayName: 'File Name',
          description: 'Name of the file (including path, e.g., /folder/file.txt)',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Content',
          description: 'File content (text or base64 encoded)',
          required: true,
        },
        mode: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Write Mode',
          description: 'How to handle existing files',
          required: false,
          defaultValue: 'add',
          options: {
            options: [
              { label: 'Add (fail if exists)', value: 'add' },
              { label: 'Overwrite', value: 'overwrite' },
            ],
          },
        },
      },
      async run(context: DropboxContext): Promise<UploadFileResult> {
        const auth = context.auth;
        if (!auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Dropbox access first.');
        }
        
        const { fileName, content, mode = 'add' } = context.propsValue;
        
        // Ensure path starts with /
        const path = fileName.startsWith('/') ? fileName : `/${fileName}`;
        
        // Determine if content is base64
        let fileContent: string | Buffer = content;
        if (typeof content === 'string' && content.match(/^[A-Za-z0-9+/=]+$/)) {
          try {
            fileContent = Buffer.from(content, 'base64');
          } catch {
            fileContent = content;
          }
        }
        
        const response = await dropboxUpload(
          '/files/upload',
          auth.accessToken,
          fileContent,
          {
            path,
            mode,
            autorename: mode === 'add',
            mute: false,
          }
        );
        
        console.log(`📁 [bit-dropbox] Uploaded file: ${path} (ID: ${response.id})`);
        
        return {
          success: true,
          file: toFileMetadata(response),
        };
      },
    },
    
    /**
     * Create a folder in Dropbox
     */
    createFolder: {
      name: 'createFolder',
      displayName: 'Create Folder',
      description: 'Create a new folder in Dropbox',
      props: {
        folderPath: {
          type: 'SHORT_TEXT',
          displayName: 'Folder Path',
          description: 'Full path of the folder to create (e.g., /Documents/NewFolder)',
          required: true,
        },
        autorename: {
          type: 'CHECKBOX',
          displayName: 'Auto Rename',
          description: 'Automatically rename if folder exists',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: DropboxContext): Promise<CreateFolderResult> {
        const auth = context.auth;
        if (!auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Dropbox access first.');
        }
        
        const { folderPath, autorename = false } = context.propsValue;
        
        // Ensure path starts with /
        const path = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
        
        const response = await dropboxRequest(
          '/files/create_folder_v2',
          'POST',
          auth.accessToken,
          { path, autorename }
        );
        
        console.log(`📁 [bit-dropbox] Created folder: ${path}`);
        
        return {
          success: true,
          folder: toFolderMetadata(response.metadata),
        };
      },
    },
    
    /**
     * Move a file to a different location
     */
    moveFile: {
      name: 'moveFile',
      displayName: 'Move File',
      description: 'Move a file to a different location in Dropbox',
      props: {
        fromPath: {
          type: 'SHORT_TEXT',
          displayName: 'From Path',
          description: 'Current path of the file',
          required: true,
        },
        toPath: {
          type: 'SHORT_TEXT',
          displayName: 'To Path',
          description: 'Destination path (including new filename)',
          required: true,
        },
        autorename: {
          type: 'CHECKBOX',
          displayName: 'Auto Rename',
          description: 'Automatically rename if destination exists',
          required: false,
          defaultValue: false,
        },
      },
      async run(context: DropboxContext): Promise<MoveFileResult> {
        const auth = context.auth;
        if (!auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Dropbox access first.');
        }
        
        const { fromPath, toPath, autorename = false } = context.propsValue;
        
        // Ensure paths start with /
        const from = fromPath.startsWith('/') ? fromPath : `/${fromPath}`;
        const to = toPath.startsWith('/') ? toPath : `/${toPath}`;
        
        const response = await dropboxRequest(
          '/files/move_v2',
          'POST',
          auth.accessToken,
          {
            from_path: from,
            to_path: to,
            autorename,
          }
        );
        
        console.log(`📁 [bit-dropbox] Moved file from ${from} to ${to}`);
        
        return {
          success: true,
          file: toFileMetadata(response.metadata),
          previousPath: from,
          newPath: to,
        };
      },
    },
    
    /**
     * List files and folders in a directory
     */
    listFolder: {
      name: 'listFolder',
      displayName: 'List Folder',
      description: 'List files and folders in a Dropbox directory',
      props: {
        path: {
          type: 'SHORT_TEXT',
          displayName: 'Folder Path',
          description: 'Path to list (use empty string or "/" for root)',
          required: false,
          defaultValue: '',
        },
        recursive: {
          type: 'CHECKBOX',
          displayName: 'Recursive',
          description: 'List contents of subfolders',
          required: false,
          defaultValue: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum number of results',
          required: false,
          defaultValue: 100,
        },
      },
      async run(context: DropboxContext): Promise<ListFilesResult> {
        const auth = context.auth;
        if (!auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Dropbox access first.');
        }
        
        const { path = '', recursive = false, limit = 100 } = context.propsValue;
        
        // Dropbox uses empty string for root, not "/"
        const folderPath = path === '/' ? '' : (path.startsWith('/') ? path : `/${path}`);
        
        const response = await dropboxRequest(
          '/files/list_folder',
          'POST',
          auth.accessToken,
          {
            path: folderPath === '/' ? '' : folderPath,
            recursive,
            limit,
          }
        ) as DropboxListResponse;
        
        const files: FileMetadata[] = [];
        const folders: FolderMetadata[] = [];
        
        for (const entry of response.entries) {
          if (entry['.tag'] === 'folder') {
            folders.push(toFolderMetadata(entry));
          } else {
            files.push(toFileMetadata(entry));
          }
        }
        
        console.log(`📁 [bit-dropbox] Listed ${files.length} files and ${folders.length} folders`);
        
        return {
          success: true,
          files,
          folders,
          nextPageToken: response.has_more ? response.cursor : undefined,
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
      description: 'Triggers when a new file is added to Dropbox',
      type: 'POLLING',
      props: {
        path: {
          type: 'SHORT_TEXT',
          displayName: 'Folder Path',
          description: 'Folder to watch',
          required: false,
        },
      },
      async run(context: DropboxContext) {
        // Polling trigger - would check for new files since last poll
        return { files: [] };
      },
    },
  },
};

export const dropbox = dropboxBit;
export default dropboxBit;
