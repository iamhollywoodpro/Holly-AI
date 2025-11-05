import { NextRequest, NextResponse } from 'next/server';
import { ComputerVision } from '@/lib/vision/computer-vision';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { imageUrl, analysisType, prompt } = body as any;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const vision = new ComputerVision();
    let result;

    switch (analysisType) {
      case 'design-review':
        result = await vision.reviewDesign(imageUrl, prompt);
        break;
      case 'ocr':
        result = await vision.extractText(imageUrl);
        break;
      case 'art-style':
        result = await vision.analyzeArtStyle(imageUrl);
        break;
      case 'general':
      default:
        result = await vision.analyzeImage({ imageUrl, prompt });
        break;
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Vision API error:', error);
    return NextResponse.json(
      { error: error.message || 'Vision analysis failed' },
      { status: 500 }
    );
  }
}
