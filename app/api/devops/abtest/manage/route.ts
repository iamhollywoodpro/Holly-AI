import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { testName, variants, userId } = await req.json();
    const result = { success: true, test: { name: testName, variants: variants || ['A', 'B'], status: 'active', traffic: '50/50' }, timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
