/**
 * POST /api/music/extend
 *
 * Extends a Suno-generated song with additional sections.
 * Uses the Suno API "song extend" endpoint with a clipId.
 *
 * Body:
 * {
 *   clipId:        string   // Suno clip ID from the original generated track
 *   prompt?:       string   // Optional continuation prompt
 *   continueAt?:   number   // Seconds to continue from (default: end of clip)
 *   style?:        string   // Style override for the extension
 *   title?:        string   // Title for the extended track
 * }
 *
 * Returns: { success, data: { taskId } }  — same polling pattern as generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

const SUNO_API_BASE = 'https://api.sunoapi.org';
const SUNO_API_KEY  = process.env.SUNO_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!SUNO_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Music service not configured — add SUNO_API_KEY' },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { clipId, prompt, continueAt, style, title } = body;

    if (!clipId) {
      return NextResponse.json(
        { success: false, error: 'clipId is required' },
        { status: 400 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://holly.nexamusicgroup.com';

    // Build the extend request for Suno API
    const sunoRequest: Record<string, unknown> = {
      clipId,
      callBackUrl: `${baseUrl}/api/music/callback`,
    };

    if (prompt)      sunoRequest.prompt      = prompt;
    if (continueAt)  sunoRequest.continueAt  = continueAt;
    if (style)       sunoRequest.style       = style;
    if (title)       sunoRequest.title       = title;

    console.log('[Music Extend] Calling Suno extend API:', sunoRequest);

    const response = await fetch(`${SUNO_API_BASE}/api/v1/generate/extend`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(sunoRequest),
    });

    const data = await response.json();
    console.log('[Music Extend] Suno response:', data);

    if (!response.ok || data.code !== 200) {
      console.error('[Music Extend] Suno error:', data);
      return NextResponse.json(
        { success: false, error: data.msg ?? 'Failed to extend track' },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      data:    data.data,  // { taskId: "..." }
    });

  } catch (err: any) {
    console.error('[Music Extend] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
