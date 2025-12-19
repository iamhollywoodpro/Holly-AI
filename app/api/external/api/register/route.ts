/**
 * PHASE 8: Register API Endpoint
 * POST /api/external/api/register
 * Register a new API integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { registerAPI } from '@/lib/external/api-hub';

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
    const { name, description, baseUrl, authType, headers, rateLimit, status, createdBy } = body;

    // Validate required fields
    if (!name || !description || !baseUrl || !authType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, baseUrl, authType' },
        { status: 400 }
      );
    }

    // Register the API
    const result = await registerAPI({
      name,
      description,
      baseUrl,
      authType,
      headers,
      rateLimit,
      status,
      createdBy
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        id: result.id,
        message: 'API registered successfully'
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('[API] Register API error:', error);
    return NextResponse.json(
      { 
        error: 'API registration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
