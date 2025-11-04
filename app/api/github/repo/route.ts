import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'GitHub integration not yet implemented',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GitHub repo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
