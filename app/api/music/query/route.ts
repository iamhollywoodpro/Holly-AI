import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { queryMusic, isSunoConfigured } from '@/lib/suno-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Music Query API
 * Check the status of generated music tracks
 */
export async function GET(req: NextRequest) {
  try {
    // 1. AUTH - Only authenticated users can query music
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. CHECK SUNO CONFIGURATION
    if (!isSunoConfigured()) {
      return NextResponse.json(
        { error: 'SUNO API not configured' },
        { status: 500 }
      );
    }

    // 3. GET TRACK IDs FROM QUERY PARAMS
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'ids parameter required (comma-separated track IDs)' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => id.trim());

    console.log('[Music Query API] Querying tracks:', ids);

    // 4. QUERY MUSIC STATUS
    const result = await queryMusic(ids);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 5. RETURN RESULTS
    return NextResponse.json({
      success: true,
      tracks: result.data,
      count: result.data?.length || 0,
    });
  } catch (error: any) {
    console.error('[Music Query API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST endpoint for querying multiple tracks (alternative to GET)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. AUTH
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. CHECK SUNO CONFIGURATION
    if (!isSunoConfigured()) {
      return NextResponse.json(
        { error: 'SUNO API not configured' },
        { status: 500 }
      );
    }

    // 3. PARSE REQUEST
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'ids array required' },
        { status: 400 }
      );
    }

    console.log('[Music Query API] Querying tracks:', ids);

    // 4. QUERY MUSIC STATUS
    const result = await queryMusic(ids);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 5. RETURN RESULTS
    return NextResponse.json({
      success: true,
      tracks: result.data,
      count: result.data?.length || 0,
    });
  } catch (error: any) {
    console.error('[Music Query API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
