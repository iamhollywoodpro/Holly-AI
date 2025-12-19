/**
 * A/B Testing API - Phase 4B
 * Manages A/B tests with proper schema alignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';


export const runtime = 'nodejs';

const prisma = new PrismaClient();

// POST: Create test OR handle actions (assign/expose/convert)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Route based on action
    if (action === 'assign') {
      return await handleAssign(userId, body.testId, body.variant);
    } else if (action === 'expose') {
      return await handleExpose(userId, body.testId, body.variant);
    } else if (action === 'convert') {
      return await handleConvert(userId, body.testId, body.metricName, body.metricValue);
    } else {
      // Create new A/B test
      const { 
        name, 
        description, 
        hypothesis,
        testType, 
        controlVariant, 
        testVariants,
        primaryMetric,
        secondaryMetrics,
        trafficAllocation,
        targetSegmentId,
        successCriteria,
        duration
      } = body;

      if (!name || !testType || !controlVariant || !testVariants || !primaryMetric) {
        return NextResponse.json(
          { error: 'Missing required fields: name, testType, controlVariant, testVariants, primaryMetric' },
          { status: 400 }
        );
      }

      const newTest = await prisma.aBTest.create({
        data: {
          name,
          description: description || null,
          hypothesis: hypothesis || null,
          testType,
          status: 'draft',
          controlVariant: JSON.parse(JSON.stringify(controlVariant)),
          testVariants: JSON.parse(JSON.stringify(testVariants)),
          primaryMetric,
          secondaryMetrics: secondaryMetrics || [],
          trafficAllocation: trafficAllocation || 1.0,
          targetSegmentId: targetSegmentId || null,
          successCriteria: successCriteria ? JSON.parse(JSON.stringify(successCriteria)) : null,
          duration: duration || null,
          createdBy: userId,
        },
      });

      return NextResponse.json({ test: newTest }, { status: 201 });
    }
  } catch (error: any) {
    console.error('A/B Test POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process A/B test request' },
      { status: 500 }
    );
  }
}

// GET: List tests OR get test results
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get('testId');
    const action = searchParams.get('action');

    if (action === 'results' && testId) {
      return await getTestResults(testId);
    }

    // List all A/B tests with stats
    const tests = await prisma.aBTest.findMany({
      include: {
        assignments: {
          select: {
            id: true,
            variant: true,
            assignedAt: true,
            exposed: true,
          },
        },
        conversions: {
          select: {
            id: true,
            metricName: true,
            metricValue: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats for each test
    const testsWithStats = tests.map(test => {
      const totalAssignments = test.assignments.length;
      const totalConversions = test.conversions.length;
      const conversionRate = totalAssignments > 0 
        ? (totalConversions / totalAssignments * 100).toFixed(2)
        : '0.00';

      return {
        ...test,
        stats: {
          totalAssignments,
          totalConversions,
          conversionRate: `${conversionRate}%`,
        },
      };
    });

    return NextResponse.json({ tests: testsWithStats }, { status: 200 });
  } catch (error: any) {
    console.error('A/B Test GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch A/B tests' },
      { status: 500 }
    );
  }
}

// PUT: Update test
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      testId, 
      name, 
      description, 
      hypothesis,
      status, 
      controlVariant, 
      testVariants,
      trafficAllocation,
      primaryMetric,
      secondaryMetrics,
      successCriteria,
      winner,
      confidence,
      startDate,
      endDate,
      duration
    } = body;

    if (!testId) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
    }

    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        hypothesis: hypothesis !== undefined ? hypothesis : undefined,
        status: status || undefined,
        controlVariant: controlVariant ? JSON.parse(JSON.stringify(controlVariant)) : undefined,
        testVariants: testVariants ? JSON.parse(JSON.stringify(testVariants)) : undefined,
        trafficAllocation: trafficAllocation !== undefined ? trafficAllocation : undefined,
        primaryMetric: primaryMetric || undefined,
        secondaryMetrics: secondaryMetrics || undefined,
        successCriteria: successCriteria ? JSON.parse(JSON.stringify(successCriteria)) : undefined,
        winner: winner !== undefined ? winner : undefined,
        confidence: confidence !== undefined ? confidence : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        duration: duration !== undefined ? duration : undefined,
      },
      include: {
        assignments: true,
        conversions: true,
      },
    });

    return NextResponse.json({ test: updatedTest }, { status: 200 });
  } catch (error: any) {
    console.error('A/B Test PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update A/B test' },
      { status: 500 }
    );
  }
}

// DELETE: Remove test
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get('testId');

    if (!testId) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
    }

    // Delete assignments and conversions first (cascade)
    await prisma.aBTestConversion.deleteMany({ where: { testId } });
    await prisma.aBTestAssignment.deleteMany({ where: { testId } });
    await prisma.aBTest.delete({ where: { id: testId } });

    return NextResponse.json({ message: 'Test deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('A/B Test DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete A/B test' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function handleAssign(clerkUserId: string, testId: string, variant?: string) {
  if (!testId) {
    return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
  }

  // Get user by clerkId
  const user = await prisma.user.findUnique({ where: { clerkUserId: clerkUserId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if assignment already exists
  const existingAssignment = await prisma.aBTestAssignment.findFirst({
    where: { clerkUserId, testId },
  });

  if (existingAssignment) {
    return NextResponse.json({ assignment: existingAssignment }, { status: 200 });
  }

  // Get test
  const test = await prisma.aBTest.findUnique({ where: { id: testId } });
  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  // Auto-assign variant if not provided
  let assignedVariant = variant;
  if (!assignedVariant) {
    const testVariantsArray = test.testVariants as any[];
    const controlVariantData = test.controlVariant as any;
    
    // Simple random assignment (50/50 control vs test for now)
    const random = Math.random();
    if (random < 0.5 || testVariantsArray.length === 0) {
      assignedVariant = 'control';
    } else {
      // Pick random test variant
      const randomIndex = Math.floor(Math.random() * testVariantsArray.length);
      assignedVariant = testVariantsArray[randomIndex]?.id || 'control';
    }
  }

  // Create assignment
  const assignment = await prisma.aBTestAssignment.create({
    data: {
      userId: user.id,
      clerkUserId,
      testId,
      variant: assignedVariant,
    },
  });

  return NextResponse.json({ assignment }, { status: 201 });
}

async function handleExpose(clerkUserId: string, testId: string, variant: string) {
  if (!testId || !variant) {
    return NextResponse.json({ error: 'Test ID and Variant required' }, { status: 400 });
  }

  // Get user by clerkId
  const user = await prisma.user.findUnique({ where: { clerkUserId: clerkUserId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Update exposure
  const assignment = await prisma.aBTestAssignment.updateMany({
    where: { clerkUserId, testId, variant },
    data: { exposed: true, firstExposedAt: new Date(), exposureCount: { increment: 1 } },
  });

  return NextResponse.json({ message: 'Exposure tracked', updated: assignment.count }, { status: 200 });
}

async function handleConvert(clerkUserId: string, testId: string, metricName: string = 'conversion', metricValue: number = 1.0) {
  if (!testId) {
    return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
  }

  // Get user by clerkId
  const user = await prisma.user.findUnique({ where: { clerkUserId: clerkUserId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Get user's assignment
  const assignment = await prisma.aBTestAssignment.findFirst({
    where: { clerkUserId, testId },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'No assignment found for this test' }, { status: 404 });
  }

  // Create conversion
  const conversion = await prisma.aBTestConversion.create({
    data: {
      userId: user.id,
      clerkUserId,
      testId,
      variant: assignment.variant,
      metricName,
      metricValue,
    },
  });

  return NextResponse.json({ conversion }, { status: 201 });
}

async function getTestResults(testId: string) {
  const test = await prisma.aBTest.findUnique({
    where: { id: testId },
    include: {
      assignments: true,
      conversions: true,
    },
  });

  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  const testVariantsArray = test.testVariants as any[];
  const controlVariantData = test.controlVariant as any;
  
  // Build variant list (control + test variants)
  const variants = [
    { id: 'control', name: 'Control', ...controlVariantData },
    ...testVariantsArray,
  ];
  
  // Calculate stats per variant
  const variantStats = variants.map(variantDef => {
    const assignments = test.assignments.filter(a => a.variant === variantDef.id);
    const conversions = test.conversions.filter(c => c.variant === variantDef.id);
    
    const assignmentCount = assignments.length;
    const conversionCount = conversions.length;
    const conversionRate = assignmentCount > 0 
      ? ((conversionCount / assignmentCount) * 100).toFixed(2)
      : '0.00';
    
    const exposures = assignments.filter(a => a.exposed).length;
    const exposureRate = assignmentCount > 0
      ? ((exposures / assignmentCount) * 100).toFixed(2)
      : '0.00';

    return {
      variantId: variantDef.id,
      variantName: variantDef.name || variantDef.id,
      assignments: assignmentCount,
      exposures,
      exposureRate: `${exposureRate}%`,
      conversions: conversionCount,
      conversionRate: `${conversionRate}%`,
    };
  });

  return NextResponse.json({
    test: {
      id: test.id,
      name: test.name,
      status: test.status,
      testType: test.testType,
      primaryMetric: test.primaryMetric,
      createdAt: test.createdAt,
      startDate: test.startDate,
      endDate: test.endDate,
      winner: test.winner,
      confidence: test.confidence,
    },
    variantStats,
    totalAssignments: test.assignments.length,
    totalConversions: test.conversions.length,
  }, { status: 200 });
}
