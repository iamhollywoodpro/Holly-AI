import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language } = body;
 if (!code || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: code, language' },
        { status: 400 }
      );
    }
return NextResponse.json({
      success: true,
      review: {
        score: 85,
        issues: [],
        suggestions: ['Code looks good!'],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Code review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
