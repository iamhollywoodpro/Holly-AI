/**
 * PHASE 8: Extract Content Endpoint
 * POST /api/external/extract
 * Extract clean content from a web page
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { extractContent } from '@/lib/external/web-browser';

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
    const { url, contentType, timeout } = body;

    // Validate required fields
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Extract content
    const result = await extractContent(url, {
      contentType,
      timeout
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] Extract content error:', error);
    return NextResponse.json(
      { 
        error: 'Content extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
