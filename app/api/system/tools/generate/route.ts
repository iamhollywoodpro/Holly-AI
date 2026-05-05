/**
 * PHASE 7: Tool Registry API - Generate Tool Scaffold Endpoint
 * POST /api/system/tools/generate
 * Generates TypeScript code scaffold for a new tool
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateToolBoilerplate } from '@/lib/system/tool-registry';

export const runtime = 'nodejs';


export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { toolName, purpose } = body;

    // Validate required fields
    if (!toolName || !purpose) {
      return NextResponse.json(
        { error: 'Tool name and purpose are required' },
        { status: 400 }
      );
    }

    // Generate scaffold
    const result = await generateToolBoilerplate(toolName, purpose);

    if (result.success) {
      return NextResponse.json({
        success: true,
        path: result.path,
        code: result.code,
        message: 'Tool scaffold generated successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to generate scaffold', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] Generate scaffold error:', error);
    return NextResponse.json(
      { 
        error: 'Scaffold generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
