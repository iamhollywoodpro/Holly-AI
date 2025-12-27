// Music Generation Ultimate API
// High-quality music generation with SUNO integration

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  generateMusic,
  generateCustomMusic,
  generateInstrumental,
  isSunoConfigured,
} from '@/lib/suno-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // 1. AUTH - Only authenticated users can generate music
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. CHECK SUNO CONFIGURATION
    if (!isSunoConfigured()) {
      return NextResponse.json(
        { 
          error: 'SUNO API not configured',
          message: 'Please add SUNO_API_KEY to environment variables'
        },
        { status: 500 }
      );
    }

    // 3. PARSE REQUEST
    const body = await request.json();
    const { 
      prompt, 
      duration = 30, 
      style, 
      instrumental = false,
      mode = 'simple',
      lyrics,
      tags,
      title,
      model = 'chirp-v3-5'
    } = body;

    if (!prompt && !lyrics) {
      return NextResponse.json({ error: 'Prompt or lyrics required' }, { status: 400 });
    }

    console.log('[Music Ultimate API] Mode:', mode, 'Title:', title || 'Untitled');

    // 4. GENERATE MUSIC BASED ON MODE
    let result;

    switch (mode) {
      case 'simple':
        // Simple mode: Just a prompt
        result = await generateMusic({
          prompt: prompt || lyrics,
          make_instrumental: instrumental,
          wait_audio: false,
          model: model as 'chirp-v3-5' | 'chirp-v3-0',
          tags: tags || style || '',
          title: title || 'Untitled',
        });
        break;

      case 'custom':
        // Custom mode: Lyrics + style tags
        if (!lyrics) {
          return NextResponse.json(
            { error: 'Lyrics required for custom mode' },
            { status: 400 }
          );
        }
        result = await generateCustomMusic(
          lyrics,
          tags || style || 'pop',
          title || 'Untitled',
          instrumental
        );
        break;

      case 'instrumental':
        // Instrumental mode: Description + style tags
        result = await generateInstrumental(
          prompt || lyrics,
          tags || style || 'ambient',
          title || 'Untitled'
        );
        break;

      default:
        // Default to simple mode
        result = await generateMusic({
          prompt: prompt || lyrics,
          make_instrumental: instrumental,
          wait_audio: false,
          model: model as 'chirp-v3-5' | 'chirp-v3-0',
          tags: tags || style || '',
          title: title || 'Untitled',
        });
    }

    // 5. RETURN RESULT
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error,
        success: false 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tracks: result.data,
      message: 'Music generation started successfully',
      info: 'Track generation may take 1-2 minutes. Use the query endpoint to check status.',
    });
  } catch (error: any) {
    console.error('[Music Ultimate API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Music generation failed', success: false },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configured = isSunoConfigured();

    return NextResponse.json({
      success: true,
      configured,
      message: configured 
        ? 'SUNO music generation is ready' 
        : 'SUNO API key not configured',
      features: [
        'High-quality AI music generation',
        'Custom lyrics support',
        'Instrumental generation',
        'Multiple music styles',
        'chirp-v3-5 model (latest)',
        'chirp-v3-0 model (stable)'
      ],
      modes: ['simple', 'custom', 'instrumental'],
      models: ['chirp-v3-5', 'chirp-v3-0'],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get music features', success: false },
      { status: 500 }
    );
  }
}
