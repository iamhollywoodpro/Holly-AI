import { NextRequest, NextResponse } from 'next/server';
import { WebResearcher } from '@/lib/research/web-researcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, type = 'general', depth = 'comprehensive' } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const researcher = new WebResearcher();
    let result;

    switch (type) {
      case 'trend':
        result = await researcher.analyzeTrends(query);
        break;
      case 'competitor':
        result = await researcher.competitorResearch(query);
        break;
      case 'general':
      default:
        result = await researcher.research(query, depth as 'quick' | 'comprehensive');
        break;
    }

    return NextResponse.json({ success: true, research: result });
  } catch (error: any) {
    console.error('Web research API error:', error);
    return NextResponse.json(
      { error: error.message || 'Web research failed' },
      { status: 500 }
    );
  }
}
