/**
 * PHASE 8: List APIs Endpoint
 * GET /api/external/api/list?status=active&createdBy=holly
 * List all registered API integrations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listAPIs } from '@/lib/external/api-hub';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'active' | 'disabled' | 'testing' | undefined;
    const createdBy = searchParams.get('createdBy') as 'system' | 'holly' | 'admin' | undefined;

    // List APIs
    const apis = await listAPIs({ status, createdBy });

    return NextResponse.json({
      success: true,
      apis,
      count: apis.length,
      filters: { status, createdBy }
    });

  } catch (error) {
    console.error('[API] List APIs error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list APIs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
