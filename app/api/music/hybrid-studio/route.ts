import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sonautoProvider } from '@/lib/music/sonauto-provider';

export const runtime = 'nodejs';
export const maxDuration = 600;

const SUNO_API_BASE = 'https://api.sunoapi.org';
const SUNO_API_KEY = process.env.SUNO_API_KEY;

type Phase = 'lyrics' | 'instrumental' | 'vocals' | 'assembly' | 'complete';

interface HybridStudioState {
  phase: Phase;
  prompt: string;
  style: string;
  tags: string[];
  lyrics?: string;
  instrumentalTaskId?: string;
  instrumentalAudioUrl?: string;
  instrumentalBuffer?: Buffer;
  vocalTaskId?: string;
  vocalAudioUrl?: string;
  vocalBuffer?: Buffer;
  finalAudioUrl?: string;
  producerTag?: string;
  error?: string;
}

async function phaseLyrics(state: HybridStudioState): Promise<HybridStudioState> {
  console.log('[Hybrid Studio] Phase 1: Writing Room — generating lyrics...');

  if (!sonautoProvider.isConfigured) {
    throw new Error('Sonauto API not configured');
  }

  const { task_id } = await sonautoProvider.generate({
    prompt: state.prompt,
    tags: state.tags,
    num_songs: 1,
  });

  console.log(`[Hybrid Studio] Lyrics generation started — task: ${task_id}`);
  const result = await sonautoProvider.waitForCompletion(task_id, 300_000);

  const lyrics = result.lyrics || '';
  if (!lyrics) {
    throw new Error('Sonauto returned no lyrics');
  }

  console.log(`[Hybrid Studio] ✅ Lyrics generated — ${lyrics.length} chars`);
  return { ...state, phase: 'instrumental', lyrics };
}

async function phaseInstrumental(state: HybridStudioState): Promise<HybridStudioState> {
  console.log('[Hybrid Studio] Phase 2: Instrumental Bed — generating stems...');

  const { task_id } = await sonautoProvider.generate({
    prompt: `Instrumental only: ${state.prompt}`,
    tags: [...(state.tags || []), 'instrumental'],
    instrumental: true,
    num_songs: 1,
  });

  console.log(`[Hybrid Studio] Instrumental generation started — task: ${task_id}`);
  const result = await sonautoProvider.waitForCompletion(task_id, 300_000);

  const audioUrl = result.song_paths[0];
  if (!audioUrl) {
    throw new Error('Sonauto returned no instrumental audio');
  }

  const instrumentalBuffer = await sonautoProvider.downloadAudio(audioUrl);
  console.log(`[Hybrid Studio] ✅ Instrumental downloaded — ${instrumentalBuffer.length} bytes`);

  return {
    ...state,
    phase: 'vocals',
    instrumentalTaskId: task_id,
    instrumentalAudioUrl: audioUrl,
    instrumentalBuffer,
  };
}

async function phaseVocals(state: HybridStudioState): Promise<HybridStudioState> {
  console.log('[Hybrid Studio] Phase 3: Vocal Topline — feeding instrumental + lyrics to SUNO...');

  if (!SUNO_API_KEY) {
    throw new Error('SUNO API key not configured — required for vocal generation');
  }

  const sunoRequest: Record<string, unknown> = {
    customMode: true,
    instrumental: false,
    model: 'V5_5',
    prompt: state.lyrics,
    style: state.style || state.tags?.join(', ') || '',
    title: 'HOLLY Hybrid Studio',
    audioInputUrl: state.instrumentalAudioUrl,
  };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://holly.nexamusicgroup.com';
  sunoRequest.callBackUrl = `${baseUrl}/api/music/callback`;

  console.log(`[Hybrid Studio] Calling SUNO Audio-to-Audio with instrumental from Sonauto...`);

  const response = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUNO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sunoRequest),
  });

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    const errorMsg = data.message || data.error || `SUNO error ${response.status}`;
    console.error('[Hybrid Studio] SUNO vocal generation failed:', errorMsg);

    return {
      ...state,
      phase: 'complete',
      error: `Vocal generation failed: ${errorMsg}. Instrumental is still available.`,
      finalAudioUrl: state.instrumentalAudioUrl,
    };
  }

  const taskId = data.data?.taskId || data.data?.id;
  console.log(`[Hybrid Studio] SUNO vocal generation started — task: ${taskId}`);

  return {
    ...state,
    phase: 'assembly',
    vocalTaskId: taskId,
  };
}

async function phaseAssembly(state: HybridStudioState): Promise<HybridStudioState> {
  console.log('[Hybrid Studio] Phase 4: Final Assembly — combining assets...');

  const assets: string[] = [];
  if (state.instrumentalAudioUrl) assets.push(`Instrumental (Sonauto): ${state.instrumentalAudioUrl}`);
  if (state.vocalAudioUrl) assets.push(`Vocals (SUNO): ${state.vocalAudioUrl}`);

  console.log(`[Hybrid Studio] ✅ Assembly complete — ${assets.length} assets ready`);

  return {
    ...state,
    phase: 'complete',
    finalAudioUrl: state.vocalAudioUrl || state.instrumentalAudioUrl,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, style, tags, producerTag, stopAtPhase } = body;

    if (!prompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    console.log(`[Hybrid Studio] Starting pipeline: "${prompt.slice(0, 60)}..." style=${style} tags=${tags?.join(',')}`);

    let state: HybridStudioState = {
      phase: 'lyrics',
      prompt,
      style: style || '',
      tags: tags || [],
      producerTag,
    };

    state = await phaseLyrics(state);
    if (stopAtPhase === 'lyrics') {
      return NextResponse.json({ success: true, phase: 'lyrics', data: { lyrics: state.lyrics } });
    }

    state = await phaseInstrumental(state);
    if (stopAtPhase === 'instrumental') {
      return NextResponse.json({
        success: true,
        phase: 'instrumental',
        data: {
          lyrics: state.lyrics,
          instrumentalUrl: state.instrumentalAudioUrl,
          instrumentalSize: state.instrumentalBuffer?.length,
        },
      });
    }

    state = await phaseVocals(state);

    if (state.phase === 'assembly') {
      state = await phaseAssembly(state);
    }

    return NextResponse.json({
      success: true,
      phase: state.phase,
      data: {
        lyrics: state.lyrics,
        instrumentalUrl: state.instrumentalAudioUrl,
        vocalTaskId: state.vocalTaskId,
        finalAudioUrl: state.finalAudioUrl,
        producerTag: state.producerTag,
        error: state.error,
      },
    });
  } catch (error) {
    console.error('[Hybrid Studio] Pipeline error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
