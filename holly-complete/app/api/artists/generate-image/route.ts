// ============================================
// ARTIST IMAGE GENERATION API ROUTE
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { GenerateArtistImageRequest, GenerateArtistImageResponse } from '@/types/music';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// FAL.AI API configuration
const FAL_API_KEY = process.env.FAL_API_KEY || '';
const FAL_API_URL = 'https://fal.run/fal-ai/flux-pro/ultra';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateArtistImageRequest = await request.json();
    const { artist_id, prompt, use_artist_style = true } = body;

    if (!artist_id) {
      return NextResponse.json(
        { error: 'artist_id is required' },
        { status: 400 }
      );
    }

    // Get artist details
    const { data: artist, error: artistError } = await supabase
      .from('artists')
      .select('*')
      .eq('id', artist_id)
      .single();

    if (artistError || !artist) {
      return NextResponse.json(
        { error: 'Artist not found' },
        { status: 404 }
      );
    }

    // Build image generation prompt
    let imagePrompt = prompt || artist.image_generation_prompt;

    if (!imagePrompt && use_artist_style) {
      // Generate default prompt based on artist style
      const styles = artist.style_preferences || [];
      const vocal = artist.vocal_characteristics || {};
      
      imagePrompt = `Professional portrait of a ${vocal.range || 'mid-range'} ${styles.join('/')} artist, ${vocal.tone || 'confident'} expression, studio lighting, high quality, 4K, photorealistic`;
    }

    if (!imagePrompt) {
      imagePrompt = 'Professional portrait of a music artist, studio lighting, high quality, 4K, photorealistic';
    }

    // Generate image with flux-pro/ultra
    const generateResponse = await fetch(FAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        image_size: 'square',
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'jpeg',
      }),
    });

    if (!generateResponse.ok) {
      throw new Error(`Image generation API error: ${generateResponse.statusText}`);
    }

    const generateData = await generateResponse.json();
    const imageUrl = generateData.images?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from generation API');
    }

    // Download image
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `${artist_id}-${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('artist-avatars')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload image to storage');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('artist-avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Update artist with new avatar
    const { error: updateError } = await supabase
      .from('artists')
      .update({
        avatar_url: avatarUrl,
        image_generation_prompt: imagePrompt,
      })
      .eq('id', artist_id);

    if (updateError) {
      console.error('Failed to update artist:', updateError);
    }

    const response: GenerateArtistImageResponse = {
      avatar_url: avatarUrl,
      generation_metadata: {
        prompt: imagePrompt,
        model: 'flux-pro/ultra',
        generated_at: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Artist image generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate artist image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
