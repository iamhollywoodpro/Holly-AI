/**
 * PHASE 7: File System API - Search Endpoint
 * POST /api/system/file/search
 * Searches codebase for patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { searchCodebase } from '@/lib/system/file-system';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { query, filePattern, maxResults } = body;

    // Validate required fields
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Search codebase
    const results = await searchCodebase(query, {
      filePattern,
      maxResults: maxResults || 50
    });

    return NextResponse.json({
      success: true,
      results,
      totalMatches: results.length
    });

  } catch (error) {
    console.error('[API] Search error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
