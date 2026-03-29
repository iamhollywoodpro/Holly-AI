/**
 * POST /api/canva/create
 *
 * HOLLY → Canva design creation from chat.
 * Called when HOLLY detects a design request in chat (e.g. "make an Instagram post
 * for this track", "create a YouTube thumbnail for...").
 *
 * Body:
 * {
 *   type: 'instagram-post' | 'youtube-thumbnail' | 'presentation' | 'logo' | ...
 *   title?: string
 *   subtitle?: string
 *   bodyText?: string
 *   images?: string[]      // public image URLs
 *   colors?: string[]      // hex codes
 *   templateId?: string    // Canva template ID
 *   exportFormat?: 'PNG' | 'PDF' | 'JPG' | 'MP4' | 'GIF'
 * }
 *
 * Returns the design URL, edit link, thumbnail, and export URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { canvaIntegration } from '@/lib/design/canva-integration';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Canva is connected
    const connected = await canvaIntegration.isConnected(userId);
    if (!connected) {
      return NextResponse.json(
        {
          error:   'Canva not connected',
          authUrl: '/api/canva/auth',
          detail:  'Connect Canva via Settings → Integrations first.',
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      type = 'instagram-post',
      title,
      subtitle,
      bodyText,
      images,
      colors,
      templateId,
      exportFormat = 'PNG',
    } = body;

    const result = await canvaIntegration.createDesign(userId, {
      type,
      templateId,
      content: {
        title,
        subtitle,
        bodyText,
        images,
        colors,
      },
      exportFormat,
    });

    return NextResponse.json({
      success: true,
      design: {
        id:           result.designId,
        editUrl:      result.editUrl,
        viewUrl:      result.viewUrl,
        thumbnailUrl: result.thumbnailUrl,
        exportUrl:    result.exportUrl,
        format:       result.format,
        type,
        title:        title ?? 'HOLLY Design',
        createdAt:    new Date().toISOString(),
      },
      message: `✅ ${type} created in Canva! [Open in Canva](${result.editUrl})`,
    });
  } catch (err: any) {
    console.error('[Canva Create] Error:', err);

    // If token expired/invalid
    if (err.message?.includes('401') || err.message?.includes('invalid_token')) {
      return NextResponse.json(
        { error: 'Canva session expired', authUrl: '/api/canva/auth' },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create Canva design', detail: err.message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/canva/create
 * Quick-create shortcuts for common design types (called by HOLLY chat tools).
 *
 * Query params:
 *   template: instagram | youtube | presentation | logo | story
 *   title:    title text
 *   image:    background image URL
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const template = searchParams.get('template') ?? 'instagram';
  const title    = searchParams.get('title') ?? 'My Design';
  const image    = searchParams.get('image') ?? undefined;

  const typeMap: Record<string, any> = {
    instagram:    'instagram-post',
    youtube:      'youtube-thumbnail',
    presentation: 'presentation',
    logo:         'logo',
    story:        'story',
    tiktok:       'story',
    twitter:      'twitter-post',
    linkedin:     'linkedin-post',
  };

  const type = typeMap[template] ?? 'instagram-post';

  try {
    const connected = await canvaIntegration.isConnected(userId);
    if (!connected) {
      return NextResponse.redirect(new URL('/api/canva/auth', req.url));
    }

    const result = await canvaIntegration.createDesign(userId, {
      type,
      content: { title, images: image ? [image] : [] },
      exportFormat: 'PNG',
    });

    return NextResponse.redirect(new URL(result.editUrl, req.url));
  } catch (err: any) {
    console.error('[Canva Create GET] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
