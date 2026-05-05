import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sonautoProvider } from '@/lib/music/sonauto-provider';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!sonautoProvider.isConfigured) {
      return NextResponse.json(
        { success: false, error: 'Sonauto API not configured (SONAUTO_API_KEY missing)' },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { prompt, tags, lyrics, instrumental, num_songs, seed, waitForResult } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    console.log('[Sonauto API] Generation request:', { prompt: prompt.slice(0, 80), tags, instrumental, waitForResult });

    const { task_id } = await sonautoProvider.generate({
      prompt,
      tags,
      lyrics,
      instrumental: instrumental || false,
      num_songs: num_songs || 1,
      seed,
    });

    if (waitForResult) {
      console.log('[Sonauto API] Wait-for-result mode — polling until complete...');
      const { result, audioBuffers } = await sonautoProvider.generateAndWait({ prompt, tags, lyrics, instrumental, num_songs: num_songs || 1, seed });

      return NextResponse.json({
        success: true,
        provider: 'sonauto',
        data: {
          taskId: task_id,
          lyrics: result.lyrics,
          seed: result.seed,
          tags: result.tags,
          songPaths: result.song_paths,
          audioSizes: audioBuffers.map(b => b.length),
        },
      });
    }

    return NextResponse.json({
      success: true,
      provider: 'sonauto',
      data: { taskId: task_id },
    });
  } catch (error) {
    console.error('[Sonauto API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = req.nextUrl.searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json({ success: false, error: 'taskId is required' }, { status: 400 });
    }

    const status = await sonautoProvider.pollStatus(taskId);

    if (status === 'SUCCESS') {
      const result = await sonautoProvider.getResult(taskId);
      return NextResponse.json({
        success: true,
        status,
        data: {
          taskId,
          lyrics: result.lyrics,
          seed: result.seed,
          tags: result.tags,
          songPaths: result.song_paths,
        },
      });
    }

    if (status === 'FAILURE') {
      const result = await sonautoProvider.getResult(taskId).catch(() => null);
      return NextResponse.json({
        success: false,
        status,
        error: result?.error_message || 'Generation failed',
      });
    }

    return NextResponse.json({ success: true, status, taskId });
  } catch (error) {
    console.error('[Sonauto API] Status error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
