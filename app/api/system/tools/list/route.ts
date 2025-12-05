/**
 * PHASE 7: Tool Registry API - List Tools Endpoint
 * GET /api/system/tools/list?status=active&category=system
 * Lists all registered tools with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listAvailableTools } from '@/lib/system/tool-registry';

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
    const category = searchParams.get('category') as 'system' | 'creative' | 'analysis' | 'integration' | undefined;

    // List tools
    const result = await listAvailableTools({ status, category });

    if (result.success) {
      return NextResponse.json({
        success: true,
        tools: result.tools,
        count: result.tools?.length || 0,
        filters: { status, category }
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to list tools', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] List tools error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve tools',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
