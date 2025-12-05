/**
 * PHASE 7: File System API - List Directory Endpoint
 * GET /api/system/file/list?path=/src&recursive=true
 * Lists directory contents
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listDirectory } from '@/lib/system/file-system';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    const recursive = searchParams.get('recursive') === 'true';

    // Validate required fields
    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    // List directory
    const files = await listDirectory(path, recursive || false);

    return NextResponse.json({
      success: true,
      path,
      files,
      count: files.length
    });

  } catch (error) {
    console.error('[API] List directory error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list directory',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
