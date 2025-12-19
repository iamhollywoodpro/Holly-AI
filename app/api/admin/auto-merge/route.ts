/**
 * Auto-Merge PR System API Route
 * Phase 4A - Automatically merge safe PRs from self-healing with rollback support
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

// GitHub API configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'iamhollywoodpro';
const GITHUB_REPO = 'Holly-AI';

interface PRSafetyAnalysis {
  safetyScore: number;
  riskFactors: string[];
  recommendation: 'auto_merge' | 'manual_review' | 'reject';
  reasoning: string;
}

// Safety thresholds
const SAFETY_THRESHOLDS = {
  HIGH_SAFETY: 0.85,
  MEDIUM_SAFETY: 0.65,
  AUTO_MERGE_MIN: 0.75
};

/**
 * Analyze PR safety for auto-merge
 */
async function analyzePRSafety(pr: any, selfHealingAction?: any): Promise<PRSafetyAnalysis> {
  const riskFactors: string[] = [];
  let safetyScore = 1.0;

  // Factor 1: Self-healing action type (if linked)
  if (selfHealingAction) {
    if (selfHealingAction.healingType === 'typescript_fix') {
      safetyScore *= 0.95; // High confidence in TypeScript fixes
    } else if (selfHealingAction.healingType === 'dependency_update') {
      safetyScore *= 0.75; // Medium confidence
      riskFactors.push('Dependency update - requires testing');
    } else if (selfHealingAction.healingType === 'performance_optimization') {
      safetyScore *= 0.70; // Lower confidence
      riskFactors.push('Performance changes - requires benchmarking');
    }
  }

  // Factor 2: Files changed count
  const filesChanged = pr.changed_files || 0;
  if (filesChanged > 10) {
    safetyScore *= 0.6;
    riskFactors.push(`Large PR: ${filesChanged} files changed`);
  } else if (filesChanged > 5) {
    safetyScore *= 0.8;
    riskFactors.push(`Medium PR: ${filesChanged} files changed`);
  }

  // Factor 3: Lines changed
  const additions = pr.additions || 0;
  const deletions = pr.deletions || 0;
  const totalChanges = additions + deletions;
  
  if (totalChanges > 500) {
    safetyScore *= 0.5;
    riskFactors.push(`Large changeset: ${totalChanges} lines`);
  } else if (totalChanges > 200) {
    safetyScore *= 0.7;
    riskFactors.push(`Medium changeset: ${totalChanges} lines`);
  }

  // Factor 4: CI checks status
  if (pr.checks_status === 'failing') {
    safetyScore *= 0.0; // Never merge failing PRs
    riskFactors.push('CI checks failing');
  } else if (pr.checks_status === 'pending') {
    safetyScore *= 0.5;
    riskFactors.push('CI checks still pending');
  }

  // Factor 5: File types affected
  const affectedFiles = pr.files || [];
  const criticalFiles = affectedFiles.filter((f: any) => 
    f.filename.includes('schema.prisma') ||
    f.filename.includes('package.json') ||
    f.filename.includes('.env') ||
    f.filename.includes('middleware') ||
    f.filename.includes('auth')
  );

  if (criticalFiles.length > 0) {
    safetyScore *= 0.6;
    riskFactors.push('Critical files modified');
  }

  // Factor 6: Time since creation (newer PRs are riskier)
  const createdAt = new Date(pr.created_at);
  const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCreation < 1) {
    safetyScore *= 0.8;
    riskFactors.push('Very recent PR - limited validation time');
  }

  // Determine recommendation
  let recommendation: 'auto_merge' | 'manual_review' | 'reject';
  if (safetyScore >= SAFETY_THRESHOLDS.AUTO_MERGE_MIN) {
    recommendation = 'auto_merge';
  } else if (safetyScore >= SAFETY_THRESHOLDS.MEDIUM_SAFETY) {
    recommendation = 'manual_review';
  } else {
    recommendation = 'reject';
  }

  return {
    safetyScore,
    riskFactors,
    recommendation,
    reasoning: `Safety score: ${(safetyScore * 100).toFixed(1)}%. ${
      recommendation === 'auto_merge' 
        ? 'Safe for automatic merge.' 
        : recommendation === 'manual_review'
        ? 'Requires manual review.'
        : 'Too risky for merge.'
    }`
  };
}

/**
 * Merge PR via GitHub API
 */
async function mergePR(prNumber: number, commitTitle?: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${prNumber}/merge`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commit_title: commitTitle || `Auto-merge PR #${prNumber}`,
          commit_message: 'Automatically merged by HOLLY',
          merge_method: 'squash'
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error merging PR:', error);
    return false;
  }
}

/**
 * Rollback merged PR by creating a revert PR
 */
async function rollbackPR(prNumber: number, commitSha: string, reason: string): Promise<string | null> {
  try {
    // Create revert commit
    const revertResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Revert PR #${prNumber}: ${reason}`,
          tree: commitSha,
          parents: [commitSha]
        })
      }
    );

    if (!revertResponse.ok) {
      return null;
    }

    // Create revert PR
    const revertPRResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Revert PR #${prNumber}`,
          body: `Automatic rollback by HOLLY\n\nReason: ${reason}`,
          head: `revert-pr-${prNumber}`,
          base: 'main'
        })
      }
    );

    if (!revertPRResponse.ok) {
      return null;
    }

    const revertPR = await revertPRResponse.json();
    return revertPR.html_url;
  } catch (error) {
    console.error('Error rolling back PR:', error);
    return null;
  }
}

/**
 * POST /api/admin/auto-merge/evaluate
 * Evaluate PR for auto-merge eligibility
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prNumber } = body;

    if (!prNumber) {
      return NextResponse.json({ error: 'PR number is required' }, { status: 400 });
    }

    // Get PR details from GitHub
    const prResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    if (!prResponse.ok) {
      return NextResponse.json({ error: 'PR not found' }, { status: 404 });
    }

    const prData = await prResponse.json();

    // Check if PR exists in our database
    const existingPR = await prisma.pullRequest.findUnique({
      where: { prNumber },
      include: { selfHealingAction: true }
    });

    // Analyze safety
    const analysis = await analyzePRSafety(prData, existingPR?.selfHealingAction);

    // Save or update PR record
    const prRecord = await prisma.pullRequest.upsert({
      where: { prNumber },
      update: {
        title: prData.title,
        description: prData.body,
        branch: prData.head.ref,
        baseBranch: prData.base.ref,
        autoMergeable: analysis.recommendation === 'auto_merge',
        safetyScore: analysis.safetyScore,
        riskFactors: analysis.riskFactors,
        checksStatus: prData.mergeable_state,
        status: prData.state
      },
      create: {
        prNumber,
        prUrl: prData.html_url,
        title: prData.title,
        description: prData.body,
        branch: prData.head.ref,
        baseBranch: prData.base.ref,
        selfHealingId: existingPR?.selfHealingId,
        autoMergeable: analysis.recommendation === 'auto_merge',
        safetyScore: analysis.safetyScore,
        riskFactors: analysis.riskFactors,
        checksStatus: prData.mergeable_state,
        status: prData.state
      }
    });

    return NextResponse.json({
      success: true,
      pr: prRecord,
      analysis: {
        ...analysis,
        canAutoMerge: analysis.recommendation === 'auto_merge',
        filesChanged: prData.changed_files,
        additions: prData.additions,
        deletions: prData.deletions
      }
    });

  } catch (error) {
    console.error('Error evaluating PR:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate PR' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/auto-merge/merge/:prNumber
 * Merge a PR automatically
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const prNumber = parseInt(url.pathname.split('/').pop() || '0');

    if (!prNumber) {
      return NextResponse.json({ error: 'Invalid PR number' }, { status: 400 });
    }

    // Get PR record
    const prRecord = await prisma.pullRequest.findUnique({
      where: { prNumber }
    });

    if (!prRecord) {
      return NextResponse.json({ error: 'PR not found' }, { status: 404 });
    }

    if (!prRecord.autoMergeable) {
      return NextResponse.json({ 
        error: 'PR not eligible for auto-merge',
        safetyScore: prRecord.safetyScore,
        riskFactors: prRecord.riskFactors
      }, { status: 400 });
    }

    // Perform merge
    const merged = await mergePR(prNumber, prRecord.title);

    if (!merged) {
      return NextResponse.json({ error: 'Failed to merge PR' }, { status: 500 });
    }

    // Update PR record
    await prisma.pullRequest.update({
      where: { prNumber },
      data: {
        status: 'merged',
        merged: true,
        mergedAt: new Date(),
        mergedBy: 'holly-auto-merge'
      }
    });

    return NextResponse.json({
      success: true,
      message: `PR #${prNumber} merged successfully`,
      prNumber,
      mergedAt: new Date()
    });

  } catch (error) {
    console.error('Error merging PR:', error);
    return NextResponse.json(
      { error: 'Failed to merge PR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/auto-merge/rollback/:prNumber
 * Rollback a merged PR
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const prNumber = parseInt(url.pathname.split('/').pop() || '0');
    const body = await req.json();
    const { reason } = body;

    if (!prNumber) {
      return NextResponse.json({ error: 'Invalid PR number' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: 'Rollback reason is required' }, { status: 400 });
    }

    // Get PR record
    const prRecord = await prisma.pullRequest.findUnique({
      where: { prNumber }
    });

    if (!prRecord || !prRecord.merged) {
      return NextResponse.json({ error: 'PR not merged' }, { status: 400 });
    }

    // Get commit SHA from GitHub
    const prResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      }
    );

    const prData = await prResponse.json();
    const revertPRUrl = await rollbackPR(prNumber, prData.merge_commit_sha, reason);

    if (!revertPRUrl) {
      return NextResponse.json({ error: 'Failed to create rollback PR' }, { status: 500 });
    }

    // Update PR record
    await prisma.pullRequest.update({
      where: { prNumber },
      data: {
        status: 'rolled_back',
        rolledBack: true,
        rollbackReason: reason,
        rolledBackAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `PR #${prNumber} rolled back`,
      revertPRUrl,
      prNumber
    });

  } catch (error) {
    console.error('Error rolling back PR:', error);
    return NextResponse.json(
      { error: 'Failed to rollback PR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auto-merge/list
 * List recent PRs with auto-merge status
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prs = await prisma.pullRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        selfHealingAction: {
          select: {
            healingType: true,
            issueType: true,
            status: true
          }
        }
      }
    });

    const stats = {
      total: prs.length,
      autoMergeable: prs.filter(pr => pr.autoMergeable).length,
      merged: prs.filter(pr => pr.merged).length,
      rolledBack: prs.filter(pr => pr.rolledBack).length,
      avgSafetyScore: prs.length > 0 
        ? prs.reduce((sum, pr) => sum + pr.safetyScore, 0) / prs.length 
        : 0
    };

    return NextResponse.json({
      success: true,
      prs,
      stats
    });

  } catch (error) {
    console.error('Error listing PRs:', error);
    return NextResponse.json(
      { error: 'Failed to list PRs' },
      { status: 500 }
    );
  }
}
