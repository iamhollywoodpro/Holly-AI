import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateAndLoadUser } from '@/lib/chat/auth';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import type { Suggestion } from '@/types/suggestions';

export const runtime = 'nodejs';

const VALID_TYPES = new Set(['question', 'action', 'tool', 'navigation']);
const VALID_ICONS = new Set(['message-circle', 'zap', 'wrench', 'compass', 'sparkles', 'lightbulb', 'help-circle']);

interface RawSuggestion {
  type?: unknown;
  text?: unknown;
  icon?: unknown;
  relevanceScore?: unknown;
}

/**
 * Validate and normalize LLM output into a Suggestion[].
 * v1: every suggestion becomes action: 'send_message' — the panel sends the
 * text as a user message. Tool/navigation actions arrive when C4b lands.
 */
function normalizeSuggestions(raw: RawSuggestion[], count: number): Suggestion[] {
  const out: Suggestion[] = [];
  for (const item of raw) {
    if (typeof item.text !== 'string' || !item.text.trim()) continue;
    const text = item.text.trim().slice(0, 120);
    if (!text) continue;
    const type = typeof item.type === 'string' && VALID_TYPES.has(item.type)
      ? (item.type as Suggestion['type'])
      : 'question';
    const icon = typeof item.icon === 'string' && VALID_ICONS.has(item.icon)
      ? item.icon
      : 'sparkles';
    let score = typeof item.relevanceScore === 'number' ? item.relevanceScore : 0.5;
    if (!Number.isFinite(score)) score = 0.5;
    score = Math.min(1, Math.max(0, score));
    out.push({
      id: `sug-${Date.now()}-${out.length}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      text,
      icon,
      action: 'send_message',
      relevanceScore: score,
    });
    if (out.length >= count) break;
  }
  return out;
}

/**
 * C4 — Real contextual suggestion engine.
 *
 * Takes the last N messages of an owned conversation, a few high-importance
 * relationship memories, and the user's installed extensions as context, then
 * asks the analytics cascade (free/fast tier) for 3 short conversation
 * suggestions. All data is real; on any failure we return [] honestly.
 */
export async function POST(request: Request) {
  // ── Auth ──
  const authResult = await authenticateAndLoadUser();
  if (!authResult || !authResult.dbUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dbUserId = authResult.dbUserId;

  // ── Parse input ──
  let body: { conversationId?: unknown; messageCount?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null;
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }
  const count = typeof body.messageCount === 'number' && body.messageCount >= 3 && body.messageCount <= 10
    ? Math.floor(body.messageCount)
    : 5;

  // ── Ownership check + load recent messages ──
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      userId: true,
      title: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: count,
        select: { role: true, content: true },
      },
    },
  });

  if (!conversation || conversation.userId !== dbUserId) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const messages = conversation.messages
    .slice()
    .reverse()
    .map(m => ({
      role: m.role === 'assistant' ? 'Holly' : m.role === 'user' ? 'User' : m.role,
      content: (typeof m.content === 'string' ? m.content : '').slice(0, 500),
    }))
    .filter(m => m.content);

  // Not enough real conversation to suggest from — return empty honestly.
  if (messages.length < 2) {
    return NextResponse.json({ suggestions: [], contextUsed: messages.length });
  }

  // ── Enrichment: real relationship memories (top importance, active) ──
  const memories = await prisma.relationshipMemory.findMany({
    where: { userId: dbUserId, supersededById: null },
    orderBy: [{ importance: 'desc' }, { updatedAt: 'desc' }],
    take: 5,
    select: { key: true, content: true },
  });

  // ── Enrichment: installed extensions (real capability surface) ──
  const extensions = await prisma.userExtension.findMany({
    where: { userId: dbUserId },
    select: { extensionId: true },
    take: 10,
  });

  // ── Build prompt ──
  const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const memoryBlock = memories.length
    ? `\nKnown long-term memories about the user:\n${memories.map(m => `- ${m.key}: ${m.content.slice(0, 160)}`).join('\n')}`
    : '';
  const extensionBlock = extensions.length
    ? `\nUser's installed extensions (capabilities Holly has): ${extensions.map(e => e.extensionId).join(', ')}`
    : '';

  const prompt = `You suggest what the user could say or ask next in their conversation with Holly, their AI partner.

Recent conversation${conversation.title ? ` ("${conversation.title}")` : ''}:
${transcript}${memoryBlock}${extensionBlock}

Return ONLY a JSON array of exactly 3 objects, no markdown, no prose. Each object:
{"type": "question" | "action", "text": "<max 12 words, phrased as the USER would say it>", "icon": "sparkles" | "lightbulb" | "zap" | "help-circle", "relevanceScore": <0-1>}

Suggestions must follow naturally from the conversation. Prefer variety: one follow-up question, one action or deeper topic, one creative or playful option.`;

  // ── One-shot LLM call via the analytics cascade (cheap tier) ──
  try {
    const routing = await smartRoute(prompt, { forceTask: 'analytics' });
    const { text } = await cascadeCollect(
      routing.waterfall,
      [{ role: 'user', content: prompt }],
      { temperature: 0.4, maxTokens: 200 },
    );

    // Extract JSON array even if wrapped in prose/markdown
    const raw = (text || '').trim();
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      return NextResponse.json({ suggestions: [], contextUsed: messages.length });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return NextResponse.json({ suggestions: [], contextUsed: messages.length });
    }
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ suggestions: [], contextUsed: messages.length });
    }

    const suggestions = normalizeSuggestions(parsed as RawSuggestion[], 3);
    return NextResponse.json({ suggestions, contextUsed: messages.length });
  } catch (err) {
    console.error('[suggestions/generate] LLM cascade failed:', err);
    return NextResponse.json({ suggestions: [], contextUsed: messages.length });
  }
}
