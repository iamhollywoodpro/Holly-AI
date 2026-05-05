/**
 * POST /api/google-drive/share
 * Creates a shareable "anyone with link can view" permission on a Drive file
 * and returns both the webViewLink and a direct download link.
 *
 * Delegates to drive-service for OAuth2 / token refresh, then calls
 * the Drive permissions API directly.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { google } from 'googleapis';

export const runtime = 'nodejs';

async function getAuthenticatedClient(userId: string) {
  const connection = await prisma.googleDriveConnection.findUnique({
    where: { userId },
  });

  if (!connection || !connection.isConnected) {
    throw new Error('Google Drive not connected');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
  });

  // Auto-refresh and persist new access token
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.access_token) {
      await prisma.googleDriveConnection.update({
        where: { userId },
        data: { accessToken: credentials.access_token, lastSyncAt: new Date() },
      });
      oauth2Client.setCredentials(credentials);
    }
  } catch {
    // Continue — existing token may still be valid
  }

  return oauth2Client;
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve DB user ID
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { fileId, fileName } = await req.json();
    if (!fileId) {
      return NextResponse.json({ success: false, error: 'fileId is required' }, { status: 400 });
    }

    const authClient = await getAuthenticatedClient(user.id);
    const drive = google.drive({ version: 'v3', auth: authClient });

    // Grant "anyone with link" read permission
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Fetch the updated file to get the canonical webViewLink
    const fileData = await drive.files.get({
      fileId,
      fields: 'id, name, webViewLink, webContentLink',
    });

    const resolvedName = fileData.data.name || fileName || fileId;
    const shareLink    = fileData.data.webViewLink  || `https://drive.google.com/file/d/${fileId}/view`;
    const downloadLink = fileData.data.webContentLink || `https://drive.google.com/uc?export=download&id=${fileId}`;

    return NextResponse.json({
      success: true,
      fileId,
      fileName: resolvedName,
      shareLink,
      downloadLink,
      permissions: 'anyone_with_link',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const notConnected = error.message?.includes('not connected');
    console.error('[DriveShare]', error.message);
    return NextResponse.json(
      { success: false, error: notConnected ? 'Google Drive not connected' : error.message },
      { status: notConnected ? 403 : 500 },
    );
  }
}
