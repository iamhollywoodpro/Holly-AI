import { NextRequest, NextResponse } from 'next/server';
import { WebResearcher } from '@/lib/research/web-researcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { query, type = 'general', depth = 'comprehensive' } = body as any;

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
        result = await researcher.trackTrendingTopics(query);
        break;
      case 'competitor':
        result = await researcher.researchCompetitors(query, '');
        break;
      case 'general':
      default:
        result = await researcher.researchTopic(query);
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
