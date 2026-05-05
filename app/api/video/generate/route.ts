// Redirect route for backward compatibility
// Old UI components call /api/video/generate
// Redirect to new /api/video/generate-ultimate

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Forward to new endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/video/generate-ultimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Video redirect error:', error);
    return NextResponse.json(
      { error: 'Video generation failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for metadata
export async function GET() {
  return NextResponse.json({
    message: 'This endpoint redirects to /api/video/generate-ultimate',
    models: ['zeroscope-v2', 'animatediff', 'cogvideo', 'modelscope', 'lavie'],
    status: 'active'
  });
}
