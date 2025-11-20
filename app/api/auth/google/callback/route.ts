// Google OAuth2 Callback - With User Check
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { exchangeCodeForTokens, saveConnection } from '@/lib/google-drive/drive-service';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    console.log('[Google Callback] Starting OAuth callback...');
    
    const { userId } = await auth();
    console.log('[Google Callback] User ID:', userId);
    
    if (!userId) {
      console.log('[Google Callback] No user ID, redirecting to sign-in');
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    console.log('[Google Callback] Params:', { 
      hasCode: !!code, 
      state, 
      error 
    });
    
    if (error) {
      console.error('[Google Callback] OAuth error from Google:', error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, req.url)
      );
    }
    
    if (!code) {
      console.error('[Google Callback] No authorization code received');
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_code', req.url)
      );
    }
    
    // Verify state matches userId (security check)
    if (state !== userId) {
      console.error('[Google Callback] State mismatch:', { state, userId });
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_state', req.url)
      );
    }
    
    // ✅ ENSURE USER EXISTS IN DATABASE FIRST
    console.log('[Google Callback] Checking if user exists in database...');
    try {
      let user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        console.log('[Google Callback] User not found, creating from Clerk data...');
        
        // Get user data from Clerk
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        
        // Create user in our database
        user = await prisma.user.create({
          data: {
            id: userId,
            clerkId: userId,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || null,
          }
        });
        
        console.log('[Google Callback] User created successfully:', user.email);
      } else {
        console.log('[Google Callback] User found:', user.email);
      }
    } catch (userError: any) {
      console.error('[Google Callback] User check/creation failed:', userError);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=user_setup_failed: ${encodeURIComponent(userError.message)}`, req.url)
      );
    }
    
    console.log('[Google Callback] Exchanging code for tokens...');
    
    // Exchange code for tokens
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code, userId);
      console.log('[Google Callback] Tokens received:', {
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        email: tokens.email
      });
    } catch (tokenError: any) {
      console.error('[Google Callback] Token exchange failed:', tokenError);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=token_exchange_failed: ${encodeURIComponent(tokenError.message)}`, req.url)
      );
    }
    
    console.log('[Google Callback] Saving connection to database...');
    
    // Save connection
    try {
      await saveConnection(userId, tokens);
      console.log('[Google Callback] Connection saved successfully');
    } catch (dbError: any) {
      console.error('[Google Callback] Database save failed:', dbError);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=database_save_failed: ${encodeURIComponent(dbError.message)}`, req.url)
      );
    }
    
    console.log('[Google Callback] OAuth flow completed successfully!');
    
    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/settings/integrations?success=drive_connected', req.url)
    );
    
  } catch (error: any) {
    console.error('[Google Callback] Unexpected error:', error);
    console.error('[Google Callback] Error stack:', error.stack);
    
    // Return detailed error instead of crash
    return NextResponse.redirect(
      new URL(`/settings/integrations?error=unexpected: ${encodeURIComponent(error.message)}`, req.url)
    );
  } finally {
    await prisma.$disconnect();
  }
}
