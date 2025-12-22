import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import { performSafetyCheck } from '@/lib/self-improvement/safety-guardrails';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

/**
 * POST /api/self-improvement/code
 * Generate and commit code for a self-improvement
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      improvementId,
      codeChanges,
      commitMessage
    } = body;

    // Validate required fields
    if (!improvementId || !codeChanges || !commitMessage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the improvement record
    const improvement = await prisma.selfImprovement.findUnique({
      where: { id: improvementId }
    });

    if (!improvement) {
      return NextResponse.json(
        { error: 'Improvement not found' },
        { status: 404 }
      );
    }

    if (improvement.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Safety guardrails: Comprehensive safety check
    const filesChanged = Object.keys(codeChanges);
    const safetyCheck = performSafetyCheck(
      filesChanged,
      codeChanges,
      improvement.riskLevel as 'low' | 'medium' | 'high'
    );
    
    if (!safetyCheck.allowed) {
      return NextResponse.json(
        { error: safetyCheck.reason, warnings: safetyCheck.warnings },
        { status: 403 }
      );
    }

    // Initialize GitHub client
    const githubToken = process.env.HOLLY_GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured' },
        { status: 500 }
      );
    }

    const octokit = new Octokit({ auth: githubToken });
    const owner = process.env.HOLLY_GITHUB_OWNER || 'iamhollywoodpro';
    const repo = process.env.HOLLY_GITHUB_REPO || 'Holly-AI';

    // Get the default branch reference
    const { data: defaultBranch } = await octokit.repos.getBranch({
      owner,
      repo,
      branch: 'main'
    });

    // Create a new branch
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${improvement.branchName}`,
      sha: defaultBranch.commit.sha
    });

    // Commit files
    const filesCommitted: string[] = [];
    for (const [filePath, content] of Object.entries(codeChanges)) {
      try {
        // Get the file SHA if it exists
        let fileSha: string | undefined;
        try {
          const { data: existingFile } = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
            ref: improvement.branchName
          });
          if ('sha' in existingFile) {
            fileSha = existingFile.sha;
          }
        } catch (error) {
          // File doesn't exist, that's okay
        }

        // Create or update the file
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message: commitMessage,
          content: Buffer.from(content as string).toString('base64'),
          branch: improvement.branchName,
          ...(fileSha && { sha: fileSha })
        });

        filesCommitted.push(filePath);
      } catch (error) {
        console.error(`Error committing file ${filePath}:`, error);
      }
    }

    // Update the improvement record
    await prisma.selfImprovement.update({
      where: { id: improvementId },
      data: {
        status: 'coding',
        codeChanges,
        filesChanged: filesCommitted,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      improvementId,
      filesCommitted: filesCommitted.length,
      branchName: improvement.branchName,
      message: 'Code committed successfully'
    });

  } catch (error) {
    console.error('Error committing code:', error);
    return NextResponse.json(
      { error: 'Failed to commit code', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
