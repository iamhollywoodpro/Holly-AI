/**
 * Web Research System - 100% FREE
 * Uses Brave Search API (free tier) + web scraping
 * 
 * Allows HOLLY to research trends, gather information, stay current
 * "Holly, research current playlist trends for my genre"
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
}

export class WebResearcher {
  private braveKey: string;

  constructor() {
    // Brave Search API has generous free tier (2000 queries/month)
    this.braveKey = process.env.BRAVE_API_KEY || '';
  }

  /**
   * Search the web using Brave Search API (FREE)
   */
  async search(query: ResearchQuery): Promise<ResearchResult[]> {
    const params = new URLSearchParams({
      q: query.query,
      count: (query.maxResults || 10).toString(),
      search_lang: 'en',
      result_filter: 'web'
    });

    if (query.timeRange && query.timeRange !== 'all') {
      params.append('freshness', query.timeRange);
    }

    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': this.braveKey
      }
    });

    if (!response.ok) {
      throw new Error('Web search failed');
    }

    const data = await response.json();

    return data.web?.results?.map((result: any) => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
      publishedDate: result.age,
      source: new URL(result.url).hostname
    })) || [];
  }

  /**
   * Research a topic comprehensively
   */
  async researchTopic(topic: string, context?: string): Promise<ResearchSummary> {
    // Build comprehensive search query
    const searchQuery = context 
      ? `${topic} ${context}` 
      : topic;

    // Search for general information
    const generalResults = await this.search({
      query: searchQuery,
      maxResults: 10,
      type: 'general'
    });

    // Search for recent news/trends
    const recentResults = await this.search({
      query: `${topic} latest trends news`,
      maxResults: 5,
      timeRange: 'week',
      type: 'news'
    });

    // Combine results
    const allResults = [...generalResults, ...recentResults];

    // Generate summary and insights
    const summary = await this.generateSummary(topic, allResults);
    const keyInsights = await this.extractKeyInsights(allResults);

    return {
      query: topic,
      results: allResults,
      summary,
      keyInsights,
      sources: allResults.map(r => r.url),
      timestamp: new Date()
    };
  }

  /**
   * Research music industry trends
   */
  async researchMusicTrends(genre?: string): Promise<ResearchSummary> {
    const query = genre 
      ? `${genre} music trends 2025 playlist streaming`
      : 'music industry trends 2025 streaming playlists';

    return this.researchTopic(query, 'music industry analysis');
  }

  /**
   * Research playlist opportunities
   */
  async researchPlaylistCurators(genre: string): Promise<ResearchResult[]> {
    return this.search({
      query: `${genre} spotify playlist curators submit music`,
      maxResults: 15
    });
  }

  /**
   * Research competitors/similar artists
   */
  async researchCompetitors(artistName: string, genre: string): Promise<ResearchSummary> {
    return this.researchTopic(`${genre} artists similar to ${artistName}`, 'music marketing strategy');
  }

  /**
   * Find sync licensing opportunities
   */
  async findSyncOpportunities(musicStyle: string): Promise<ResearchResult[]> {
    return this.search({
      query: `${musicStyle} sync licensing opportunities music placement`,
      maxResults: 10
    });
  }

  /**
   * Research marketing strategies
   */
  async researchMarketingStrategies(niche: string): Promise<ResearchSummary> {
    return this.researchTopic(`${niche} marketing strategies 2025`, 'digital marketing trends');
  }

  /**
   * Find relevant blogs/publications
   */
  async findRelevantMedia(topic: string): Promise<ResearchResult[]> {
    return this.search({
      query: `${topic} blogs publications media outlets`,
      maxResults: 20
    });
  }

  /**
   * Track trending topics
   */
  async trackTrendingTopics(category: string): Promise<ResearchResult[]> {
    return this.search({
      query: `${category} trending now popular viral`,
      maxResults: 10,
      timeRange: 'day'
    });
  }

  /**
   * Generate summary from research results
   */
  private async generateSummary(topic: string, results: ResearchResult[]): Promise<string> {
    // Combine all snippets
    const allContent = results
      .map(r => `${r.title}: ${r.snippet}`)
      .join('\n\n');

    // Use Claude to summarize (would integrate with AI orchestrator)
    return `Research summary for "${topic}":\n\nBased on ${results.length} sources, key findings include:\n${allContent.slice(0, 500)}...\n\n[This would be expanded with AI-generated comprehensive summary]`;
  }

  /**
   * Extract key insights from research
   */
  private async extractKeyInsights(results: ResearchResult[]): Promise<string[]> {
    // Extract key points from snippets
    const insights: string[] = [];

    results.slice(0, 5).forEach(result => {
      // Simple extraction - would enhance with NLP
      const snippet = result.snippet;
      if (snippet.length > 50) {
        insights.push(snippet.split('.')[0]);
      }
    });

    return insights;
  }

  /**
   * Monitor brand/artist mentions
   */
  async monitorMentions(brandName: string): Promise<ResearchResult[]> {
    return this.search({
      query: `"${brandName}"`,
      maxResults: 20,
      timeRange: 'week'
    });
  }

  /**
   * Find collaboration opportunities
   */
  async findCollaborators(type: string, genre?: string): Promise<ResearchResult[]> {
    const query = genre
      ? `${genre} ${type} collaboration seeking musicians`
      : `${type} collaboration opportunities music`;

    return this.search({ query, maxResults: 15 });
  }

  /**
   * Research SEO keywords
   */
  async researchKeywords(topic: string): Promise<string[]> {
    const results = await this.search({
      query: `${topic} keywords seo search terms`,
      maxResults: 10
    });

    // Extract keywords from results
    const keywords: Set<string> = new Set();
    
    results.forEach(result => {
      const words = result.title.toLowerCase().split(/\W+/);
      words.forEach(word => {
        if (word.length > 4) {
          keywords.add(word);
        }
      });
    });

    return Array.from(keywords).slice(0, 20);
  }
}

// Export singleton instance
export const webResearcher = new WebResearcher();
