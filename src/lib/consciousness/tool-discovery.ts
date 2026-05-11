/**
 * HOLLY Autonomous Tool Discovery System
 * Weekly scan of AI landscape for new tools/models that could improve Holly.
 * Sources: HuggingFace trending, GitHub trending AI repos
 * Evaluation: LLM-powered relevance assessment
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import { Prisma } from '@prisma/client';

export interface DiscoveredToolCandidate {
  name: string;
  description: string;
  category: string;
  source: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
}

const HOLLY_CAPS = {
  embedding: ['cloudflare/bge-large', 'nvidia/nv-embedqa', 'ollama/nomic-embed'],
  llm: ['groq/llama-3.3-70b', 'arcee/trinity-large', 'free-providers cascade'],
  tts: ['kokoro-tts'], image: ['flux-schnell', 'dall-e'],
  music: ['suno', 'sonauto'], code: ['github-tools'], search: ['web-search'],
};

function classify(name: string, tags: string[]): string {
  const s = `${name} ${tags.join(' ')}`.toLowerCase();
  if (s.includes('embed')) return 'embedding';
  if (s.includes('tts') || s.includes('speech')) return 'tts';
  if (s.includes('music') || s.includes('audio')) return 'music';
  if (s.includes('image') || s.includes('diffus')) return 'image';
  if (s.includes('code') || s.includes('copilot')) return 'code';
  if (s.includes('search') || s.includes('rag')) return 'search';
  if (s.includes('vision') || s.includes('multimodal')) return 'vision';
  return 'llm';
}

async function scanHuggingFace(): Promise<DiscoveredToolCandidate[]> {
  const out: DiscoveredToolCandidate[] = [];
  try {
    const res = await fetch('https://huggingface.co/api/trending', {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return out;
    const data = await res.json();
    for (const m of (data?.recentlyTrending || []).slice(0, 20)) {
      const name = m.id || m.modelId || 'unknown';
      out.push({
        name, description: m.pipeline_tag || `Trending: ${name}`,
        category: classify(name, m.tags || []),
        source: 'huggingface',
        sourceUrl: `https://huggingface.co/${name}`,
        metadata: { downloads: m.downloads || 0, likes: m.likes || 0, tags: m.tags || [] },
      });
    }
  } catch { /* skip */ }
  return out;
}

async function scanGitHub(): Promise<DiscoveredToolCandidate[]> {
  const out: DiscoveredToolCandidate[] = [];
  try {
    const res = await fetch(
      'https://api.github.com/search/repositories?q=topic:ai+topic:llm&sort=stars&order=desc&per_page=15',
      { signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/vnd.github.v3+json' } },
    );
    if (!res.ok) return out;
    const data = await res.json();
    for (const r of (data?.items || [])) {
      out.push({
        name: r.full_name, description: r.description || r.full_name,
        category: classify(r.name, (r.topics || [])),
        source: 'github', sourceUrl: r.html_url,
        metadata: { stars: r.stargazers_count, forks: r.forks_count, language: r.language },
      });
    }
  } catch { /* skip */ }
  return out;
}

async function evaluateTool(c: DiscoveredToolCandidate): Promise<{
  relevance: number; quality: number; overall: number;
  reasoning: string; recommendation: 'integrate' | 'monitor' | 'skip';
}> {
  const prompt = `You are HOLLY AI. Evaluate this tool for integration.
YOUR CAPS: ${JSON.stringify(HOLLY_CAPS)}
TOOL: ${c.name} | ${c.category} | ${c.description} | Source: ${c.source}
JSON only: {"relevance":0-1,"quality":0-1,"reasoning":"...","recommendation":"integrate|monitor|skip"}`;

  try {
    const routing = await smartRoute(prompt, { taskHint: 'speed' });
    const resp = await cascadeCollect(
      routing.waterfall,
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 300 },
    );
    const m = resp.text.match(/\{[\s\S]*\}/);
    if (!m) return defaultEval(c);
    const p = JSON.parse(m[0]);
    const rel = Math.max(0, Math.min(1, p.relevance || 0));
    const qual = Math.max(0, Math.min(1, p.quality || 0));
    return { relevance: rel, quality: qual, overall: rel * 0.6 + qual * 0.4, reasoning: p.reasoning, recommendation: p.recommendation || 'skip' };
  } catch { return defaultEval(c); }
}

function defaultEval(c: DiscoveredToolCandidate) {
  const meta = c.metadata || {};
  const qual = Math.min(1, Math.log10(Math.max(1, ((meta as any).downloads || 0) + ((meta as any).stars || 0) * 100)) / 6);
  const rel = 0.4;
  return { relevance: rel, quality: qual, overall: rel * 0.6 + qual * 0.4, reasoning: 'Auto-evaluated', recommendation: 'monitor' as const };
}

export async function runToolDiscoveryCycle(userId: string): Promise<{ scanned: number; newTools: number; proposed: number }> {
  console.log('[ToolDiscovery] 🔍 Starting weekly discovery...');
  const stats = { scanned: 0, newTools: 0, proposed: 0 };

  const [hf, gh] = await Promise.all([scanHuggingFace(), scanGitHub()]);
  const all = [...hf, ...gh];
  stats.scanned = all.length;

  const existing = new Set((await prisma.discoveredTool.findMany({ select: { name: true } })).map(t => t.name));
  const fresh = all.filter(c => !existing.has(c.name));
  stats.newTools = fresh.length;

  for (const c of fresh.slice(0, 15)) {
    try {
      const ev = await evaluateTool(c);
      const status = ev.recommendation === 'integrate' ? 'proposed' : 'discovered';
      await prisma.discoveredTool.create({
        data: {
          name: c.name, description: c.description, category: c.category,
          source: c.source, sourceUrl: c.sourceUrl,
          relevanceScore: ev.relevance, qualityScore: ev.quality,
          overallScore: ev.overall, status, evaluationNotes: ev.reasoning,
          proposedBy: 'holly', metadata: (c.metadata || {}) as Prisma.JsonValue, evaluatedAt: new Date(),
        },
      }).catch(() => {});

      if (ev.overall > 0.7) {
        stats.proposed++;
        await prisma.notification.create({
          data: {
            type: 'initiative', title: `🔧 New Tool: ${c.name}`,
            message: `I found a ${c.category} tool that could improve me.\n\n${ev.reasoning}\nScore: ${(ev.overall * 100).toFixed(0)}%`,
            category: 'tool_discovery', priority: ev.overall > 0.8 ? 'high' : 'normal',
            status: 'unread', userId, clerkUserId: '',
            actionData: { toolName: c.name, sourceUrl: c.sourceUrl, overallScore: ev.overall } as Prisma.JsonValue,
          },
        }).catch(() => {});
      }
    } catch { /* skip */ }
  }

  console.log(`[ToolDiscovery] ✅ scanned=${stats.scanned}, new=${stats.newTools}, proposed=${stats.proposed}`);
  return stats;
}

export async function getDiscoveredTools(filters?: { category?: string; status?: string; limit?: number }) {
  const where: any = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.status) where.status = filters.status;
  return prisma.discoveredTool.findMany({ where, orderBy: { overallScore: 'desc' }, take: filters?.limit || 20 });
}