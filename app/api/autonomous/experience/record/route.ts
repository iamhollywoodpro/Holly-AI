import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { experience, category, learnings, userId } = await req.json();
    const result = {
      success: true, experienceId: 'exp_' + Date.now(), recorded: true,
      category, learnings, timestamp: new Date().toISOString()
    };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
