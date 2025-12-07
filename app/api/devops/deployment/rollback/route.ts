import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { deploymentId, targetVersion, userId } = await req.json();
    const result = { success: true, rollback: { from: deploymentId, to: targetVersion, status: 'completed' }, timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
