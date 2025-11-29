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
import { getOrCreateUser } from '@/lib/user-manager';

const prisma = new PrismaClient();

// Google Drive API v3
const drive = google.drive('v3');

/**
 * Get database user ID from Clerk user ID
 */
async function getUserIdFromClerk(clerkUserId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { clerkUserId: clerkUserId },
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
  
  // Use centralized user manager to get/create user with REAL Clerk email
  const user = await getOrCreateUser(clerkUserId);
  console.log('✅ saveConnection: User retrieved:', user.id, user.email);
  
  console.log('💾 saveConnection: Upserting Drive connection for user:', user.id);
  
  await prisma.googleDriveConnection.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      googleEmail: tokens.email,
      googleName: tokens.name || null,
      googlePicture: tokens.picture || null,
      isConnected: true,
      autoUpload: true,
      syncEnabled: true,
      connectedAt: new Date(),
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
  });
  
  // Auto-refresh tokens (OAuth2Client handles this automatically)
  // We'll update our database with new tokens on the next successful API call
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    if (credentials.access_token) {
      await prisma.googleDriveConnection.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token,
          lastSyncAt: new Date(),
        },
      });
      
      oauth2Client.setCredentials(credentials);
    }
  } catch (error) {
    // Token refresh failed - tokens might still be valid, let API calls fail naturally
    console.warn('[GoogleDrive] Token refresh warning:', error);
  }
  
  return oauth2Client;
}

/**
 * Get or create HOLLY root folder in user's Drive
 * Searches for existing folder first, creates if not found
 */
export async function getOrCreateRootFolder(userId: string): Promise<string> {
  const auth = await getAuthenticatedClient(userId);
  
  // Search for existing HOLLY folder
  const searchResponse = await drive.files.list({
    auth,
    q: "name='HOLLY AI' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id)',
    spaces: 'drive',
  });
  
  // Return existing folder if found
  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }
  
  // Create HOLLY folder if not found
  const createResponse = await drive.files.create({
    auth,
    requestBody: {
      name: 'HOLLY AI',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Files created by HOLLY AI assistant',
    },
    fields: 'id',
  });
  
  return createResponse.data.id!;
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
