/**
 * HOLLY RAG Service
 * Enables Holly to query her own codebase and documentation effectively
 */

import { GitHubAPIService } from '../github/github-api';

export interface SearchResult {
    path: string;
    content: string;
    score: number;
}

export class RAGService {
    private static github = new GitHubAPIService(process.env.GITHUB_TOKEN || '');
    private static OWNER = process.env.GITHUB_OWNER || 'iamhollywoodpro';
    private static REPO = process.env.GITHUB_REPO || 'Holly-AI';

    /**
     * Simple keyword-based search across the codebase
     * (Phase 2 placeholder for full vector RAG)
     */
    static async queryCodebase(query: string): Promise<SearchResult[]> {
        try {
            console.log(`[RAGService] Querying codebase for: "${query}"...`);

            // Search files matching the query via GitHub API
            const searchResults = await this.github.searchRepoFiles(this.OWNER, this.REPO, query);

            const results: SearchResult[] = [];

            // Fetch content for top 3 results
            for (const item of searchResults.slice(0, 3)) {
                try {
                    const content = await this.github.getFileContent(this.OWNER, this.REPO, item.path);
                    results.push({
                        path: item.path,
                        content: content.substring(0, 500) + '...', // Limit content size
                        score: 1.0, // Static score for now
                    });
                } catch (err) {
                    console.error(`[RAGService] Failed to fetch content for ${item.path}:`, err);
                }
            }

            return results;
        } catch (error: any) {
            console.error('[RAGService] Query error:', error);
            return [];
        }
    }

    /**
     * Format context for the LLM
     */
    static formatContext(results: SearchResult[]): string {
        if (results.length === 0) return 'No relevant codebase context found.';

        return results
            .map(r => `File: ${r.path}\nContent Snippet:\n${r.content}\n---`)
            .join('\n\n');
    }
}
