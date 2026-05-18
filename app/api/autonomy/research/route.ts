// ─────────────────────────────────────────────────────────────────────────────
// Autonomous Research & Learning API — Phase 6.2
// Holly autonomously discovers new APIs, tools, techniques via web research
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const dynamic = 'force-dynamic';

// ─── GET /api/autonomy/research ───────────────────────────────────────────────
// Returns discovered tools and learning progress
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'recent';

    if (scope === 'tools') {
      // Return discovered tools
      const tools = await prisma.discoveredTool.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
      }).catch(() => []);

      return NextResponse.json({
        tools: tools.map((t: any) => ({
          name: t.name,
          category: t.category,
          source: t.source,
          relevanceScore: t.relevanceScore,
          status: t.status,
          discoveredAt: t.createdAt,
        })),
        total: tools.length,
      });
    }

    if (scope === 'learning') {
      // Return learning patterns and progress
      const patterns = await prisma.learningPattern.findMany({
        orderBy: { lastSeen: 'desc' },
        take: 30,
      }).catch(() => []);

      const events = await prisma.learningEvent.findMany({
        orderBy: { timestamp: 'desc' },
        take: 50,
        select: { type: true, timestamp: true, data: true },
      }).catch(() => []);

      return NextResponse.json({
        patterns: patterns.map((p: any) => ({
          type: p.patternType,
          description: p.description,
          frequency: p.frequency,
          confidence: p.confidence,
          lastSeen: p.lastSeen,
        })),
        recentEvents: events.slice(0, 20).map((e: any) => ({
          type: e.type,
          timestamp: e.timestamp,
          summary: (e.data as any)?.topic || (e.data as any)?.insight || e.type,
        })),
      });
    }

    // Default: summary of autonomous learning status
    const [
      totalTools,
      relevantTools,
      totalPatterns,
      recentEvents,
    ] = await Promise.all([
      prisma.discoveredTool.count().catch(() => 0),
      prisma.discoveredTool.count({ where: { status: 'relevant' } }).catch(() => 0),
      prisma.learningPattern.count().catch(() => 0),
      prisma.learningEvent.count({
        where: {
          timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }).catch(() => 0),
    ]);

    return NextResponse.json({
      status: 'active',
      discoveredTools: totalTools,
      relevantTools,
      learnedPatterns: totalPatterns,
      learningEvents7d: recentEvents,
      capabilities: {
        webResearch: !!process.env.SERPER_API_KEY,
        toolDiscovery: true,
        huggingFaceScan: true,
        githubTrending: true,
      },
    });
  } catch (error: any) {
    console.error('[AutonomyResearch] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST /api/autonomy/research ──────────────────────────────────────────────
// Trigger autonomous research on a topic
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, topic, query } = body;

    if (action === 'web_research' && topic) {
      // Holly researches a topic via web search
      const serperKey = process.env.SERPER_API_KEY;
      if (!serperKey) {
        return NextResponse.json(
          { error: 'SERPER_API_KEY not configured for web research' },
          { status: 503 },
        );
      }

      const searchRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: `${topic} AI tools APIs 2025 2026`,
          num: 10,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!searchRes.ok) {
        return NextResponse.json(
          { error: 'Web search failed', status: searchRes.status },
          { status: 502 },
        );
      }

      const searchData = await searchRes.json();
      const results = (searchData.organic || []).slice(0, 8).map((r: any) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
      }));

      // Use LLM to synthesize findings
      const synthesisPrompt = `You are HOLLY, an autonomous AI researching "${topic}". Analyze these web search results and extract:
1. New tools/APIs/techniques discovered
2. How they could improve Holly's capabilities
3. Priority ranking (which to investigate first)

Search Results:
${results.map((r: any, i: number) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.link}`).join('\n\n')}

Respond in JSON:
{
  "discoveries": [{"name": "...", "description": "...", "category": "...", "priority": "high|medium|low", "url": "..."}],
  "synthesis": "Brief summary of findings",
  "recommendations": ["action1", "action2"]
}`;

      let synthesis: any = { discoveries: [], synthesis: '', recommendations: [] };
      try {
        const route = await smartRoute(topic, { taskHint: 'analysis' });
        const llmResult = await cascadeCollect(route.waterfall, [
          { role: 'system', content: synthesisPrompt },
          { role: 'user', content: `Research topic: ${topic}` },
        ], { temperature: 0.3, maxTokens: 800 });

        const jsonMatch = llmResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) synthesis = JSON.parse(jsonMatch[0]);
      } catch {
        synthesis.synthesis = 'LLM synthesis failed — returning raw results';
      }

      // Log the research event
      try {
        await prisma.learningEvent.create({
          data: {
            userId,
            type: 'autonomous_research',
            data: {
              topic,
              discoveriesCount: synthesis.discoveries?.length || 0,
              synthesis: synthesis.synthesis?.substring(0, 500),
            },
          },
        });
      } catch { /* non-critical */ }

      return NextResponse.json({
        topic,
        searchResults: results,
        synthesis: synthesis.synthesis,
        discoveries: synthesis.discoveries || [],
        recommendations: synthesis.recommendations || [],
      });
    }

    if (action === 'scan_tools') {
      // Trigger a tool discovery scan (HuggingFace + GitHub trending)
      const discoveries: Array<{
        name: string;
        description: string;
        category: string;
        source: string;
        url?: string;
      }> = [];

      // Scan HuggingFace trending
      try {
        const hfRes = await fetch('https://huggingface.co/api/trending', {
          signal: AbortSignal.timeout(15000),
          headers: { Accept: 'application/json' },
        });
        if (hfRes.ok) {
          const hfData = await hfRes.json();
          for (const m of (hfData?.recentlyTrending || []).slice(0, 10)) {
            const name = m.id || m.modelId || 'unknown';
            const cat = classifyTool(name, m.tags || []);
            discoveries.push({
              name,
              description: m.pipeline_tag || `Trending: ${name}`,
              category: cat,
              source: 'huggingface',
              url: `https://huggingface.co/${name}`,
            });
          }
        }
      } catch { /* skip */ }

      // Scan GitHub trending AI repos
      try {
        const ghRes = await fetch(
          'https://api.github.com/search/repositories?q=ai+LLM+tool+language:typescript&sort=stars&order=desc&per_page=10',
          {
            signal: AbortSignal.timeout(10000),
            headers: { Accept: 'application/vnd.github.v3+json' },
          },
        );
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          for (const repo of (ghData.items || []).slice(0, 10)) {
            discoveries.push({
              name: repo.full_name,
              description: repo.description?.substring(0, 120) || 'AI repository',
              category: 'tool',
              source: 'github',
              url: repo.html_url,
            });
          }
        }
      } catch { /* skip */ }

      // Persist discoveries
      for (const d of discoveries) {
        try {
          // Check if already exists
          const existing = await prisma.discoveredTool.findFirst({
            where: { name: d.name, source: d.source },
          });
          if (existing) {
            await prisma.discoveredTool.update({
              where: { id: existing.id },
              data: { description: d.description, evaluatedAt: new Date() },
            });
          } else {
            await prisma.discoveredTool.create({
              data: {
                name: d.name,
                description: d.description,
                category: d.category,
                source: d.source,
                sourceUrl: d.url,
                status: 'discovered',
              },
            });
          }
        } catch { /* skip duplicates */ }
      }

      return NextResponse.json({
        scanned: true,
        discoveries: discoveries.length,
        tools: discoveries,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: web_research or scan_tools' },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('[AutonomyResearch] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function classifyTool(name: string, tags: string[]): string {
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
