import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'GitHub commit not yet implemented',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GitHub commit error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
