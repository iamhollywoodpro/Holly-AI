import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { goal, deadline, userId } = await req.json();
    const result = { success: true, goalId: 'goal_' + Date.now(), goal, deadline, status: 'active', timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
