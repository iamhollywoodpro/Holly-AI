/**
 * File Read API Endpoint
 * POST /api/system/file/read
 * 
 * Allows HOLLY to read source code files
 * Part of Phase 7: Foundation Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { readSourceFile } from '@/lib/system/file-system';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { filepath, options } = body;

    if (!filepath) {
      return NextResponse.json(
        { error: 'filepath is required' },
        { status: 400 }
      );
    }

    console.log(`[API:File:Read] Reading file: ${filepath}`);

    // Read file
    const result = await readSourceFile(filepath, options);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      metadata: result.metadata
    });

  } catch (error) {
    console.error('[API:File:Read] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
