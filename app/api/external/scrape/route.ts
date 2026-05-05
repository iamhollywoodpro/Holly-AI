/**
 * PHASE 8: Scrape Web Endpoint
 * POST /api/external/scrape
 * Scrape specific data from a web page using selectors
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { scrapeData } from '@/lib/external/web-browser';

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
    const { url, selectors, timeout } = body;

    // Validate required fields
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    if (!selectors) {
      return NextResponse.json(
        { error: 'Selectors are required' },
        { status: 400 }
      );
    }

    // Scrape the data
    const result = await scrapeData(url, {
      selectors,
      timeout
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] Scrape error:', error);
    return NextResponse.json(
      { 
        error: 'Scrape failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
