import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { validateFileAccess, validateRiskLevel } from '@/lib/self-improvement/safety-guardrails';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

/**
 * POST /api/self-improvement/plan
 * Create a new self-improvement plan
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
      triggerType,
      triggerData,
      problemStatement,
      solutionApproach,
      riskLevel,
      filesChanged
    } = body;

    // Validate required fields
    if (!triggerType || !problemStatement || !solutionApproach || !riskLevel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate risk level
    if (!['low', 'medium', 'high'].includes(riskLevel)) {
      return NextResponse.json(
        { error: 'Invalid risk level. Must be low, medium, or high' },
        { status: 400 }
      );
    }

    // Safety guardrails: Check file access
    if (filesChanged && filesChanged.length > 0) {
      for (const file of filesChanged) {
        const accessCheck = validateFileAccess(file);
        if (!accessCheck.allowed) {
          return NextResponse.json(
            { error: accessCheck.reason },
            { status: 403 }
          );
        }
      }

      // Safety guardrails: Validate risk level
      const riskCheck = validateRiskLevel(filesChanged, riskLevel);
      if (!riskCheck.allowed) {
        return NextResponse.json(
          { error: riskCheck.reason, warnings: riskCheck.warnings },
          { status: 400 }
          );
      }
    }

    // Generate branch name
    const timestamp = Date.now();
    const branchName = `holly/improvement-${timestamp}`;

    // Create the self-improvement record
    const improvement = await prisma.selfImprovement.create({
      data: {
        userId,
        triggerType,
        triggerData: triggerData || {},
        problemStatement,
        solutionApproach,
        riskLevel,
        branchName,
        filesChanged: filesChanged || [],
        status: 'planned'
      }
    });

    return NextResponse.json({
      improvementId: improvement.id,
      branchName: improvement.branchName,
      status: improvement.status,
      message: 'Self-improvement plan created successfully'
    });

  } catch (error) {
    console.error('Error creating self-improvement plan:', error);
    return NextResponse.json(
      { error: 'Failed to create self-improvement plan' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/self-improvement/plan
 * Get all self-improvement plans for the current user
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');

    const improvements = await prisma.selfImprovement.findMany({
      where: {
        userId,
        ...(status && { status })
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json({
      improvements,
      count: improvements.length
    });

  } catch (error) {
    console.error('Error fetching self-improvement plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch self-improvement plans' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
