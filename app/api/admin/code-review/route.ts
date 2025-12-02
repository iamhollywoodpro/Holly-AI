/**
 * AI Code Review API - Phase 4D
 * Automated code review, security analysis, quality scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST: Create code review OR approve/reject
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'approve') {
      return await approveReview(userId, body.reviewId);
    } else if (action === 'reject') {
      return await rejectReview(userId, body.reviewId, body.reason);
    } else {
      // Create new code review
      const {
        commitSha,
        branch,
        author,
        pullRequestId,
        pullRequestUrl,
        filesChanged,
        linesChanged,
      } = body;

      if (!commitSha || !branch || !author) {
        return NextResponse.json(
          { error: 'Missing required fields: commitSha, branch, author' },
          { status: 400 }
        );
      }

      // Create review
      const review = await prisma.codeReview.create({
        data: {
          commitSha,
          branch,
          author,
          pullRequestId: pullRequestId || null,
          pullRequestUrl: pullRequestUrl || null,
          filesChanged: filesChanged || 0,
          linesChanged: linesChanged || 0,
          status: 'pending',
          reviewType: 'automated',
          findings: [],
        },
      });

      // Run AI analysis asynchronously
      runAIAnalysis(review.id);

      return NextResponse.json({ review }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Code Review API POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// GET: List code reviews or get specific review
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get('reviewId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (reviewId) {
      // Get specific review
      const review = await prisma.codeReview.findUnique({
        where: { id: reviewId },
      });
      return NextResponse.json({ review }, { status: 200 });
    }

    // List reviews
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const reviews = await prisma.codeReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Calculate stats
    const stats = {
      total: reviews.length,
      pending: reviews.filter(r => r.status === 'pending').length,
      approved: reviews.filter(r => r.status === 'approved').length,
      changesRequested: reviews.filter(r => r.status === 'changes_requested').length,
      avgScore: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length
        : 0,
    };

    return NextResponse.json({ reviews, stats }, { status: 200 });
  } catch (error: any) {
    console.error('Code Review API GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch code reviews' },
      { status: 500 }
    );
  }
}

// PUT: Update code review
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reviewId, humanComments } = body;

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    const review = await prisma.codeReview.update({
      where: { id: reviewId },
      data: {
        humanReviewer: userId,
        humanComments: humanComments || null,
        humanReviewedAt: new Date(),
        reviewType: 'hybrid',
      },
    });

    return NextResponse.json({ review }, { status: 200 });
  } catch (error: any) {
    console.error('Code Review API PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE: Remove code review
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    await prisma.codeReview.delete({ where: { id: reviewId } });

    return NextResponse.json({ message: 'Code review deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('Code Review API DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete review' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function approveReview(userId: string, reviewId: string) {
  if (!reviewId) {
    return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
  }

  const review = await prisma.codeReview.update({
    where: { id: reviewId },
    data: {
      status: 'approved',
      humanReviewer: userId,
      humanReviewedAt: new Date(),
      autoApproved: false,
    },
  });

  return NextResponse.json({ review, message: 'Code review approved' }, { status: 200 });
}

async function rejectReview(userId: string, reviewId: string, reason: string) {
  if (!reviewId) {
    return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
  }

  const review = await prisma.codeReview.update({
    where: { id: reviewId },
    data: {
      status: 'changes_requested',
      blocked: true,
      blockReason: reason || 'Changes requested by reviewer',
      humanReviewer: userId,
      humanReviewedAt: new Date(),
    },
  });

  return NextResponse.json({ review, message: 'Changes requested' }, { status: 200 });
}

async function runAIAnalysis(reviewId: string) {
  // Simulate AI analysis
  setTimeout(async () => {
    try {
      const mockAnalysis = generateMockAnalysis();

      await prisma.codeReview.update({
        where: { id: reviewId },
        data: {
          overallScore: mockAnalysis.overallScore,
          qualityScore: mockAnalysis.qualityScore,
          securityScore: mockAnalysis.securityScore,
          performanceScore: mockAnalysis.performanceScore,
          maintainabilityScore: mockAnalysis.maintainabilityScore,
          criticalIssues: mockAnalysis.criticalIssues,
          majorIssues: mockAnalysis.majorIssues,
          minorIssues: mockAnalysis.minorIssues,
          suggestions: mockAnalysis.suggestions,
          findings: mockAnalysis.findings,
          securityVulnerabilities: mockAnalysis.securityVulnerabilities,
          performanceWarnings: mockAnalysis.performanceWarnings,
          complexity: mockAnalysis.complexity,
          duplicateCode: mockAnalysis.duplicateCode,
          aiComments: mockAnalysis.aiComments,
          autoApproved: mockAnalysis.autoApproved,
          status: mockAnalysis.autoApproved ? 'approved' : 'commented',
        },
      });
    } catch (error) {
      console.error('Failed to run AI analysis:', error);
    }
  }, 3000);
}

function generateMockAnalysis() {
  const qualityScore = 70 + Math.random() * 25; // 70-95
  const securityScore = 75 + Math.random() * 20; // 75-95
  const performanceScore = 70 + Math.random() * 25; // 70-95
  const maintainabilityScore = 65 + Math.random() * 30; // 65-95
  const overallScore = (qualityScore + securityScore + performanceScore + maintainabilityScore) / 4;

  const criticalIssues = Math.random() > 0.9 ? 1 : 0;
  const majorIssues = Math.floor(Math.random() * 3);
  const minorIssues = Math.floor(Math.random() * 8);
  const suggestions = Math.floor(Math.random() * 15);

  const autoApproved = overallScore >= 85 && criticalIssues === 0;

  return {
    overallScore: parseFloat(overallScore.toFixed(2)),
    qualityScore: parseFloat(qualityScore.toFixed(2)),
    securityScore: parseFloat(securityScore.toFixed(2)),
    performanceScore: parseFloat(performanceScore.toFixed(2)),
    maintainabilityScore: parseFloat(maintainabilityScore.toFixed(2)),
    criticalIssues,
    majorIssues,
    minorIssues,
    suggestions,
    findings: [
      {
        severity: 'minor',
        category: 'code-quality',
        message: 'Consider extracting this complex function',
        file: 'src/utils/helper.ts',
        line: 42,
      },
      {
        severity: 'suggestion',
        category: 'performance',
        message: 'Use memoization for expensive calculations',
        file: 'src/components/Dashboard.tsx',
        line: 156,
      },
    ],
    securityVulnerabilities: criticalIssues > 0 ? [
      {
        severity: 'critical',
        type: 'sql-injection',
        message: 'Potential SQL injection vulnerability',
        file: 'src/api/users.ts',
        line: 89,
      },
    ] : null,
    performanceWarnings: [
      {
        type: 'large-bundle',
        message: 'Component bundle size exceeds 100KB',
        file: 'src/components/LargeTable.tsx',
      },
    ],
    complexity: parseFloat((Math.random() * 15 + 5).toFixed(2)), // 5-20
    duplicateCode: parseFloat((Math.random() * 10).toFixed(2)), // 0-10%
    aiComments: [
      {
        line: 42,
        comment: 'Consider refactoring this function for better readability',
      },
      {
        line: 156,
        comment: 'Good use of React hooks',
      },
    ],
    autoApproved,
  };
}
