/**
 * POST /api/creative/image/generate
 * Generate new image
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateImage } from '@/lib/creative/image-generator';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, options } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const result = await generateImage(userId, prompt, options || {});

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      assetId: result.assetId
    });
  } catch (error) {
    console.error('Error in generate image API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
