// ============================================
// MUSIC VIDEO CREATION API ROUTE
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { CreateMusicVideoRequest, CreateMusicVideoResponse } from '@/types/music';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Video generation API configuration (Gemini Veo 3)
const VIDEO_API_URL = 'https://api.google.com/video/generate'; // Example
const VIDEO_API_KEY = process.env.GOOGLE_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body: CreateMusicVideoRequest = await request.json() as any;
    const { song_id, style_prompt, use_artist_likeness = false } = body as any;

    if (!song_id || !style_prompt) {
      return NextResponse.json(
        { error: 'song_id and style_prompt are required' },
        { status: 400 }
      );
    }

    // Get user ID
    const userId = request.headers.get('x-user-id') || 'default-user';

    // Get song details
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select(`
        *,
        artist:artists(*)
      `)
      .eq('id', song_id)
      .single();

    if (songError || !song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      );
    }

    // Create music video record
    const { data: video, error: videoError } = await supabase
      .from('music_videos')
      .insert({
        song_id: song_id,
        user_id: userId,
        title: `${song.title} - Music Video`,
        style_prompt: style_prompt,
        generation_status: 'processing',
      })
      .select()
      .single();

    if (videoError) {
      console.error('Database error:', videoError);
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      );
    }

    // Build enhanced prompt with artist likeness
    let enhancedPrompt = style_prompt;
    
    if (use_artist_likeness && song.artist?.avatar_url) {
      enhancedPrompt = `${style_prompt}. Feature an artist with characteristics similar to the provided reference image. Maintain consistent appearance throughout the video.`;
    }

    // Add music context to prompt
    enhancedPrompt += ` Music style: ${song.style}. Language: ${song.language}. Create a visually compelling music video that matches the emotional tone and cultural context of the song.`;

    // Prepare video generation request
    const videoGenRequest = {
      prompt: enhancedPrompt,
      duration: song.duration || 180, // Use song duration or default to 3 minutes
      audio_url: song.audio_url,
      aspect_ratio: '16:9',
      fps: 30,
      reference_images: use_artist_likeness && song.artist?.avatar_url 
        ? [song.artist.avatar_url] 
        : [],
      style: 'cinematic',
    };

    try {
      // Note: This is a placeholder for actual video generation API
      // In production, you would integrate with:
      // - Gemini Veo 3 for high-quality video
      // - Runway Gen-4 for fast generation
      // - Or your video_generation tool

      // For now, create a mock response
      const mockVideoUrl = `https://storage.googleapis.com/mock-videos/${video.id}.mp4`;
      const estimatedCompletion = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      // Update video record with generation info
      await supabase
        .from('music_videos')
        .update({
          video_generation_metadata: videoGenRequest,
        })
        .eq('id', video.id);

      const response: CreateMusicVideoResponse = {
        video_id: video.id,
        status: 'processing',
        estimated_completion: estimatedCompletion,
      };

      return NextResponse.json(response);

    } catch (genError) {
      console.error('Video generation error:', genError);

      // Update status to failed
      await supabase
        .from('music_videos')
        .update({
          generation_status: 'failed',
        })
        .eq('id', video.id);

      return NextResponse.json(
        {
          error: 'Failed to generate music video',
          details: genError instanceof Error ? genError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Music video creation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET: Check video generation status
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('video_id');

    if (!videoId) {
      return NextResponse.json(
        { error: 'video_id is required' },
        { status: 400 }
      );
    }

    const { data: video, error } = await supabase
      .from('music_videos')
      .select(`
        *,
        song:songs(*)
      `)
      .eq('id', videoId)
      .single();

    if (error || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      video_id: video.id,
      status: video.generation_status,
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url,
      song: video.song,
    });

  } catch (error) {
    console.error('Video status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
