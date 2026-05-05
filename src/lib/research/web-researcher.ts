/**
 * Web Research System - 100% FREE
 *
 * Priority order:
 *   1. Serper.dev   — Google Search API, 2,500 free queries/month, no credit card
 *                     Set SERPER_API_KEY in env vars  →  https://serper.dev
 *   2. DuckDuckGo   — Instant Answer API, completely free, no key required
 *   3. Deep-reason  — Falls back to LLM knowledge when both APIs are unavailable
 */

export interface ResearchQuery {
  query: string;
  maxResults?: number;
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  type?: 'general' | 'news' | 'videos' | 'images';
}

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  source?: string;
}

export interface ResearchSummary {
  query: string;
  results: ResearchResult[];
  summary: string;
  keyInsights: string[];
  sources: string[];
  timestamp: Date;
  provider?: string;
}

export class WebResearcher {
  private serperKey: string;

  constructor() {
    // Serper.dev: 2,500 free queries/month — https://serper.dev (no credit card)
    this.serperKey = process.env.SERPER_API_KEY || '';
  }

  // ── Primary: Serper.dev (Google results) ───────────────────────────────────
  private async searchSerper(query: ResearchQuery): Promise<ResearchResult[]> {
    if (!this.serperKey) return [];

    const body: Record<string, unknown> = {
      q:   query.query,
      num: query.maxResults ?? 10,
    };
    if (query.type === 'news') body['type'] = 'news';
    if (query.timeRange && query.timeRange !== 'all') {
      // Serper accepts tbs=qdr:d/w/m/y
      const tbs: Record<string, string> = { day: 'qdr:d', week: 'qdr:w', month: 'qdr:m', year: 'qdr:y' };
      if (tbs[query.timeRange]) body['tbs'] = tbs[query.timeRange];
    }

    const res = await fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: { 'X-API-KEY': this.serperKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Serper ${res.status}`);

    const data = await res.json() as {
      organic?:    Array<{ title: string; snippet: string; link: string; date?: string }>;
      news?:       Array<{ title: string; snippet: string; link: string; date?: string }>;
      answerBox?:  { answer?: string; title?: string };
    };

    const rawResults = query.type === 'news' ? (data.news ?? data.organic ?? []) : (data.organic ?? []);

    return rawResults.map(r => ({
      title:         r.title,
      url:           r.link,
      snippet:       r.snippet ?? '',
      publishedDate: r.date,
      source:        (() => { try { return new URL(r.link).hostname; } catch { return r.link; } })(),
    }));
  }

  // ── Fallback: DuckDuckGo Instant Answer (no key, always free) ──────────────
  private async searchDuckDuckGo(query: ResearchQuery): Promise<ResearchResult[]> {
    const params = new URLSearchParams({
      q:              query.query,
      format:         'json',
      no_redirect:    '1',
      no_html:        '1',
      skip_disambig:  '1',
    });

    const res = await fetch(`https://api.duckduckgo.com/?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal:  AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`DuckDuckGo ${res.status}`);

    const data = await res.json() as {
      AbstractText?:   string;
      AbstractURL?:    string;
      AbstractSource?: string;
      RelatedTopics?:  Array<{ Text?: string; FirstURL?: string }>;
    };

    const results: ResearchResult[] = [];
    if (data.AbstractText) {
      results.push({
        title:   data.AbstractSource ?? 'DuckDuckGo',
        url:     data.AbstractURL ?? '',
        snippet: data.AbstractText,
        source:  data.AbstractSource,
      });
    }

    (data.RelatedTopics ?? [])
      .filter(t => t.Text)
      .slice(0, (query.maxResults ?? 10) - 1)
      .forEach(t => {
        results.push({
          title:   t.Text!.split(' - ')[0] ?? 'Related',
          url:     t.FirstURL ?? '',
          snippet: t.Text!,
          source:  'DuckDuckGo',
        });
      });

    return results;
  }

  /**
   * Search the web — tries Serper first, falls back to DuckDuckGo
   */
  async search(query: ResearchQuery): Promise<ResearchResult[]> {
    if (this.serperKey) {
      try {
        const results = await this.searchSerper(query);
        if (results.length > 0) return results;
      } catch (err) {
        console.warn('[WebResearcher] Serper failed, trying DuckDuckGo:', err);
      }
    }

    try {
      const results = await this.searchDuckDuckGo(query);
      if (results.length > 0) return results;
    } catch (err) {
      console.warn('[WebResearcher] DuckDuckGo failed:', err);
    }

    return [];   // caller handles empty array
  }

  /**
   * Research a topic comprehensively
   */
  async researchTopic(topic: string, context?: string): Promise<ResearchSummary> {
    const searchQuery = context ? `${topic} ${context}` : topic;

    const [generalResults, recentResults] = await Promise.allSettled([
      this.search({ query: searchQuery, maxResults: 10, type: 'general' }),
      this.search({ query: `${topic} latest trends news`, maxResults: 5, timeRange: 'week', type: 'news' }),
    ]);

    const allResults = [
      ...(generalResults.status === 'fulfilled' ? generalResults.value : []),
      ...(recentResults.status  === 'fulfilled' ? recentResults.value  : []),
    ];

    const summary     = await this.generateSummary(topic, allResults);
    const keyInsights = await this.extractKeyInsights(allResults);
    const provider    = this.serperKey ? 'Serper/Google' : 'DuckDuckGo';

    return {
      query: topic,
      results: allResults,
      summary,
      keyInsights,
      sources:   allResults.map(r => r.url),
      timestamp: new Date(),
      provider,
    };
  }

  async researchMusicTrends(genre?: string): Promise<ResearchSummary> {
    const query = genre
      ? `${genre} music trends 2025 playlist streaming`
      : 'music industry trends 2025 streaming playlists';
    return this.researchTopic(query, 'music industry analysis');
  }

  async researchPlaylistCurators(genre: string): Promise<ResearchResult[]> {
    return this.search({ query: `${genre} spotify playlist curators submit music`, maxResults: 15 });
  }

  async researchCompetitors(artistName: string, genre: string): Promise<ResearchSummary> {
    return this.researchTopic(`${genre} artists similar to ${artistName}`, 'music marketing strategy');
  }

  async findSyncOpportunities(musicStyle: string): Promise<ResearchResult[]> {
    return this.search({ query: `${musicStyle} sync licensing opportunities music placement`, maxResults: 10 });
  }

  async researchMarketingStrategies(niche: string): Promise<ResearchSummary> {
    return this.researchTopic(`${niche} marketing strategies 2025`, 'digital marketing trends');
  }

  async findRelevantMedia(topic: string): Promise<ResearchResult[]> {
    return this.search({ query: `${topic} blogs publications media outlets`, maxResults: 20 });
  }

  async trackTrendingTopics(category: string): Promise<ResearchResult[]> {
    return this.search({ query: `${category} trending now popular viral`, maxResults: 10, timeRange: 'day' });
  }

  async monitorMentions(brandName: string): Promise<ResearchResult[]> {
    return this.search({ query: `"${brandName}"`, maxResults: 20, timeRange: 'week' });
  }

  async findCollaborators(type: string, genre?: string): Promise<ResearchResult[]> {
    const query = genre
      ? `${genre} ${type} collaboration seeking musicians`
      : `${type} collaboration opportunities music`;
    return this.search({ query, maxResults: 15 });
  }

  async researchKeywords(topic: string): Promise<string[]> {
    const results = await this.search({ query: `${topic} keywords seo search terms`, maxResults: 10 });
    const keywords: Set<string> = new Set();
    results.forEach(result => {
      result.title.toLowerCase().split(/\W+/).forEach(word => {
        if (word.length > 4) keywords.add(word);
      });
    });
    return Array.from(keywords).slice(0, 20);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────
  private async generateSummary(topic: string, results: ResearchResult[]): Promise<string> {
    const allContent = results.map(r => `${r.title}: ${r.snippet}`).join('\n\n');
    return `Research summary for "${topic}":\n\nBased on ${results.length} sources:\n${allContent.slice(0, 500)}...`;
  }

  private async extractKeyInsights(results: ResearchResult[]): Promise<string[]> {
    return results.slice(0, 5)
      .filter(r => r.snippet.length > 50)
      .map(r => r.snippet.split('.')[0]);
  }
}

// Export singleton instance
export const webResearcher = new WebResearcher();
