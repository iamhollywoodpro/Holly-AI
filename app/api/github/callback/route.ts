// GitHub OAuth - Handle Callback
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=github_auth_failed&message=${error}`, req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/?error=missing_oauth_params', req.url)
      );
    }

    // Decode state to get userId
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));

    if (!userId) {
      return NextResponse.redirect(
        new URL('/?error=invalid_state', req.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('GitHub token error:', tokenData);
      return NextResponse.redirect(
        new URL('/?error=token_exchange_failed', req.url)
      );
    }

    const { access_token, scope } = tokenData;

    // Fetch GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const githubUser = await userResponse.json();

    if (!githubUser.id) {
      return NextResponse.redirect(
        new URL('/?error=failed_to_fetch_user', req.url)
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL('/?error=user_not_found', req.url)
      );
    }

    // Save GitHub connection to database
    const connection = await prisma.gitHubConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: access_token,
        scopes: scope?.split(',') || [],
        githubId: githubUser.id.toString(),
        githubUsername: githubUser.login,
        githubEmail: githubUser.email,
        githubName: githubUser.name,
        githubAvatar: githubUser.avatar_url,
        githubBio: githubUser.bio,
        publicRepos: githubUser.public_repos || 0,
        privateRepos: githubUser.total_private_repos || 0,
        followers: githubUser.followers || 0,
        following: githubUser.following || 0,
        isConnected: true,
        lastSyncAt: new Date(),
      },
      update: {
        accessToken: access_token,
        scopes: scope?.split(',') || [],
        githubId: githubUser.id.toString(),
        githubUsername: githubUser.login,
        githubEmail: githubUser.email,
        githubName: githubUser.name,
        githubAvatar: githubUser.avatar_url,
        githubBio: githubUser.bio,
        publicRepos: githubUser.public_repos || 0,
        privateRepos: githubUser.total_private_repos || 0,
        followers: githubUser.followers || 0,
        following: githubUser.following || 0,
        isConnected: true,
        lastSyncAt: new Date(),
      },
    });

    // AUTO-SYNC: Fetch and save repositories immediately after connection
    try {
      console.log('[GitHub] Auto-syncing repositories for user:', user.id);
      
      // Fetch repos from GitHub API
      const reposResponse = await fetch(
        'https://api.github.com/user/repos?type=all&visibility=all&per_page=100&sort=updated&direction=desc',
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      
      if (reposResponse.ok) {
        const githubRepos = await reposResponse.json();
        console.log(`[GitHub] Found ${githubRepos.length} repositories, syncing...`);
        
        // Upsert each repo to database
        for (const repo of githubRepos) {
          await prisma.gitHubRepository.upsert({
            where: {
              userId_githubId: {
                userId: user.id,
                githubId: repo.id.toString(),
              },
            },
            create: {
              userId: user.id,
              githubId: repo.id.toString(),
              name: repo.name,
              fullName: repo.full_name,
              owner: repo.owner.login,
              description: repo.description,
              url: repo.url,
              htmlUrl: repo.html_url,
              cloneUrl: repo.clone_url,
              sshUrl: repo.ssh_url,
              language: repo.language,
              stars: repo.stargazers_count || 0,
              forks: repo.forks_count || 0,
              openIssues: repo.open_issues_count || 0,
              watchers: repo.watchers_count || 0,
              size: repo.size || 0,
              isPrivate: repo.private || false,
              isFork: repo.fork || false,
              isArchived: repo.archived || false,
              defaultBranch: repo.default_branch || 'main',
              topics: repo.topics || [],
              githubCreatedAt: repo.created_at ? new Date(repo.created_at) : null,
              githubUpdatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
              githubPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
              lastSyncAt: new Date(),
            },
            update: {
              name: repo.name,
              fullName: repo.full_name,
              owner: repo.owner.login,
              description: repo.description,
              language: repo.language,
              stars: repo.stargazers_count || 0,
              forks: repo.forks_count || 0,
              openIssues: repo.open_issues_count || 0,
              watchers: repo.watchers_count || 0,
              size: repo.size || 0,
              isPrivate: repo.private || false,
              isFork: repo.fork || false,
              isArchived: repo.archived || false,
              defaultBranch: repo.default_branch || 'main',
              topics: repo.topics || [],
              githubUpdatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
              githubPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
              lastSyncAt: new Date(),
            },
          });
        }
        
        console.log(`[GitHub] Successfully synced ${githubRepos.length} repositories`);
      } else {
        console.warn('[GitHub] Failed to auto-sync repos:', reposResponse.statusText);
      }
    } catch (syncError) {
      // Don't fail the connection if sync fails - user can manually sync later
      console.error('[GitHub] Auto-sync error:', syncError);
    }

    // Redirect back to app with success message
    return NextResponse.redirect(
      new URL('/?success=github_connected', req.url)
    );

  } catch (error: any) {
    console.error('GitHub callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=github_callback_failed', req.url)
    );
  }
}
