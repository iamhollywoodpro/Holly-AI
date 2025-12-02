/**
 * A/B Testing API
 * Phase 4B - Create, manage, and track A/B tests
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/admin/abtest
 * Create a new A/B test
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      hypothesis,
      testType,
      controlVariant,
      testVariants,
      targetSegmentId,
      trafficAllocation,
      primaryMetric,
      secondaryMetrics,
      successCriteria,
      duration
    } = body;

    const test = await prisma.aBTest.create({
      data: {
        name,
        description,
        hypothesis,
        testType,
        controlVariant: JSON.parse(JSON.stringify(controlVariant)),
        testVariants: JSON.parse(JSON.stringify(testVariants)),
        targetSegmentId,
        trafficAllocation: trafficAllocation || 1.0,
        primaryMetric,
        secondaryMetrics: secondaryMetrics || [],
        successCriteria: successCriteria ? JSON.parse(JSON.stringify(successCriteria)) : null,
        duration,
        createdBy: userId
      }
    });

    return NextResponse.json({
      success: true,
      test
    });

  } catch (error) {
    console.error('Error creating A/B test:', error);
    return NextResponse.json(
      { error: 'Failed to create A/B test' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/abtest
 * List all A/B tests
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;

    const tests = await prisma.aBTest.findMany({
      where: status ? { status } : undefined,
      include: {
        targetSegment: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            assignments: true,
            conversions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      tests
    });

  } catch (error) {
    console.error('Error listing A/B tests:', error);
    return NextResponse.json(
      { error: 'Failed to list A/B tests' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/abtest/:id/start
 * Start an A/B test
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const testId = url.pathname.split('/').slice(-2, -1)[0];
    const action = url.pathname.split('/').pop();

    if (action === 'start') {
      const test = await prisma.aBTest.update({
        where: { id: testId },
        data: {
          status: 'running',
          startDate: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        test
      });
    } else if (action === 'pause') {
      const test = await prisma.aBTest.update({
        where: { id: testId },
        data: {
          status: 'paused'
        }
      });

      return NextResponse.json({
        success: true,
        test
      });
    } else if (action === 'complete') {
      const test = await prisma.aBTest.update({
        where: { id: testId },
        data: {
          status: 'completed',
          endDate: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        test
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating A/B test:', error);
    return NextResponse.json(
      { error: 'Failed to update A/B test' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/abtest/assign
 * Assign user to A/B test variant
 */
export async function POST_ASSIGN(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { testId } = body;

    // Check if already assigned
    const existing = await prisma.aBTestAssignment.findUnique({
      where: {
        testId_clerkUserId: {
          testId,
          clerkUserId: userId
        }
      }
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        assignment: existing
      });
    }

    // Get test
    const test = await prisma.aBTest.findUnique({
      where: { id: testId }
    });

    if (!test || test.status !== 'running') {
      return NextResponse.json({ error: 'Test not available' }, { status: 400 });
    }

    // Check if user is in target segment
    if (test.targetSegmentId) {
      const inSegment = await prisma.userSegmentMember.findFirst({
        where: {
          segmentId: test.targetSegmentId,
          clerkUserId: userId
        }
      });

      if (!inSegment) {
        return NextResponse.json({ error: 'User not in target segment' }, { status: 403 });
      }
    }

    // Assign variant (simple random assignment)
    const variants = ['control', ...(Array.isArray(test.testVariants) ? test.testVariants : [test.testVariants]).map((v: any, i: number) => `variant_${i + 1}`)];
    const variant = variants[Math.floor(Math.random() * variants.length)];

    const assignment = await prisma.aBTestAssignment.create({
      data: {
        testId,
        userId,
        clerkUserId: userId,
        variant
      }
    });

    return NextResponse.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error assigning A/B test:', error);
    return NextResponse.json(
      { error: 'Failed to assign A/B test' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/abtest/expose
 * Mark user as exposed to test
 */
export async function POST_EXPOSE(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { testId } = body;

    await prisma.aBTestAssignment.updateMany({
      where: {
        testId,
        clerkUserId: userId
      },
      data: {
        exposed: true,
        firstExposedAt: new Date(),
        exposureCount: { increment: 1 }
      }
    });

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error exposing A/B test:', error);
    return NextResponse.json(
      { error: 'Failed to expose A/B test' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/abtest/convert
 * Track conversion for A/B test
 */
export async function POST_CONVERT(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { testId, metricName, metricValue, sessionId, metadata } = body;

    // Get assignment
    const assignment = await prisma.aBTestAssignment.findUnique({
      where: {
        testId_clerkUserId: {
          testId,
          clerkUserId: userId
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Not assigned to test' }, { status: 400 });
    }

    // Track conversion
    const conversion = await prisma.aBTestConversion.create({
      data: {
        testId,
        userId,
        clerkUserId: userId,
        variant: assignment.variant,
        metricName,
        metricValue,
        sessionId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
      }
    });

    return NextResponse.json({
      success: true,
      conversion
    });

  } catch (error) {
    console.error('Error tracking conversion:', error);
    return NextResponse.json(
      { error: 'Failed to track conversion' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/abtest/:id/results
 * Get A/B test results
 */
export async function GET_RESULTS(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const testId = url.pathname.split('/').slice(-2, -1)[0];

    // Get test
    const test = await prisma.aBTest.findUnique({
      where: { id: testId }
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    // Get assignments
    const assignments = await prisma.aBTestAssignment.findMany({
      where: { testId }
    });

    // Get conversions
    const conversions = await prisma.aBTestConversion.findMany({
      where: { testId }
    });

    // Calculate results by variant
    const variantResults: any = {};
    
    assignments.forEach(a => {
      if (!variantResults[a.variant]) {
        variantResults[a.variant] = {
          assigned: 0,
          exposed: 0,
          conversions: 0,
          totalValue: 0
        };
      }
      variantResults[a.variant].assigned++;
      if (a.exposed) variantResults[a.variant].exposed++;
    });

    conversions.forEach(c => {
      if (variantResults[c.variant]) {
        variantResults[c.variant].conversions++;
        variantResults[c.variant].totalValue += c.metricValue;
      }
    });

    // Calculate rates
    Object.keys(variantResults).forEach(variant => {
      const data = variantResults[variant];
      data.exposureRate = data.assigned > 0 ? data.exposed / data.assigned : 0;
      data.conversionRate = data.exposed > 0 ? data.conversions / data.exposed : 0;
      data.avgValue = data.conversions > 0 ? data.totalValue / data.conversions : 0;
    });

    return NextResponse.json({
      success: true,
      test,
      results: variantResults,
      summary: {
        totalAssignments: assignments.length,
        totalConversions: conversions.length,
        overallConversionRate: assignments.length > 0 
          ? conversions.length / assignments.filter(a => a.exposed).length 
          : 0
      }
    });

  } catch (error) {
    console.error('Error getting test results:', error);
    return NextResponse.json(
      { error: 'Failed to get test results' },
      { status: 500 }
    );
  }
}
