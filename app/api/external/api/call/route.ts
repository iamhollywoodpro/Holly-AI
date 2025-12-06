/**
 * PHASE 8: Call External API Endpoint
 * POST /api/external/api/call
 * Make a call to an external API
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { callAPI } from '@/lib/external/api-hub';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { apiName, url, method, headers, body: requestBody, timeout, auth: authConfig } = body;

    // Validate: either apiName or url must be provided
    if (!apiName && !url) {
      return NextResponse.json(
        { error: 'Either apiName or url is required' },
        { status: 400 }
      );
    }

    // Call the API
    const result = await callAPI({
      apiName,
      url,
      method,
      headers,
      body: requestBody,
      timeout,
      auth: authConfig
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] External API call error:', error);
    return NextResponse.json(
      { 
        error: 'API call failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
