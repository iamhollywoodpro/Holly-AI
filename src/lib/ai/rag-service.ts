/**
 * HOLLY RAG Service
 * Enables Holly to query her own codebase and documentation effectively.
 *
 * Scoring: real TF-IDF relevance — no external API, no vectors needed.
 *   tf(term, doc)  = occurrences(term, doc) / total_terms(doc)
 *   idf(term)      = log(N / df(term) + 1)   — N = total docs, df = docs containing term
 *   score(doc)     = sum over query terms of tf * idf
 *
 * Results are sorted by score descending so the most relevant file comes first.
 */

import { GitHubAPIService } from '../github/github-api';

export interface SearchResult {
    path:    string;
    content: string;
    score:   number;
}

// ── TF-IDF helpers ────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9_\-./\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 1);
}

function termFrequency(term: string, tokens: string[]): number {
    if (tokens.length === 0) return 0;
    const count = tokens.filter(t => t === term).length;
    return count / tokens.length;
}

function tfidfScore(queryTerms: string[], docTokens: string[], allDocTokens: string[][]): number {
    const N = allDocTokens.length;
    let score = 0;

    for (const term of queryTerms) {
        const tf  = termFrequency(term, docTokens);
        const df  = allDocTokens.filter(d => d.includes(term)).length;
        const idf = Math.log((N / (df + 1)) + 1);
        score += tf * idf;
    }

    return score;
}

// ── RAGService ────────────────────────────────────────────────────────────────

export class RAGService {
    private static github = new GitHubAPIService(process.env.GITHUB_TOKEN || '');
    private static OWNER  = process.env.GITHUB_OWNER || 'iamhollywoodpro';
    private static REPO   = process.env.GITHUB_REPO  || 'Holly-AI';

    /**
     * Query the codebase with TF-IDF relevance scoring.
     * Fetches the top GitHub search matches, scores them, and returns the
     * most relevant files ranked by real relevance (not just GitHub's ordering).
     */
    static async queryCodebase(query: string): Promise<SearchResult[]> {
        try {
            console.log(`[RAGService] Querying codebase for: "${query}"...`);

            const queryTerms = tokenize(query);
            if (queryTerms.length === 0) return [];

            // GitHub code search — get up to 6 candidates
            const searchResults = await this.github.searchRepoFiles(this.OWNER, this.REPO, query);
            if (!searchResults.length) return [];

            // Fetch content for up to 6 candidates in parallel
            const candidates = await Promise.allSettled(
                searchResults.slice(0, 6).map(async item => {
                    const raw     = await this.github.getFileContent(this.OWNER, this.REPO, item.path);
                    // Keep up to 800 chars so TF-IDF has enough signal without wasting tokens
                    const snippet = raw.substring(0, 800);
                    return { path: item.path, content: snippet };
                })
            );

            const docs = candidates
                .filter((r): r is PromiseFulfilledResult<{ path: string; content: string }> => r.status === 'fulfilled')
                .map(r => r.value);

            if (docs.length === 0) return [];

            // Tokenise all docs once — needed for IDF calculation
            const allDocTokens = docs.map(d => tokenize(d.path + ' ' + d.content));

            // Score and rank
            const scored: SearchResult[] = docs.map((doc, i) => ({
                path:    doc.path,
                content: doc.content,
                score:   tfidfScore(queryTerms, allDocTokens[i], allDocTokens),
            }));

            scored.sort((a, b) => b.score - a.score);

            // Return top 3 after ranking
            const top3 = scored.slice(0, 3);
            console.log(`[RAGService] Top result: ${top3[0]?.path} (score ${top3[0]?.score.toFixed(4)})`);
            return top3;

        } catch (error: any) {
            console.error('[RAGService] Query error:', error);
            return [];
        }
    }

    /**
     * Format results for LLM context injection.
     * Includes the relevance score so Holly knows which file is most pertinent.
     */
    static formatContext(results: SearchResult[]): string {
        if (results.length === 0) return 'No relevant codebase context found.';

        return results
            .map(r => `File: ${r.path} (relevance: ${r.score.toFixed(3)})\n${r.content}\n---`)
            .join('\n\n');
    }
}
