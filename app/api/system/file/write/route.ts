/**
 * File Write API Endpoint
 * POST /api/system/file/write
 * 
 * Allows HOLLY to write/modify source code files
 * Part of Phase 7: Foundation Layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { writeSourceFile } from '@/lib/system/file-system';

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
    const { filepath, content, options } = body;

    if (!filepath) {
      return NextResponse.json(
        { error: 'filepath is required' },
        { status: 400 }
      );
    }

    if (content === undefined) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    console.log(`[API:File:Write] Writing file: ${filepath}`);

    // Write file
    const result = await writeSourceFile(filepath, content, options);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      path: result.path,
      backup: result.backup
    });

  } catch (error) {
    console.error('[API:File:Write] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
