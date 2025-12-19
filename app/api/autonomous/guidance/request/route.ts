import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { situation, question, userId } = await req.json();
    const result = { success: true, requestId: 'req_' + Date.now(), situation, question, status: 'pending_human_response', timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
