import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// Phase 4B: A/B Testing API
// ============================================
// Purpose: Create and manage A/B tests, assign users, track conversions
// Methods: POST (create/assign/expose/convert), GET (list/results), PUT (update), DELETE (delete)
// ============================================

// POST: Create test OR handle action-based operations (assign/expose/convert)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, testId, variant, metricName, metricValue, testData } = body;

    // Route based on action
    if (action === 'assign') {
      return await handleAssign(userId, testId, variant);
    } else if (action === 'expose') {
      return await handleExpose(userId, testId, variant);
    } else if (action === 'convert') {
      return await handleConvert(userId, testId, metricName || 'conversion', metricValue || 1.0);
    } else if (action === 'create' || !action) {
      // Create new A/B test
      return await createTest(testData);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
    const { testId, name, description, status, variants, trafficAllocation } = body;

    if (!testId) {
      return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
    }

    const updatedTest = await prisma.aBTest.update({
      where: { id: testId },
      data: {
        name: name || undefined,
        description: description || undefined,
        status: status || undefined,
        variants: variants ? JSON.parse(JSON.stringify(variants)) : undefined,
        trafficAllocation: trafficAllocation ? JSON.parse(JSON.stringify(trafficAllocation)) : undefined,
        updatedAt: new Date(),
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

async function createTest(testData: any) {
  const { name, description, variants, trafficAllocation, targetUrl, successMetrics } = testData;

  if (!name || !variants || variants.length < 2) {
    return NextResponse.json(
      { error: 'Test name and at least 2 variants required' },
      { status: 400 }
    );
  }

  const newTest = await prisma.aBTest.create({
    data: {
      name,
      description: description || '',
      status: 'draft',
      variants: JSON.parse(JSON.stringify(variants)),
      trafficAllocation: trafficAllocation 
        ? JSON.parse(JSON.stringify(trafficAllocation))
        : JSON.parse(JSON.stringify({ control: 50, variant: 50 })),
      targetUrl: targetUrl || null,
      successMetrics: successMetrics 
        ? JSON.parse(JSON.stringify(successMetrics))
        : JSON.parse(JSON.stringify(['conversion'])),
    },
  });

  return NextResponse.json({ test: newTest }, { status: 201 });
}

async function handleAssign(clerkUserId: string, testId: string, variant: string) {
  if (!testId) {
    return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
  }

  // Get user by clerkId
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
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

  // Get test and determine variant
  const test = await prisma.aBTest.findUnique({ where: { id: testId } });
  if (!test) {
    return NextResponse.json({ error: 'Test not found' }, { status: 404 });
  }

  // Auto-assign variant if not provided
  let assignedVariant = variant;
  if (!assignedVariant) {
    const variants = test.variants as any[];
    const trafficAllocation = test.trafficAllocation as any;
    
    // Simple random assignment based on traffic allocation
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const [key, value] of Object.entries(trafficAllocation)) {
      cumulative += value as number;
      if (random <= cumulative) {
        assignedVariant = variants.find(v => v.id === key)?.id || variants[0].id;
        break;
      }
    }
    
    if (!assignedVariant) assignedVariant = variants[0].id;
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
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Update exposure timestamp
  const assignment = await prisma.aBTestAssignment.updateMany({
    where: { clerkUserId, testId, variant },
    data: { exposed: true, exposedAt: new Date() },
  });

  return NextResponse.json({ message: 'Exposure tracked', updated: assignment.count }, { status: 200 });
}

async function handleConvert(clerkUserId: string, testId: string, metricName: string = 'conversion', metricValue: number = 1.0) {
  if (!testId) {
    return NextResponse.json({ error: 'Test ID required' }, { status: 400 });
  }

  // Get user by clerkId
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
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

  const variants = test.variants as any[];
  
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
      variantName: variantDef.name,
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
      createdAt: test.createdAt,
      startedAt: test.startedAt,
      endedAt: test.endedAt,
    },
    variantStats,
    totalAssignments: test.assignments.length,
    totalConversions: test.conversions.length,
  }, { status: 200 });
}
