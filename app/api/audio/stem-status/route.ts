/**
 * GET /api/audio/stem-status?jobId=xxx&provider=fal|replicate
 *
 * Poll for stem separation job status.
 * Returns stem URLs when ready.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId    = searchParams.get('jobId');
    const provider = searchParams.get('provider') ?? 'fal';

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    if (provider === 'fal') {
      const FAL_KEY = process.env.FAL_KEY;
      if (!FAL_KEY) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 503 });

      // FAL queue status — model can vary so we use the request-status endpoint
      const res = await fetch(`https://queue.fal.run/fal-ai/demucs/requests/${jobId}`, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      });

      if (!res.ok) {
        return NextResponse.json({ error: `FAL status check failed (${res.status})` }, { status: res.status });
      }

      const data = await res.json();

      const completed = data.status === 'COMPLETED' || !!data.vocals;
      const stems: Record<string, string> = {};

      if (completed) {
        for (const stem of ['vocals', 'drums', 'bass', 'other', 'piano', 'guitar']) {
          if (data[stem]?.url) stems[stem] = data[stem].url;
          else if (typeof data[stem] === 'string') stems[stem] = data[stem];
          // Check nested output
          if (data.output?.[stem]?.url) stems[stem] = data.output[stem].url;
        }
      }

      return NextResponse.json({
        jobId,
        provider: 'fal',
        status:    completed ? 'completed' : data.status === 'IN_QUEUE' ? 'queued' : 'processing',
        queuePosition: data.queue_position,
        stems:     completed ? stems : undefined,
        raw:       data.status,
      });
    }

    if (provider === 'replicate') {
      const REPLICATE_KEY = process.env.REPLICATE_API_KEY;
      if (!REPLICATE_KEY) return NextResponse.json({ error: 'REPLICATE_API_KEY not configured' }, { status: 503 });

      const res = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_KEY}` },
      });

      if (!res.ok) {
        return NextResponse.json({ error: `Replicate status check failed (${res.status})` }, { status: res.status });
      }

      const prediction = await res.json();
      const completed  = prediction.status === 'succeeded';
      const stems: Record<string, string> = {};

      if (completed && prediction.output) {
        for (const [key, value] of Object.entries(prediction.output)) {
          if (typeof value === 'string' && value.startsWith('http')) {
            stems[key] = value;
          }
        }
      }

      return NextResponse.json({
        jobId,
        provider:  'replicate',
        status:    completed ? 'completed' : prediction.status === 'failed' ? 'failed' : 'processing',
        error:     prediction.error,
        stems:     completed ? stems : undefined,
        logs:      prediction.logs,
      });
    }

    return NextResponse.json({ error: 'Unknown provider. Use: fal or replicate' }, { status: 400 });
  } catch (err: any) {
    console.error('[StemStatus] Error:', err);
    return NextResponse.json({ error: 'Status check failed', detail: err.message }, { status: 500 });
  }
}
