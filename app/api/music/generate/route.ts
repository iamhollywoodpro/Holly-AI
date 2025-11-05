// ============================================
// SUNO SONG GENERATION API ROUTE (SunoAPI.org)
// ============================================
// Documentation: https://sunoapi.org/docs
// API Base URL: https://api.sunoapi.org/api/v1

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { GenerateSongRequest, GenerateSongResponse } from '@/types/music';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const SUNO_API_KEY = process.env.SUNO_API_KEY || 'c3367b96713745a2de3b1f8e1dde4787';
const SUNO_BASE_URL = process.env.SUNO_BASE_URL || 'https://api.sunoapi.org/api/v1';

// Helper function to poll SunoAPI.org for generation status
async function pollSunoStatus(clipIds: string[], maxAttempts = 60, delayMs = 5000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${SUNO_BASE_URL}/query?ids=${clipIds.join(',')}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Query API error: ${response.statusText}`);
      }

      const clips = await response.json() as any;
      
      // Check if all clips are complete or failed
      const allComplete = clips.every((clip: any) => 
        clip.status === 'complete' || clip.status === 'error'
      );

      if (allComplete) {
        return clips;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      console.error(`Poll attempt ${attempt + 1} failed:`, error);
      if (attempt === maxAttempts - 1) throw error;
    }
  }

  throw new Error('Generation timeout - exceeded maximum polling attempts');
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateSongRequest = await request.json() as any;
    const { lyrics, style, language, artist_id, title } = body as any;

    // Validate input
    if (!lyrics && !style) {
      return NextResponse.json(
        { error: 'Either lyrics or style is required' },
        { status: 400 }
      );
    }

    // Get user ID from auth header or session
    const userId = request.headers.get('x-user-id') || 'default-user';

    // Create song record in database
    const { data: song, error: dbError } = await supabase
      .from('songs')
      .insert({
        user_id: userId,
        title: title || `Untitled Song ${new Date().toISOString().split('T')[0]}`,
        artist_id: artist_id || null,
        lyrics: lyrics || '',
        style: style,
        language: language || 'en',
        generation_status: 'processing',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create song record' },
        { status: 500 }
      );
    }

    // Call SunoAPI.org to generate song
    try {
      const sunoResponse = await fetch(`${SUNO_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || 'Untitled',
          prompt: lyrics || `Create a ${style} song`,
          tags: style || 'pop',
          make_instrumental: !lyrics,
          custom_mode: false,
        }),
      });

      if (!sunoResponse.ok) {
        const errorText = await sunoResponse.text();
        throw new Error(`SunoAPI.org error: ${sunoResponse.statusText} - ${errorText}`);
      }

      const sunoData = await sunoResponse.json();
      console.log('SunoAPI.org response:', sunoData);

      // SunoAPI.org returns array of clips
      if (!sunoData || sunoData.length === 0) {
        throw new Error('No clips returned from SunoAPI.org');
      }

      // Get clip IDs for polling
      const clipIds = sunoData.map((clip: any) => clip.id);

      // Update song with initial Suno data
      await supabase
        .from('songs')
        .update({
          suno_song_id: clipIds[0], // Use first clip ID
          suno_metadata: sunoData,
          generation_status: 'processing',
        })
        .eq('id', song.id);

      // Poll for completion (this will wait until songs are ready)
      const completedClips = await pollSunoStatus(clipIds);
      
      // Get the first completed clip
      const primaryClip = completedClips[0];

      // Update song with final data
      const { error: updateError } = await supabase
        .from('songs')
        .update({
          generation_status: primaryClip.status === 'complete' ? 'complete' : 'failed',
          audio_url: primaryClip.audio_url,
          artwork_url: primaryClip.image_url || primaryClip.image_large_url,
          duration: primaryClip.duration || 0,
          suno_metadata: completedClips, // Store all clips
        })
        .eq('id', song.id);

      if (updateError) {
        console.error('Failed to update song with final Suno data:', updateError);
      }

      const response: GenerateSongResponse = {
        song_id: song.id,
        status: primaryClip.status === 'complete' ? 'complete' : 'failed',
        message: primaryClip.status === 'complete' 
          ? 'Song generated successfully' 
          : 'Song generation failed',
        audio_url: primaryClip.audio_url,
        artwork_url: primaryClip.image_url || primaryClip.image_large_url,
      };

      return NextResponse.json(response);

    } catch (sunoError) {
      console.error('SunoAPI.org error:', sunoError);

      // Update song status to failed
      await supabase
        .from('songs')
        .update({
          generation_status: 'failed',
        })
        .eq('id', song.id);

      return NextResponse.json(
        {
          error: 'Failed to generate song with SunoAPI.org',
          details: sunoError instanceof Error ? sunoError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Song generation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET: Check generation status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const songId = url.searchParams.get('song_id');

    if (!songId) {
      return NextResponse.json(
        { error: 'song_id is required' },
        { status: 400 }
      );
    }

    const { data: song, error } = await supabase
      .from('songs')
      .select('*')
      .eq('id', songId)
      .single();

    if (error || !song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      song_id: song.id,
      status: song.generation_status,
      audio_url: song.audio_url,
      artwork_url: song.artwork_url,
      duration: song.duration,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
