import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { interaction, userId } = await req.json();
    const result = { success: true, emotion: { detected: 'focused', confidence: 0.82, sentiment: 'neutral' }, timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
