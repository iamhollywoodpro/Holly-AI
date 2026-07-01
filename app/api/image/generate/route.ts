import { NextRequest, NextResponse } from 'next/server';
import { requireAdult } from '@/lib/auth/require-adult';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // ── Defense in depth: gate here even though /generate-ultimate also gates.
    // Phase Q3 Gap 2a: every NSFW-capable image route enforces requireAdult()
    // at its own entry, so a future refactor that changes the proxy target
    // can't accidentally bypass the hard legal age gate.
    const gate = await requireAdult();
    if (gate instanceof NextResponse) return gate;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const response = await fetch(`${baseUrl}/api/image/generate-ultimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(req.headers.entries()),
      },
      body: await req.text(),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Image redirect error:', error);
    return NextResponse.json(
      { error: 'Image generation failed', details: error.message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'This endpoint redirects to /api/image/generate-ultimate',
    models: ['flux-schnell', 'flux-dev', 'sdxl', 'animagine', 'realistic', 'proteus'],
    status: 'active',
  });
}
