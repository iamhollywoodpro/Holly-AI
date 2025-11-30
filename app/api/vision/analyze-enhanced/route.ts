import { NextRequest, NextResponse } from 'next/server';
import { MultiModelVision } from '@/lib/vision/multi-model-vision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Enhanced Vision API - Multi-Model Image Analysis
 * 
 * POST /api/vision/analyze-enhanced
 * 
 * Body:
 * {
 *   imageUrl: string,
 *   taskType?: 'general' | 'design-critique' | 'ocr' | 'comparison' | 'art-style',
 *   prompt?: string,
 *   useMultipleModels?: boolean
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      imageUrl, 
      taskType = 'general', 
      prompt, 
      useMultipleModels = false 
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const vision = new MultiModelVision();
    const result = await vision.analyzeImage(imageUrl, {
      taskType,
      prompt,
      useMultipleModels
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Enhanced vision API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Vision analysis failed',
        details: error.stack 
      },
      { status: 500 }
    );
  }
}

/**
 * Compare two images
 * 
 * POST /api/vision/analyze-enhanced?action=compare
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'status') {
    return NextResponse.json({
      status: 'online',
      models: [
        'gpt-4o-vision',
        'blip-large',
        'google-vision'
      ],
      capabilities: [
        'image-analysis',
        'design-critique',
        'ocr',
        'comparison',
        'art-style-analysis'
      ]
    });
  }

  return NextResponse.json({
    error: 'Invalid action. Use POST for analysis.'
  }, { status: 400 });
}
