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

import { drive as driveApi, drive_v3 } from '@googleapis/drive';
import { OAuth2Client } from 'google-auth-library';
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

const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

/**
 * Create OAuth2 client with access token
 */
function createOAuth2Client(accessToken: string): OAuth2Client {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

/**
 * Get Drive API client
 */
function getDriveClient(accessToken: string): drive_v3.Drive {
  const oauth2Client = createOAuth2Client(accessToken);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return driveApi({ version: 'v3', auth: oauth2Client as any });
}

/**
 * Convert Google Drive file to common FileMetadata
 */
function toFileMetadata(file: drive_v3.Schema$File): FileMetadata {
  return {
    id: file.id || '',
    name: file.name || '',
    mimeType: file.mimeType || 'application/octet-stream',
    size: parseInt(file.size || '0', 10),
    createdAt: file.createdTime || new Date().toISOString(),
    modifiedAt: file.modifiedTime || new Date().toISOString(),
    parentId: file.parents?.[0],
    webViewLink: file.webViewLink || undefined,
    downloadUrl: file.webContentLink || undefined,
    isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    shared: file.shared || false,
  };
}

/**
 * Convert Google Drive folder to common FolderMetadata
 */
function toFolderMetadata(file: drive_v3.Schema$File): FolderMetadata {
  return {
    id: file.id || '',
    name: file.name || '',
    parentId: file.parents?.[0],
    createdAt: file.createdTime || new Date().toISOString(),
    webViewLink: file.webViewLink || undefined,
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
        
        const drive = getDriveClient(context.auth.accessToken);
        const { fileName, content, mimeType, folderId } = context.propsValue;
        
        // Prepare file metadata
        const fileMetadata: drive_v3.Schema$File = {
          name: fileName,
          parents: folderId ? [folderId] : undefined,
        };
        
        // Determine if content is base64
        let mediaBody: string | Buffer = content;
        if (typeof content === 'string' && content.match(/^[A-Za-z0-9+/=]+$/)) {
          try {
            mediaBody = Buffer.from(content, 'base64');
          } catch {
            mediaBody = content;
          }
        }
        
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: {
            mimeType: mimeType || 'application/octet-stream',
            body: require('stream').Readable.from([mediaBody]),
          },
          fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink',
        });
        
        console.log(`📁 [bit-google-drive] Uploaded file: ${fileName} (ID: ${response.data.id})`);
        
        return {
          success: true,
          file: toFileMetadata(response.data),
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
        
        const drive = getDriveClient(context.auth.accessToken);
        const { folderName, parentFolderId } = context.propsValue;
        
        const fileMetadata: drive_v3.Schema$File = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentFolderId ? [parentFolderId] : undefined,
        };
        
        const response = await drive.files.create({
          requestBody: fileMetadata,
          fields: 'id, name, createdTime, parents, webViewLink',
        });
        
        console.log(`📁 [bit-google-drive] Created folder: ${folderName} (ID: ${response.data.id})`);
        
        return {
          success: true,
          folder: toFolderMetadata(response.data),
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
        
        const drive = getDriveClient(context.auth.accessToken);
        const { fileId, destinationFolderId, newName } = context.propsValue;
        
        // Get current file to find its parent
        const currentFile = await drive.files.get({
          fileId,
          fields: 'parents',
        });
        
        const previousParent = currentFile.data.parents?.[0];
        
        // Update the file: remove from old parent, add to new parent
        const response = await drive.files.update({
          fileId,
          addParents: destinationFolderId,
          removeParents: previousParent,
          requestBody: newName ? { name: newName } : undefined,
          fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink',
        });
        
        console.log(`📁 [bit-google-drive] Moved file ${fileId} to folder ${destinationFolderId}`);
        
        return {
          success: true,
          file: toFileMetadata(response.data),
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
        
        const drive = getDriveClient(context.auth.accessToken);
        const { folderId, query, mimeType, limit = 100, pageToken } = context.propsValue;
        
        // Build query
        const queryParts: string[] = [];
        if (folderId) {
          queryParts.push(`'${folderId}' in parents`);
        }
        if (query) {
          queryParts.push(query);
        }
        if (mimeType) {
          queryParts.push(`mimeType = '${mimeType}'`);
        }
        queryParts.push('trashed = false');
        
        const response = await drive.files.list({
          q: queryParts.join(' and '),
          pageSize: limit,
          pageToken: pageToken || undefined,
          fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, webContentLink, shared)',
        });
        
        const files: FileMetadata[] = [];
        const folders: FolderMetadata[] = [];
        
        for (const file of response.data.files || []) {
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
          nextPageToken: response.data.nextPageToken || undefined,
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
        
        const drive = getDriveClient(context.auth.accessToken);
        const { fileId, email, role = 'reader', type = 'user', notifyUser = true, message } = context.propsValue;
        
        const permission: drive_v3.Schema$Permission = {
          role,
          type: email ? type : 'anyone',
          emailAddress: email || undefined,
        };
        
        const response = await drive.permissions.create({
          fileId,
          requestBody: permission,
          sendNotificationEmail: notifyUser && !!email,
          emailMessage: message || undefined,
          fields: 'id',
        });
        
        // Get the updated file to get the share link
        const fileResponse = await drive.files.get({
          fileId,
          fields: 'webViewLink',
        });
        
        console.log(`📁 [bit-google-drive] Shared file ${fileId} with ${email || 'anyone'} as ${role}`);
        
        return {
          success: true,
          permissionId: response.data.id || undefined,
          shareLink: fileResponse.data.webViewLink || undefined,
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
