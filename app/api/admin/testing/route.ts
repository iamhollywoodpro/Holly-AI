/**
 * Automated Testing API - Phase 4D
 * Manage test suites, run tests, track coverage
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST: Create test suite OR run tests
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'run_tests') {
      return await runTests(userId, body.suiteId);
    } else {
      // Create new test suite
      const { name, description, suiteType, framework, testFiles, coverage, parallel, timeout, minCoverage } = body;

      if (!name || !suiteType || !framework) {
        return NextResponse.json(
          { error: 'Missing required fields: name, suiteType, framework' },
          { status: 400 }
        );
      }

      const suite = await prisma.testSuite.create({
        data: {
          name,
          description: description || null,
          suiteType,
          framework,
          testFiles: testFiles || [],
          coverage: coverage !== undefined ? coverage : true,
          parallel: parallel !== undefined ? parallel : true,
          timeout: timeout || 30000,
          minCoverage: minCoverage || 80.0,
          createdBy: userId,
        },
      });

      return NextResponse.json({ suite }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Testing API POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// GET: List test suites or get test runs
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const suiteId = searchParams.get('suiteId');
    const action = searchParams.get('action');

    if (action === 'runs' && suiteId) {
      // Get test runs for a suite
      const runs = await prisma.testRun.findMany({
        where: { suiteId },
        orderBy: { startedAt: 'desc' },
        take: 50,
      });
      return NextResponse.json({ runs }, { status: 200 });
    }

    if (action === 'latest' && suiteId) {
      // Get latest test run
      const run = await prisma.testRun.findFirst({
        where: { suiteId },
        orderBy: { startedAt: 'desc' },
      });
      return NextResponse.json({ run }, { status: 200 });
    }

    // List all test suites
    const suites = await prisma.testSuite.findMany({
      include: {
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ suites }, { status: 200 });
  } catch (error: any) {
    console.error('Testing API GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch test suites' },
      { status: 500 }
    );
  }
}

// PUT: Update test suite
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { suiteId, enabled, minCoverage, timeout, testFiles } = body;

    if (!suiteId) {
      return NextResponse.json({ error: 'Suite ID required' }, { status: 400 });
    }

    const suite = await prisma.testSuite.update({
      where: { id: suiteId },
      data: {
        enabled: enabled !== undefined ? enabled : undefined,
        minCoverage: minCoverage !== undefined ? minCoverage : undefined,
        timeout: timeout !== undefined ? timeout : undefined,
        testFiles: testFiles || undefined,
      },
    });

    return NextResponse.json({ suite }, { status: 200 });
  } catch (error: any) {
    console.error('Testing API PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update test suite' },
      { status: 500 }
    );
  }
}

// DELETE: Remove test suite
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const suiteId = searchParams.get('suiteId');

    if (!suiteId) {
      return NextResponse.json({ error: 'Suite ID required' }, { status: 400 });
    }

    // Delete all runs first (cascade)
    await prisma.testRun.deleteMany({ where: { suiteId } });
    await prisma.testSuite.delete({ where: { id: suiteId } });

    return NextResponse.json({ message: 'Test suite deleted' }, { status: 200 });
  } catch (error: any) {
    console.error('Testing API DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete test suite' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function runTests(userId: string, suiteId: string) {
  if (!suiteId) {
    return NextResponse.json({ error: 'Suite ID required' }, { status: 400 });
  }

  const suite = await prisma.testSuite.findUnique({ where: { id: suiteId } });
  if (!suite) {
    return NextResponse.json({ error: 'Test suite not found' }, { status: 404 });
  }

  if (!suite.enabled) {
    return NextResponse.json({ error: 'Test suite is disabled' }, { status: 400 });
  }

  // Get next run number
  const lastRun = await prisma.testRun.findFirst({
    where: { suiteId },
    orderBy: { runNumber: 'desc' },
  });
  const runNumber = (lastRun?.runNumber || 0) + 1;

  // Create test run
  const run = await prisma.testRun.create({
    data: {
      suiteId,
      runNumber,
      status: 'running',
      trigger: 'manual',
      triggeredBy: userId,
      testResults: {},
    },
  });

  // Simulate test execution (in production, this would trigger actual tests)
  // For now, we'll just create a mock result
  setTimeout(async () => {
    try {
      const mockResults = generateMockTestResults(suite);
      
      await prisma.testRun.update({
        where: { id: run.id },
        data: {
          status: mockResults.status,
          totalTests: mockResults.totalTests,
          passedTests: mockResults.passedTests,
          failedTests: mockResults.failedTests,
          skippedTests: mockResults.skippedTests,
          coveragePercent: mockResults.coveragePercent,
          duration: mockResults.duration,
          completedAt: new Date(),
          testResults: mockResults.testResults,
        },
      });

      // Update suite stats
      await prisma.testSuite.update({
        where: { id: suiteId },
        data: {
          lastRun: new Date(),
          totalTests: mockResults.totalTests,
          passingTests: mockResults.passedTests,
          failingTests: mockResults.failedTests,
        },
      });
    } catch (error) {
      console.error('Failed to update test run:', error);
    }
  }, 2000);

  return NextResponse.json({ run, message: 'Tests started' }, { status: 201 });
}

function generateMockTestResults(suite: any) {
  const totalTests = Math.floor(Math.random() * 50) + 10;
  const passRate = 0.85 + Math.random() * 0.1; // 85-95% pass rate
  const passedTests = Math.floor(totalTests * passRate);
  const failedTests = totalTests - passedTests;
  const coveragePercent = 75 + Math.random() * 20; // 75-95% coverage

  return {
    status: failedTests === 0 ? 'passed' : 'failed',
    totalTests,
    passedTests,
    failedTests,
    skippedTests: 0,
    coveragePercent: parseFloat(coveragePercent.toFixed(2)),
    duration: Math.floor(Math.random() * 30000) + 5000, // 5-35 seconds
    testResults: {
      suites: [
        {
          name: suite.name,
          tests: Array.from({ length: totalTests }, (_, i) => ({
            name: `Test ${i + 1}`,
            status: i < passedTests ? 'passed' : 'failed',
            duration: Math.floor(Math.random() * 1000) + 100,
          })),
        },
      ],
    },
  };
}
