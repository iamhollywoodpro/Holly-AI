import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const { query, userId } = await req.json();
    const result = { success: true, results: [{ title: 'Relevant Doc 1', excerpt: 'Content snippet...', relevance: 0.89 }], totalResults: 12, timestamp: new Date().toISOString() };
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
