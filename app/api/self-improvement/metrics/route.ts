import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

/**
 * GET /api/self-improvement/metrics
 * Get metrics and analytics for self-improvements
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all improvements for this user
    const improvements = await prisma.selfImprovement.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        riskLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate metrics
    const totalImprovements = improvements.length;
    const approvedCount = improvements.filter(i => i.status === 'APPROVED' || i.status === 'approved').length;
    const rejectedCount = improvements.filter(i => i.status === 'REJECTED' || i.status === 'rejected').length;
    const pendingCount = improvements.filter(i => 
      ['PLANNED', 'planned', 'IN_PROGRESS', 'code_generated', 'PENDING_REVIEW', 'pr_created'].includes(i.status)
    ).length;
    const deployedCount = improvements.filter(i => i.status === 'DEPLOYED' || i.status === 'deployed').length;

    const approvalRate = totalImprovements > 0 ? (approvedCount / totalImprovements) * 100 : 0;
    const rejectionRate = totalImprovements > 0 ? (rejectedCount / totalImprovements) * 100 : 0;

    // Risk level distribution
    const lowRiskCount = improvements.filter(i => i.riskLevel === 'LOW' || i.riskLevel === 'low').length;
    const mediumRiskCount = improvements.filter(i => i.riskLevel === 'MEDIUM' || i.riskLevel === 'medium').length;
    const highRiskCount = improvements.filter(i => i.riskLevel === 'HIGH' || i.riskLevel === 'high').length;

    // Average time to approval (for approved improvements)
    const approvedImprovements = improvements.filter(i => i.status === 'APPROVED' || i.status === 'approved');
    let avgTimeToApproval = 0;
    if (approvedImprovements.length > 0) {
      const totalTime = approvedImprovements.reduce((sum, imp) => {
        const created = new Date(imp.createdAt).getTime();
        const updated = new Date(imp.updatedAt).getTime();
        return sum + (updated - created);
      }, 0);
      avgTimeToApproval = totalTime / approvedImprovements.length / (1000 * 60 * 60); // Convert to hours
    }

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentImprovements = improvements.filter(i => new Date(i.createdAt) >= thirtyDaysAgo);

    return NextResponse.json({
      totalImprovements,
      statusBreakdown: {
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount,
        deployed: deployedCount,
      },
      rates: {
        approvalRate: Math.round(approvalRate * 10) / 10,
        rejectionRate: Math.round(rejectionRate * 10) / 10,
      },
      riskDistribution: {
        low: lowRiskCount,
        medium: mediumRiskCount,
        high: highRiskCount,
      },
      avgTimeToApprovalHours: Math.round(avgTimeToApproval * 10) / 10,
      recentActivity: {
        last30Days: recentImprovements.length,
      },
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
