import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { userId, ...data } = await req.json();
    const result = { success: true, action: 'decide', processed: true, timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
