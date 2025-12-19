// Redirect route for backward compatibility
// Old UI components call /api/music/generate
// Redirect to new /api/music/generate-ultimate

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Forward to new endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/music/generate-ultimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Music redirect error:', error);
    return NextResponse.json(
      { error: 'Music generation failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for metadata
export async function GET() {
  return NextResponse.json({
    message: 'This endpoint redirects to /api/music/generate-ultimate',
    models: ['suno', 'musicgen', 'riffusion', 'audiocraft', 'audioldm'],
    primary: 'suno',
    status: 'active'
  });
}
