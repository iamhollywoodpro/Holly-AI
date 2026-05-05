// GitHub OAuth - Initiate Connection
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    
    if (!GITHUB_CLIENT_ID) {
      return NextResponse.json(
        { error: 'GitHub OAuth not configured' },
        { status: 500 }
      );
    }

    // GitHub OAuth scopes we need
    const scopes = [
      'repo',        // Full control of private repositories
      'read:user',   // Read user profile data
      'user:email',  // Access user email addresses
    ].join(' ');

    // Build GitHub OAuth URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`;
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
    githubAuthUrl.searchParams.set('scope', scopes);
    githubAuthUrl.searchParams.set('state', state);
    githubAuthUrl.searchParams.set('allow_signup', 'true');

    return NextResponse.redirect(githubAuthUrl.toString());

  } catch (error: any) {
    console.error('GitHub connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate GitHub connection' },
      { status: 500 }
    );
  }
}
