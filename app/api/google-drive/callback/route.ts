// Google Drive OAuth Callback Handler
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { exchangeCodeForTokens, saveConnection } from '@/lib/google-drive/drive-service';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 OAuth Callback: Request received');
    
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId from OAuth flow
    const error = searchParams.get('error');
    
    console.log('📝 OAuth Callback: Params:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error 
    });
    
    // Handle OAuth error
    if (error) {
      console.error('❌ OAuth Callback: Google returned error:', error);
      return NextResponse.redirect(
        new URL('/settings/integrations?error=oauth_denied', req.url)
      );
    }
    
    // Validate code
    if (!code) {
      console.error('❌ OAuth Callback: No authorization code received');
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_code', req.url)
      );
    }
    
    // Get current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.error('❌ OAuth Callback: User not authenticated');
      return NextResponse.redirect(
        new URL('/sign-in?error=unauthenticated', req.url)
      );
    }
    
    console.log('✅ OAuth Callback: User authenticated:', userId);
    
    // Exchange code for tokens
    console.log('🔄 OAuth Callback: Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, userId);
    
    console.log('✅ OAuth Callback: Tokens received:', {
      email: tokens.email,
      hasAccessToken: !!tokens.accessToken,
      hasRefreshToken: !!tokens.refreshToken,
    });
    
    // Save connection to database
    console.log('💾 OAuth Callback: Saving connection to database...');
    await saveConnection(userId, tokens);
    
    console.log('✅ OAuth Callback: Connection saved successfully!');
    
    // Redirect to integrations page with success message
    return NextResponse.redirect(
      new URL('/settings/integrations?success=drive_connected', req.url)
    );
    
  } catch (error: any) {
    console.error('❌ OAuth Callback: Error processing callback:', error);
    
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=${encodeURIComponent(error.message || 'connection_failed')}`, req.url)
    );
  }
}
