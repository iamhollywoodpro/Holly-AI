import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const SUNO_API_BASE = 'https://api.sunoapi.org';
const SUNO_API_KEY = process.env.SUNOAPI_KEY;

export async function POST(req: NextRequest) {
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
      console.error('[Music API] SUNOAPI_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Music generation service not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { prompt, style, title, instrumental = false, customMode = false } = body;

    console.log('[Music API] Generation request:', { prompt, style, title, instrumental, customMode });

    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Build request body for SUNO API
    const sunoRequest: any = {
      prompt,
      customMode,
      model: 'V4_5ALL',
    };

    if (customMode) {
      if (style) sunoRequest.style = style;
      if (title) sunoRequest.title = title;
      sunoRequest.instrumental = instrumental;
    }

    console.log('[Music API] Calling SUNO API:', sunoRequest);

    // Call SUNO API
    const response = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sunoRequest),
    });

    const data = await response.json();
    console.log('[Music API] SUNO API response:', data);

    if (!response.ok || data.code !== 200) {
      console.error('[Music API] SUNO API error:', data);
      return NextResponse.json(
        { success: false, error: data.msg || 'Failed to generate music' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data,
    });

  } catch (error: any) {
    console.error('[Music API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
