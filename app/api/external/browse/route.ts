/**
 * PHASE 8: Browse Web Endpoint
 * POST /api/external/browse
 * Browse a web page and return its content
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { browseWeb } from '@/lib/external/web-browser';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { url, timeout, headers, followRedirects } = body;

    // Validate required fields
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Browse the web page
    const result = await browseWeb(url, {
      timeout,
      headers,
      followRedirects
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] Browse error:', error);
    return NextResponse.json(
      { 
        error: 'Browse failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
