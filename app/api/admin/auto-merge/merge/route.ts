import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-auth';
import { Octokit } from '@octokit/rest';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { owner, repo, pullNumber, mergeMethod = 'merge', commitTitle, commitMessage } = await req.json();

    if (!owner || !repo || !pullNumber) {
      return NextResponse.json({ 
        error: 'Missing required fields: owner, repo, pullNumber' 
      }, { status: 400 });
    }

    // Get GitHub token from user's connection
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const githubConnection = await prisma.gitHubConnection.findFirst({
        where: { userId },
        select: { accessToken: true, isActive: true }
      });

      if (!githubConnection || !githubConnection.isActive) {
        return NextResponse.json({ 
          error: 'GitHub not connected. Please connect your GitHub account first.' 
        }, { status: 400 });
      }

      const octokit = new Octokit({ auth: githubConnection.accessToken });

      // Check PR status first
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
      });

      if (pr.state !== 'open') {
        return NextResponse.json({ 
          error: `Pull request is ${pr.state}, cannot merge` 
        }, { status: 400 });
      }

      if (!pr.mergeable) {
        return NextResponse.json({ 
          error: 'Pull request has conflicts and cannot be merged' 
        }, { status: 400 });
      }

      // Perform the merge
      const { data: mergeResult } = await octokit.pulls.merge({
        owner,
        repo,
        pull_number: pullNumber,
        commit_title: commitTitle || `Merge pull request #${pullNumber}`,
        commit_message: commitMessage || pr.title,
        merge_method: mergeMethod as 'merge' | 'squash' | 'rebase'
      });

      // Record merge activity
      await prisma.projectActivity.create({
        data: {
          userId,
          action: 'AUTO_MERGE',
          details: {
            repo: `${owner}/${repo}`,
            pullNumber,
            mergeMethod,
            sha: mergeResult.sha,
            merged: mergeResult.merged
          }
        }
      });

      return NextResponse.json({
        success: true,
        merged: mergeResult.merged,
        sha: mergeResult.sha,
        message: mergeResult.message,
        pullRequest: {
          number: pr.number,
          title: pr.title,
          url: pr.html_url
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Auto-merge error:', error);
    return NextResponse.json({
      error: 'Auto-merge failed',
      details: error.message
    }, { status: 500 });
  }
}
