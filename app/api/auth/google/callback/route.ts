// Google OAuth2 Callback
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { exchangeCodeForTokens, saveConnection } from '@/lib/google-drive/drive-service';
import { logSuccess, logError } from '@/lib/logging/work-log-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId from authorization URL
    const error = searchParams.get('error');
    
    if (error) {
      console.error('OAuth error:', error);
      
      await logError(userId, `Google Drive connection failed: ${error}`, {
        metadata: { error },
      });
      
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, req.url)
      );
    }
    
    if (!code) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_code', req.url)
      );
    }
    
    // Verify state matches userId (security check)
    if (state !== userId) {
      console.error('State mismatch:', { state, userId });
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_state', req.url)
      );
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, userId);
    
    // Save connection
    await saveConnection(userId, tokens);
    
    // Log success
    await logSuccess(userId, `Google Drive connected: ${tokens.email}`, {
      metadata: {
        email: tokens.email,
        name: tokens.name,
      },
    });
    
    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/settings/integrations?success=drive_connected', req.url)
    );
    
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    
    const { userId } = await auth();
    if (userId) {
      await logError(userId, `Google Drive connection failed: ${error.message}`, {
        metadata: { error: error.message },
      });
    }
    
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }
}
