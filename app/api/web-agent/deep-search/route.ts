/**
 * Deep Web Search API Route
 * 
 * Powered by WebResearcher — Serper.dev (Google results) with DuckDuckGo fallback.
 * Comprehensive search with summarization and key insights.
 */
import { NextRequest, NextResponse } from 'next/server';
import { webResearcher } from '@/lib/research/web-researcher';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, maxResults, timeRange, type, topic, genre, artistName, niche, brandName } = body;

    if (!query && !topic) {
      return NextResponse.json({ error: 'query or topic is required' }, { status: 400 });
    }

    // Route to specialized research methods if context is provided
    if (genre && artistName) {
      const result = await webResearcher.researchCompetitors(artistName, genre);
      return NextResponse.json({ success: true, research: result, provider: result.provider });
    }

    if (genre && !query) {
      const result = await webResearcher.researchMusicTrends(genre);
      return NextResponse.json({ success: true, research: result, provider: result.provider });
    }

    if (niche) {
      const result = await webResearcher.researchMarketingStrategies(niche);
      return NextResponse.json({ success: true, research: result, provider: result.provider });
    }

    if (brandName) {
      const results = await webResearcher.monitorMentions(brandName);
      return NextResponse.json({ success: true, results });
    }

    // Standard search
    if (type === 'quick') {
      const results = await webResearcher.search({
        query: query || topic,
        maxResults: maxResults || 5,
        timeRange: timeRange || 'all',
      });
      return NextResponse.json({ success: true, results });
    }

    // Comprehensive research (default)
    const searchTopic = query || topic || '';
    const result = await webResearcher.researchTopic(searchTopic);
    return NextResponse.json({ success: true, research: result, provider: result.provider });
  } catch (error: any) {
    console.error('[Deep Search] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Deep search failed' },
      { status: 500 }
    );
  }
}
