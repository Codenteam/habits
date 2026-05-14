/**
 * @ha-bits/bit-google-drive
 * 
 * Google Drive integration bit for file hosting and cloud storage.
 * Replaces @ha-bits/bit-file-hosting with Google Drive implementation.
 * 
 * Authentication: OAuth 2.0 (Authorization Code Flow)
 * Required scopes: 
 * - https://www.googleapis.com/auth/drive.file (access files created by app)
 * - https://www.googleapis.com/auth/drive (full drive access - optional)
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
  ShareFileResult,
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
  ShareFileResult,
} from '@ha-bits/bit-file-hosting';

interface GoogleDriveContext {
  auth?: FileHostingAuth;
  propsValue: Record<string, any>;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

async function driveRequest(
  path: string,
  method: string,
  accessToken: string,
  body?: any,
  base = DRIVE_API_BASE
): Promise<any> {
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = { method, headers };
  if (body !== undefined && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google Drive API Error: ${response.status} - ${err}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function toFileMetadata(file: Record<string, any>): FileMetadata {
  return {
    id: file['id'] || '',
    name: file['name'] || '',
    mimeType: file['mimeType'] || 'application/octet-stream',
    size: parseInt(file['size'] || '0', 10),
    createdAt: file['createdTime'] || new Date().toISOString(),
    modifiedAt: file['modifiedTime'] || new Date().toISOString(),
    parentId: file['parents']?.[0],
    webViewLink: file['webViewLink'] || undefined,
    downloadUrl: file['webContentLink'] || undefined,
    isFolder: file['mimeType'] === 'application/vnd.google-apps.folder',
    shared: file['shared'] || false,
  };
}

function toFolderMetadata(file: Record<string, any>): FolderMetadata {
  return {
    id: file['id'] || '',
    name: file['name'] || '',
    parentId: file['parents']?.[0],
    createdAt: file['createdTime'] || new Date().toISOString(),
    webViewLink: file['webViewLink'] || undefined,
  };
}

const googleDriveBit = {
  displayName: 'Google Drive',
  description: 'Google Drive cloud storage integration for file hosting operations',
  logoUrl: 'lucide:HardDrive',
  runtime: 'all',
  
  // This bit replaces the base file-hosting bit
  replaces: '@ha-bits/bit-file-hosting',
  
  // OAuth 2.0 - handled automatically by cortex
  auth: {
    type: 'OAUTH2',
    displayName: 'Google Drive',
    description: 'Connect to Google Drive using OAuth2',
    required: true,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: GOOGLE_DRIVE_SCOPES,
    extraAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
  
  actions: {
    /**
     * Upload a file to Google Drive
     */
    uploadFile: {
      name: 'uploadFile',
      displayName: 'Upload File',
      description: 'Upload a file to Google Drive',
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
          description: 'ID of the parent folder (leave empty for root)',
          required: false,
        },
      },
      async run(context: GoogleDriveContext): Promise<UploadFileResult> {
        if (!context.auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Google Drive access first.');
        }

        const { fileName, content, mimeType = 'application/octet-stream', folderId } = context.propsValue;
        const accessToken = context.auth.accessToken;

        const metadata: Record<string, any> = { name: fileName };
        if (folderId) metadata['parents'] = [folderId];

        // Detect whether content is base64-encoded (used for binary files like PDFs, images).
        // If so, decode to binary; otherwise treat as UTF-8 text.
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(content) && content.length % 4 === 0 && content.length > 0;
        const fileBytes: Uint8Array = isBase64
          ? Uint8Array.from(atob(content), (c) => c.charCodeAt(0))
          : new TextEncoder().encode(content);

        const boundary = '-------habits_drive_boundary';
        const enc = (s: string): Uint8Array => new TextEncoder().encode(s);

        // Concatenate all parts into a single Uint8Array so binary bytes are preserved.
        const parts: Uint8Array[] = [
          enc(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
          enc(JSON.stringify(metadata)),
          enc(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
          fileBytes,
          enc(`\r\n--${boundary}--`),
        ];
        const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
        const multipartBody = new Uint8Array(totalLength);
        let offset = 0;
        for (const part of parts) {
          multipartBody.set(part, offset);
          offset += part.length;
        }

        const fields = 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink';
        const response = await fetch(
          `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=${encodeURIComponent(fields)}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary="${boundary}"`,
              'Content-Length': String(multipartBody.length),
            },
            body: multipartBody,
          }
        );

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Google Drive API Error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        console.log(`📁 [bit-google-drive] Uploaded file: ${fileName} (ID: ${data.id})`);

        return {
          success: true,
          file: toFileMetadata(data),
        };
      },
    },
    
    /**
     * Create a folder in Google Drive
     */
    createFolder: {
      name: 'createFolder',
      displayName: 'Create Folder',
      description: 'Create a new folder in Google Drive',
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
      },
      async run(context: GoogleDriveContext): Promise<CreateFolderResult> {
        if (!context.auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Google Drive access first.');
        }

        const { folderName, parentFolderId } = context.propsValue;
        const metadata: Record<string, any> = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        };
        if (parentFolderId) metadata['parents'] = [parentFolderId];

        const data = await driveRequest(
          `/files?fields=${encodeURIComponent('id,name,createdTime,parents,webViewLink')}`,
          'POST',
          context.auth.accessToken,
          metadata
        );

        console.log(`📁 [bit-google-drive] Created folder: ${folderName} (ID: ${data.id})`);

        return {
          success: true,
          folder: toFolderMetadata(data),
        };
      },
    },
    
    /**
     * Move a file to a different folder
     */
    moveFile: {
      name: 'moveFile',
      displayName: 'Move File',
      description: 'Move a file to a different folder in Google Drive',
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
      async run(context: GoogleDriveContext): Promise<MoveFileResult> {
        if (!context.auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Google Drive access first.');
        }

        const { fileId, destinationFolderId, newName } = context.propsValue;
        const accessToken = context.auth.accessToken;

        // Get current parents
        const current = await driveRequest(`/files/${fileId}?fields=parents`, 'GET', accessToken);
        const previousParent = current.parents?.[0];

        const params = new URLSearchParams({
          addParents: destinationFolderId,
          fields: 'id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink',
        });
        if (previousParent) params.set('removeParents', previousParent);

        const body = newName ? { name: newName } : undefined;
        const data = await driveRequest(`/files/${fileId}?${params.toString()}`, 'PATCH', accessToken, body);

        console.log(`📁 [bit-google-drive] Moved file ${fileId} to folder ${destinationFolderId}`);

        return {
          success: true,
          file: toFileMetadata(data),
          previousPath: previousParent,
          newPath: destinationFolderId,
        };
      },
    },
    
    /**
     * List files in a folder
     */
    listFiles: {
      name: 'listFiles',
      displayName: 'List Files',
      description: 'List files and folders in a Google Drive directory',
      props: {
        folderId: {
          type: 'SHORT_TEXT',
          displayName: 'Folder ID',
          description: 'ID of the folder to list (leave empty for root)',
          required: false,
        },
        query: {
          type: 'SHORT_TEXT',
          displayName: 'Search Query',
          description: 'Optional search query (Google Drive query syntax)',
          required: false,
        },
        mimeType: {
          type: 'SHORT_TEXT',
          displayName: 'MIME Type Filter',
          description: 'Filter by MIME type',
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
          description: 'Token for pagination',
          required: false,
        },
      },
      async run(context: GoogleDriveContext): Promise<ListFilesResult> {
        if (!context.auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Google Drive access first.');
        }

        const { folderId, query, mimeType, limit = 100, pageToken } = context.propsValue;
        const accessToken = context.auth.accessToken;

        const queryParts: string[] = [];
        if (folderId) queryParts.push(`'${folderId}' in parents`);
        if (query) queryParts.push(query);
        if (mimeType) queryParts.push(`mimeType = '${mimeType}'`);
        queryParts.push('trashed = false');

        const params = new URLSearchParams({
          q: queryParts.join(' and '),
          pageSize: String(limit),
          fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webViewLink,webContentLink,shared)',
        });
        if (pageToken) params.set('pageToken', pageToken);

        const data = await driveRequest(`/files?${params.toString()}`, 'GET', accessToken);

        const files: FileMetadata[] = [];
        const folders: FolderMetadata[] = [];

        for (const file of data.files || []) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            folders.push(toFolderMetadata(file));
          } else {
            files.push(toFileMetadata(file));
          }
        }

        console.log(`📁 [bit-google-drive] Listed ${files.length} files and ${folders.length} folders`);

        return {
          success: true,
          files,
          folders,
          nextPageToken: data.nextPageToken || undefined,
          totalCount: files.length + folders.length,
        };
      },
    },
    
    /**
     * Share a file with others
     */
    shareFile: {
      name: 'shareFile',
      displayName: 'Share File',
      description: 'Share a file with specific users or make it public',
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
          description: 'Email address to share with (leave empty for public link)',
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
              { label: 'Viewer', value: 'reader' },
              { label: 'Commenter', value: 'commenter' },
              { label: 'Editor', value: 'writer' },
            ],
          },
        },
        type: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Share Type',
          description: 'Who to share with',
          required: false,
          defaultValue: 'user',
          options: {
            options: [
              { label: 'User', value: 'user' },
              { label: 'Group', value: 'group' },
              { label: 'Domain', value: 'domain' },
              { label: 'Anyone with link', value: 'anyone' },
            ],
          },
        },
        notifyUser: {
          type: 'CHECKBOX',
          displayName: 'Send Notification',
          description: 'Send email notification to the user',
          required: false,
          defaultValue: true,
        },
        message: {
          type: 'LONG_TEXT',
          displayName: 'Message',
          description: 'Optional message to include in notification',
          required: false,
        },
      },
      async run(context: GoogleDriveContext): Promise<ShareFileResult> {
        if (!context.auth?.accessToken) {
          throw new Error('No OAuth token. Please authorize Google Drive access first.');
        }

        const { fileId, email, role = 'reader', type = 'user', notifyUser = true, message } = context.propsValue;
        const accessToken = context.auth.accessToken;

        const permission: Record<string, any> = {
          role,
          type: email ? type : 'anyone',
        };
        if (email) permission['emailAddress'] = email;

        const permParams = new URLSearchParams({
          sendNotificationEmail: String(notifyUser && !!email),
          fields: 'id',
        });
        if (message) permParams.set('emailMessage', message);

        const permData = await driveRequest(
          `/files/${fileId}/permissions?${permParams.toString()}`,
          'POST',
          accessToken,
          permission
        );

        // Get the share link
        const fileData = await driveRequest(`/files/${fileId}?fields=webViewLink`, 'GET', accessToken);

        console.log(`📁 [bit-google-drive] Shared file ${fileId} with ${email || 'anyone'} as ${role}`);

        return {
          success: true,
          permissionId: permData.id || undefined,
          shareLink: fileData.webViewLink || undefined,
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
      description: 'Triggers when a new file is added to Google Drive',
      type: 'POLLING',
      props: {
        folderId: {
          type: 'SHORT_TEXT',
          displayName: 'Folder ID',
          description: 'Folder to watch (leave empty for all)',
          required: false,
        },
      },
      async run(context: GoogleDriveContext) {
        // Polling trigger - would check for new files since last poll
        return { files: [] };
      },
    },
  },
};

export const googleDrive = googleDriveBit;
export default googleDriveBit;
