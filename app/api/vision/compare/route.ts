import { NextRequest, NextResponse } from 'next/server';
import { ComputerVision } from '@/lib/vision/computer-vision';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { imageUrl1, imageUrl2, comparisonPrompt } = body as any;

    if (!imageUrl1 || !imageUrl2) {
      return NextResponse.json(
        { error: 'Two image URLs are required for comparison' },
        { status: 400 }
      );
    }

    const vision = new ComputerVision();
    const result = await vision.compareImages(imageUrl1, imageUrl2, comparisonPrompt);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Vision comparison API error:', error);
    return NextResponse.json(
      { error: error.message || 'Image comparison failed' },
      { status: 500 }
    );
  }
}
