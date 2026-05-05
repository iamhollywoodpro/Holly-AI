// Manual GitHub Repository Sync
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get GitHub connection with access token
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: {
        accessToken: true,
        isConnected: true,
      }
    });
    
    if (!connection || !connection.isConnected) {
      return NextResponse.json({ 
        error: 'GitHub not connected',
        message: 'Please connect your GitHub account first'
      }, { status: 400 });
    }
    
    console.log('[GitHub Sync] Starting manual sync for user:', user.id);
    
    // Fetch repos from GitHub API
    // Note: Cannot use 'type' and 'visibility' together. Using visibility + affiliation instead.
    const reposResponse = await fetch(
      'https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&per_page=100&sort=updated&direction=desc',
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    
    if (!reposResponse.ok) {
      const errorText = await reposResponse.text();
      console.error('[GitHub Sync] API Error:', reposResponse.status, errorText);
      
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { raw: errorText };
      }
      
      return NextResponse.json({
        error: 'GitHub API error',
        githubStatus: reposResponse.status,
        githubMessage: parsedError.message || errorText,
        details: parsedError,
        recommendation: reposResponse.status === 401 
          ? '❌ Token is invalid or expired - Please reconnect GitHub'
          : reposResponse.status === 403
          ? '⚠️ Rate limit exceeded or insufficient permissions - Check token scopes'
          : '❌ GitHub API returned an error - Check console logs'
      }, { status: 422 });
    }
    
    const githubRepos = await reposResponse.json();
    console.log(`[GitHub Sync] Found ${githubRepos.length} repositories`);
    
    let syncedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    // Sync each repo to database
    for (const repo of githubRepos) {
      try {
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
        
        syncedCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(`${repo.name}: ${error.message}`);
        console.error(`[GitHub Sync] Failed to sync ${repo.name}:`, error.message);
      }
    }
    
    // Update last sync time on connection
    await prisma.gitHubConnection.update({
      where: { userId: user.id },
      data: { lastSyncAt: new Date() }
    });
    
    console.log(`[GitHub Sync] Completed: ${syncedCount} synced, ${failedCount} failed`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} repositories`,
      synced: syncedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[GitHub Sync] Fatal error:', error);
    
    return NextResponse.json({
      error: 'Sync failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
