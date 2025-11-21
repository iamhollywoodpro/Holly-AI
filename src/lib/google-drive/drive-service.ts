/**
 * HOLLY Google Drive Service
 * 
 * Complete Google Drive integration:
 * - OAuth2 authentication
 * - File upload/download
 * - Folder management
 * - File search and listing
 * - Permission management
 * - Token refresh handling
 * 
 * @author HOLLY AI System
 */

import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

const prisma = new PrismaClient();

// Google Drive API v3
const drive = google.drive('v3');

/**
 * Get database user ID from Clerk user ID
 */
async function getUserIdFromClerk(clerkUserId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  
  if (!user) {
    throw new Error('User not found in database');
  }
  
  return user.id;
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Get authorization URL for OAuth2 flow
 */
export function getAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass userId to identify user after redirect
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  userId: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  email: string;
  name?: string;
  picture?: string;
}> {
  const oauth2Client = createOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }
  
  // Get user info
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
    email: data.email!,
    name: data.name,
    picture: data.picture,
  };
}

/**
 * Save Google Drive connection to database
 */
export async function saveConnection(
  clerkUserId: string,
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    email: string;
    name?: string;
    picture?: string;
  }
): Promise<void> {
  console.log('💾 saveConnection: Starting...', { clerkUserId, email: tokens.email });
  
  // Find user by Clerk ID first
  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });
  
  if (!user) {
    console.log('📝 saveConnection: User not found by clerkId, checking email...', clerkUserId);
    
    // Check if user exists by email
    user = await prisma.user.findUnique({
      where: { email: tokens.email },
    });
    
    if (user) {
      console.log('🔄 saveConnection: User exists with different clerkId, updating...', user.id);
      // Update the clerkId for this user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          clerkId: clerkUserId,
          name: tokens.name || user.name,
          avatarUrl: tokens.picture || user.avatarUrl,
        },
      });
      console.log('✅ saveConnection: User clerkId updated:', user.id);
    } else {
      console.log('📝 saveConnection: Creating new user...', clerkUserId);
      // Create new user
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: tokens.email,
          name: tokens.name,
          avatarUrl: tokens.picture,
        },
      });
      console.log('✅ saveConnection: User created:', user.id);
    }
  }
  
  console.log('💾 saveConnection: Upserting Drive connection for user:', user.id);
  
  await prisma.googleDriveConnection.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: new Date(tokens.expiryDate),
      googleEmail: tokens.email,
      googleName: tokens.name || null,
      googlePicture: tokens.picture || null,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      isConnected: true,
      autoUpload: true,
      syncEnabled: true,
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry: new Date(tokens.expiryDate),
      googleEmail: tokens.email,
      googleName: tokens.name || null,
      googlePicture: tokens.picture || null,
      isConnected: true,
      lastSyncAt: new Date(),
    },
  });
  
  console.log('✅ saveConnection: Connection saved successfully!');
}

/**
 * Get OAuth2 client for user (with auto token refresh)
 */
async function getAuthenticatedClient(userId: string): Promise<OAuth2Client> {
  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId },
  });
  
  if (!connection || !connection.isConnected) {
    throw new Error('Google Drive not connected');
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiry.getTime(),
  });
  
  // Auto-refresh if expired
  if (Date.now() >= connection.tokenExpiry.getTime() - 60000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (credentials.access_token) {
      await prisma.googleDriveConnection.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token,
          tokenExpiry: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
        },
      });
      
      oauth2Client.setCredentials(credentials);
    }
  }
  
  return oauth2Client;
}

/**
 * Get or create HOLLY root folder in user's Drive
 */
export async function getOrCreateRootFolder(userId: string): Promise<string> {
  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId },
  });
  
  if (connection?.rootFolderId) {
    return connection.rootFolderId;
  }
  
  const auth = await getAuthenticatedClient(userId);
  
  // Create HOLLY folder
  const response = await drive.files.create({
    auth,
    requestBody: {
      name: 'HOLLY AI',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Files created by HOLLY AI assistant',
    },
    fields: 'id',
  });
  
  const folderId = response.data.id!;
  
  // Save folder ID
  await prisma.googleDriveConnection.update({
    where: { userId },
    data: { rootFolderId: folderId },
  });
  
  return folderId;
}

/**
 * Upload file to Google Drive
 */
export async function uploadFile(
  userId: string,
  options: {
    fileName: string;
    mimeType: string;
    fileBuffer: Buffer;
    folderId?: string;
    description?: string;
  }
): Promise<{
  fileId: string;
  webViewLink: string;
  webContentLink: string;
}> {
  const auth = await getAuthenticatedClient(userId);
  
  // Get or create root folder
  const rootFolderId = await getOrCreateRootFolder(userId);
  const parentId = options.folderId || rootFolderId;
  
  // Upload file
  const response = await drive.files.create({
    auth,
    requestBody: {
      name: options.fileName,
      mimeType: options.mimeType,
      parents: [parentId],
      description: options.description,
    },
    media: {
      mimeType: options.mimeType,
      body: require('stream').Readable.from(options.fileBuffer),
    },
    fields: 'id, webViewLink, webContentLink',
  });
  
  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink!,
    webContentLink: response.data.webContentLink!,
  };
}

/**
 * Download file from Google Drive
 */
export async function downloadFile(
  userId: string,
  fileId: string
): Promise<Buffer> {
  const auth = await getAuthenticatedClient(userId);
  
  const response = await drive.files.get(
    {
      auth,
      fileId,
      alt: 'media',
    },
    { responseType: 'arraybuffer' }
  );
  
  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * List files in a folder
 */
export async function listFiles(
  userId: string,
  folderId?: string
): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
}>> {
  const auth = await getAuthenticatedClient(userId);
  
  const rootFolderId = folderId || await getOrCreateRootFolder(userId);
  
  const response = await drive.files.list({
    auth,
    q: `'${rootFolderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, thumbnailLink)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
  });
  
  return response.data.files as any[];
}

/**
 * Create folder
 */
export async function createFolder(
  userId: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  
  const rootFolderId = parentFolderId || await getOrCreateRootFolder(userId);
  
  const response = await drive.files.create({
    auth,
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id',
  });
  
  return response.data.id!;
}

/**
 * Delete file
 */
export async function deleteFile(
  userId: string,
  fileId: string
): Promise<void> {
  const auth = await getAuthenticatedClient(userId);
  
  await drive.files.delete({
    auth,
    fileId,
  });
}

/**
 * Search files
 */
export async function searchFiles(
  userId: string,
  query: string
): Promise<Array<any>> {
  const auth = await getAuthenticatedClient(userId);
  
  const rootFolderId = await getOrCreateRootFolder(userId);
  
  const response = await drive.files.list({
    auth,
    q: `'${rootFolderId}' in parents and trashed=false and name contains '${query}'`,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)',
    orderBy: 'modifiedTime desc',
    pageSize: 50,
  });
  
  return response.data.files as any[];
}

/**
 * Get Drive quota info
 */
export async function getQuotaInfo(userId: string): Promise<{
  usage: number;
  limit: number;
  usageInDrive: number;
  usageInDriveTrash: number;
}> {
  const auth = await getAuthenticatedClient(userId);
  
  const response = await drive.about.get({
    auth,
    fields: 'storageQuota',
  });
  
  const quota = response.data.storageQuota!;
  
  return {
    usage: parseInt(quota.usage || '0'),
    limit: parseInt(quota.limit || '0'),
    usageInDrive: parseInt(quota.usageInDrive || '0'),
    usageInDriveTrash: parseInt(quota.usageInDriveTrash || '0'),
  };
}

/**
 * Disconnect Google Drive
 */
export async function disconnectDrive(userId: string): Promise<void> {
  await prisma.googleDriveConnection.update({
    where: { userId },
    data: {
      isConnected: false,
      lastSyncAt: new Date(),
    },
  });
}

/**
 * Check if user has Google Drive connected
 */
export async function isConnected(userId: string): Promise<boolean> {
  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId },
  });
  
  return connection?.isConnected || false;
}

export default {
  getAuthUrl,
  exchangeCodeForTokens,
  saveConnection,
  uploadFile,
  downloadFile,
  listFiles,
  createFolder,
  deleteFile,
  searchFiles,
  getQuotaInfo,
  disconnectDrive,
  isConnected,
};
