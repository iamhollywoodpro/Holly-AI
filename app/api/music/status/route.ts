import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const SUNO_API_BASE = 'https://api.sunoapi.org';
const SUNO_API_KEY = process.env.SUNOAPI_KEY;

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check API key
    if (!SUNO_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Music generation service not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'recordId is required' },
        { status: 400 }
      );
    }

    console.log('[Music Status API] Querying status for:', recordId);

    // Call SUNO API to get status
    const response = await fetch(
      `${SUNO_API_BASE}/api/v1/generate/record-info?recordId=${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
      }
    );

    const data = await response.json();
    console.log('[Music Status API] SUNO API response:', data);

    if (!response.ok || data.code !== 200) {
      console.error('[Music Status API] SUNO API error:', data);
      return NextResponse.json(
        { success: false, error: data.msg || 'Failed to query status' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    });

  } catch (error: any) {
    console.error('[Music Status API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
