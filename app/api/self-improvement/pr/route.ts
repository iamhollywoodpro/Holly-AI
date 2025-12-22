import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

/**
 * POST /api/self-improvement/pr
 * Create a pull request for a self-improvement
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
      title,
      description,
      labels
    } = body;

    // Validate required fields
    if (!improvementId || !title || !description) {
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

    // Create the pull request
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body: description,
      head: improvement.branchName,
      base: 'main'
    });

    // Add labels if provided
    if (labels && labels.length > 0) {
      await octokit.issues.addLabels({
        owner,
        repo,
        issue_number: pr.number,
        labels
      });
    }

    // Update the improvement record
    await prisma.selfImprovement.update({
      where: { id: improvementId },
      data: {
        status: 'pr_created',
        prNumber: pr.number,
        prUrl: pr.html_url,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      improvementId,
      prNumber: pr.number,
      prUrl: pr.html_url,
      status: 'pr_created',
      message: 'Pull request created successfully'
    });

  } catch (error) {
    console.error('Error creating pull request:', error);
    return NextResponse.json(
      { error: 'Failed to create pull request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
