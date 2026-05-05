// Initialize Google Drive Connection
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuthUrl } from '@/lib/google-drive/drive-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    // Get OAuth2 authorization URL
    const authUrl = getAuthUrl(userId);
    
    // Redirect browser to Google OAuth page (like GitHub does)
    return NextResponse.redirect(authUrl);
    
  } catch (error: any) {
    console.error('Get auth URL error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get authorization URL' },
      { status: 500 }
    );
  }
}
