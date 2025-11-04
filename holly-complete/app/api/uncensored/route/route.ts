import { NextRequest, NextResponse } from 'next/server';
import { UncensoredRouter } from '@/lib/ai/uncensored-router';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const router = new UncensoredRouter();
    const recommendation = await router.routeRequest(prompt, context);

    return NextResponse.json({ success: true, recommendation });
  } catch (error: any) {
    console.error('Uncensored router API error:', error);
    return NextResponse.json(
      { error: error.message || 'Request routing failed' },
      { status: 500 }
    );
  }
}
