/**
 * Testing API
 * 
 * Run automated tests and get test statistics
 * 
 * Phase 5: Code Generation & Modification
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { automatedTesting } from '@/lib/code-generation/automated-testing';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    // Verify authentication (admin only)
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { suiteId, all } = body as {
      suiteId?: string;
      all?: boolean;
    };

    console.log(`[API:TEST] Running tests${suiteId ? ` for suite: ${suiteId}` : all ? ' (all suites)' : ' (pre-deployment)'}`);

    let result;

    if (all) {
      // Run all test suites
      const results = await automatedTesting.runAllTests();
      result = {
        suites: results,
        overallPassed: results.every(r => r.overallPassed)
      };
    } else if (suiteId) {
      // Run specific suite
      result = await automatedTesting.runTestSuite(suiteId);
    } else {
      // Run pre-deployment tests (default)
      result = await automatedTesting.runPreDeploymentTests();
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:TEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'stats') {
      // Get test statistics
      const stats = await automatedTesting.getTestStatistics();
      return NextResponse.json({
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'suites') {
      // List available test suites
      const suites = automatedTesting.getTestSuites();
      return NextResponse.json({
        success: true,
        suites: suites.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          testsCount: s.tests.length,
          requiredForDeployment: s.requiredForDeployment
        })),
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=stats or ?action=suites' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API:TEST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
