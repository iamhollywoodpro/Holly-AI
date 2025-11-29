// Test GitHub Token Validity
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true, email: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: {
        accessToken: true,
        isConnected: true,
        githubUsername: true,
        scopes: true,
        connectedAt: true,
        lastSyncAt: true
      }
    });
    
    if (!connection || !connection.isConnected) {
      return NextResponse.json({ 
        error: 'GitHub not connected',
        hasConnection: !!connection,
        isConnected: connection?.isConnected || false
      }, { status: 400 });
    }
    
    const diagnostics: any = {
      user: {
        email: user.email,
        githubUsername: connection.githubUsername
      },
      connection: {
        isConnected: connection.isConnected,
        hasToken: !!connection.accessToken,
        tokenLength: connection.accessToken?.length || 0,
        scopes: connection.scopes || [],
        connectedAt: connection.connectedAt,
        lastSyncAt: connection.lastSyncAt
      },
      tests: {}
    };
    
    // Test 1: Check GitHub user endpoint
    try {
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      
      diagnostics.tests.user = {
        status: userResponse.status,
        ok: userResponse.ok,
        statusText: userResponse.statusText
      };
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        diagnostics.tests.user.login = userData.login;
        diagnostics.tests.user.id = userData.id;
      } else {
        const errorText = await userResponse.text();
        diagnostics.tests.user.error = errorText;
      }
    } catch (error: any) {
      diagnostics.tests.user = {
        error: error.message,
        type: 'network_error'
      };
    }
    
    // Test 2: Check repos endpoint
    try {
      const reposResponse = await fetch(
        'https://api.github.com/user/repos?type=all&visibility=all&per_page=5',
        {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      
      diagnostics.tests.repos = {
        status: reposResponse.status,
        ok: reposResponse.ok,
        statusText: reposResponse.statusText
      };
      
      if (reposResponse.ok) {
        const reposData = await reposResponse.json();
        diagnostics.tests.repos.count = reposData.length;
        diagnostics.tests.repos.sampleRepos = reposData.slice(0, 3).map((r: any) => ({
          name: r.name,
          private: r.private,
          updated: r.updated_at
        }));
      } else {
        const errorText = await reposResponse.text();
        diagnostics.tests.repos.error = errorText;
      }
    } catch (error: any) {
      diagnostics.tests.repos = {
        error: error.message,
        type: 'network_error'
      };
    }
    
    // Test 3: Check rate limit
    try {
      const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      
      if (rateLimitResponse.ok) {
        const rateLimitData = await rateLimitResponse.json();
        diagnostics.tests.rateLimit = {
          core: {
            limit: rateLimitData.resources.core.limit,
            remaining: rateLimitData.resources.core.remaining,
            reset: new Date(rateLimitData.resources.core.reset * 1000).toISOString()
          }
        };
      }
    } catch (error: any) {
      diagnostics.tests.rateLimit = {
        error: error.message
      };
    }
    
    // Determine overall status
    diagnostics.diagnosis = {
      tokenValid: diagnostics.tests.user?.ok === true,
      canAccessRepos: diagnostics.tests.repos?.ok === true,
      rateLimitOk: (diagnostics.tests.rateLimit?.core?.remaining || 0) > 10
    };
    
    if (!diagnostics.diagnosis.tokenValid) {
      diagnostics.diagnosis.recommendation = '❌ GitHub token is invalid or expired. Please reconnect your GitHub account.';
    } else if (!diagnostics.diagnosis.canAccessRepos) {
      diagnostics.diagnosis.recommendation = '⚠️ Token is valid but cannot access repos. Check token scopes (needs "repo" permission).';
    } else if (!diagnostics.diagnosis.rateLimitOk) {
      diagnostics.diagnosis.recommendation = '⚠️ GitHub API rate limit exceeded. Wait until reset time.';
    } else {
      diagnostics.diagnosis.recommendation = '✅ Everything looks good! Repos should sync properly.';
    }
    
    return NextResponse.json(diagnostics, { status: 200 });
    
  } catch (error: any) {
    console.error('[GitHub Token Test] Error:', error);
    
    return NextResponse.json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
