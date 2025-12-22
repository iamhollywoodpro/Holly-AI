import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

/**
 * GET /api/self-improvement/status/[id]
 * Get the status of a self-improvement
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get the improvement record
    const improvement = await prisma.selfImprovement.findUnique({
      where: { id }
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

    // If there's a PR, check its status on GitHub
    let prStatus = null;
    if (improvement.prNumber) {
      try {
        const githubToken = process.env.GITHUB_TOKEN;
        if (githubToken) {
          const octokit = new Octokit({ auth: githubToken });
          const owner = process.env.GITHUB_OWNER || 'iamhollywoodpro';
          const repo = process.env.GITHUB_REPO || 'Holly-AI';

          const { data: pr } = await octokit.pulls.get({
            owner,
            repo,
            pull_number: improvement.prNumber
          });

          prStatus = {
            state: pr.state,
            merged: pr.merged,
            mergeable: pr.mergeable,
            reviewComments: pr.review_comments,
            comments: pr.comments
          };

          // Update status based on PR state
          if (pr.merged && improvement.status !== 'deployed') {
            await prisma.selfImprovement.update({
              where: { id },
              data: {
                status: 'merged',
                updatedAt: new Date()
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching PR status:', error);
      }
    }

    return NextResponse.json({
      improvement: {
        id: improvement.id,
        status: improvement.status,
        problemStatement: improvement.problemStatement,
        solutionApproach: improvement.solutionApproach,
        riskLevel: improvement.riskLevel,
        branchName: improvement.branchName,
        prNumber: improvement.prNumber,
        prUrl: improvement.prUrl,
        filesChanged: improvement.filesChanged,
        testCoverage: improvement.testCoverage,
        deploymentUrl: improvement.deploymentUrl,
        outcome: improvement.outcome,
        createdAt: improvement.createdAt,
        updatedAt: improvement.updatedAt
      },
      prStatus
    });

  } catch (error) {
    console.error('Error fetching improvement status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch improvement status' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PATCH /api/self-improvement/status/[id]
 * Update the status of a self-improvement
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, outcome, learnings, metricsImproved } = body;

    // Get the improvement record
    const improvement = await prisma.selfImprovement.findUnique({
      where: { id }
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

    // Update the improvement
    const updated = await prisma.selfImprovement.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(outcome && { outcome }),
        ...(learnings && { learnings }),
        ...(metricsImproved && { metricsImproved }),
        ...(status === 'deployed' && { deployedAt: new Date() }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      improvement: updated,
      message: 'Improvement status updated successfully'
    });

  } catch (error) {
    console.error('Error updating improvement status:', error);
    return NextResponse.json(
      { error: 'Failed to update improvement status' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
