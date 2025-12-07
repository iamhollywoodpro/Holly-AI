import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { action, userId } = await req.json();
    const result = { success: true, storage: { total: '500GB', used: '125GB', available: '375GB', action: action || 'status' }, timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
