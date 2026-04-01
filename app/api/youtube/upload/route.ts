/**
 * POST /api/youtube/upload
 *
 * Upload a video (from public URL) to the authenticated user's YouTube channel.
 * HOLLY auto-generates SEO-optimised title, description, and tags using Groq.
 *
 * Body:
 * {
 *   videoUrl:      string  // Public URL to MP4/video file
 *   title:         string  // Video title
 *   description?:  string  // Optional — HOLLY will generate one if omitted
 *   tags?:         string[] // Optional — HOLLY will suggest tags
 *   privacyStatus?: 'public' | 'private' | 'unlisted'
 *   trackName?:    string  // Song/track name for auto-description
 *   artistName?:   string  // For auto-description
 *   genre?:        string  // For auto-description
 *   autoSEO?:      boolean // Have HOLLY generate optimised metadata (default: true)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { getValidAccessToken, uploadVideoFromUrl } from '@/lib/music/youtube/youtube-client';

export const runtime  = 'nodejs';
export const maxDuration = 60; // Vercel Hobby cap — use Dokploy for unlimited

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

async function generateSEOMetadata(opts: {
  title: string; trackName?: string; artistName?: string; genre?: string;
}): Promise<{ description: string; tags: string[] }> {
  if (!groq) {
    return {
      description: `${opts.title}${opts.artistName ? ` by ${opts.artistName}` : ''}.\n\nSubscribe for more music!`,
      tags: ['music', opts.genre ?? 'pop', opts.artistName ?? '', opts.trackName ?? ''].filter(Boolean),
    };
  }

  const prompt = `You are a YouTube SEO expert for music artists. Generate optimised metadata for this video.

Track info:
- Title: ${opts.title}
- Artist: ${opts.artistName ?? 'Independent Artist'}
- Genre: ${opts.genre ?? 'Music'}
- Track name: ${opts.trackName ?? opts.title}

Return ONLY valid JSON (no markdown, no explanation):
{
  "description": "Full YouTube description (200-400 words). Include: hook line, song context, social links placeholder [ADD YOUR LINKS], call to action. Use natural keywords.",
  "tags": ["array", "of", "15-20", "relevant", "tags", "mix", "of", "broad", "and", "specific"]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model:    'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
    });
    const text = completion.choices[0]?.message?.content ?? '';
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return { description: json.description ?? '', tags: json.tags ?? [] };
  } catch {
    return {
      description: `${opts.title}${opts.artistName ? ` by ${opts.artistName}` : ''}\n\nSubscribe for more music!`,
      tags: ['music', opts.genre ?? 'pop'].filter(Boolean),
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json({
        error: 'YouTube not connected',
        authUrl: '/api/youtube/auth',
      }, { status: 403 });
    }

    const body = await req.json();
    const {
      videoUrl,
      title,
      description,
      tags,
      privacyStatus = 'public',
      trackName,
      artistName,
      genre,
      autoSEO = true,
    } = body;

    if (!videoUrl) return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    if (!title)    return NextResponse.json({ error: 'title is required' }, { status: 400 });

    // Generate SEO metadata if needed
    let finalDescription = description;
    let finalTags        = tags;

    if (autoSEO && (!description || !tags?.length)) {
      const seo = await generateSEOMetadata({ title, trackName, artistName, genre });
      finalDescription = description ?? seo.description;
      finalTags        = tags?.length ? tags : seo.tags;
    }

    console.log(`[YouTube Upload] Uploading "${title}" for user ${userId}`);

    const result = await uploadVideoFromUrl(accessToken, videoUrl, {
      title,
      description:   finalDescription ?? '',
      tags:          finalTags ?? [],
      categoryId:    '10', // Music
      privacyStatus: privacyStatus as 'public' | 'private' | 'unlisted',
    });

    console.log(`[YouTube Upload] Success: ${result.url}`);

    return NextResponse.json({
      success:     true,
      video:       result,
      seoMetadata: {
        description: finalDescription,
        tags:        finalTags,
      },
      message: `✅ "${title}" uploaded to YouTube! [Watch it here](${result.url})`,
    });

  } catch (err: any) {
    console.error('[YouTube Upload]', err);
    if (err.message?.includes('401')) {
      return NextResponse.json({ error: 'YouTube session expired', authUrl: '/api/youtube/auth' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Upload failed', detail: err.message }, { status: 500 });
  }
}
