// Redirect route for backward compatibility
// Old UI components call /api/image/generate
// Redirect to new /api/image/generate-ultimate

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Forward to new endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/image/generate-ultimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Return the blob directly
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error: any) {
    console.error('❌ Image redirect error:', error);
    return NextResponse.json(
      { error: 'Image generation failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for metadata
export async function GET() {
  return NextResponse.json({
    message: 'This endpoint redirects to /api/image/generate-ultimate',
    models: ['flux-schnell', 'flux-dev', 'sdxl', 'animagine', 'realistic', 'proteus'],
    status: 'active'
  });
}
