/**
 * PHASE 3: Problems API
 * Get detected problems
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDetectedProblems } from '@/lib/metamorphosis/problem-detector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Authenticate (optional - can make public for monitoring)
    const { userId } = await auth();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const severity = searchParams.get('severity') as any;
    const status = searchParams.get('status') || undefined;

    // Get problems
    const problems = await getDetectedProblems({
      type,
      severity,
      status
    });

    return NextResponse.json({
      success: true,
      count: problems.length,
      problems
    });
  } catch (error: any) {
    console.error('[Problems API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
