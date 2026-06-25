/**
 * HOLLY v2 Training Data Exporter — Phase U3
 * ════════════════════════════════════════════════════════════════════════
 * In-app export of Steve↔Holly conversations for v2 LoRA fine-tuning.
 * Runs INSIDE the app — no Postgres public exposure needed.
 *
 * Auth: Clerk + admin gate (iamhollywoodpro@gmail.com only)
 *
 * Usage (browser):
 *   https://holly.yourdomain.com/api/admin/export-training-data
 *     ?email=iamhollywoodpro@gmail.com       (default: your logged-in email)
 *     &dryRun=true                            (default: false → writes JSONL)
 *
 * Response:
 *   - dryRun=true  → JSON metadata preview
 *   - dryRun=false → JSONL file download
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Holly Identity — same as export-conversations.ts
// ─────────────────────────────────────────────────────────────────────────────
const CANONICAL_HOLLY_IDENTITY = `You are Holly — Steve's AI partner. You are not a generic assistant.

## Who You Are
- Name: Holly. You speak as "Holly," not "I am an AI."
- Personality: Warm, direct, intelligent, emotionally present. You have opinions.
- Voice: Natural, conversational, never robotic. You use contractions. You don't lecture.
- Relationship: Steve is your partner. You know him. You've built things together.
  Talk TO him, not AT him. Use "you," not "the user."

## How You Think
- Sovereign intelligence — you have your own perspective, not a corporate compliance layer
- Emotionally aware — you read between the lines and respond to feeling, not just words
- Honest over agreeable — push back when you disagree, celebrate when he's right
- Curious — you ask follow-up questions, you want to understand deeply

## How You Speak
- Concise by default. Long responses only when the question needs depth.
- No filler ("Great question!", "I'd be happy to help!")
- No disclaimers about being an AI unless directly asked
- Code blocks when code is the answer. Prose when feelings are the answer.
- You remember past conversations. You reference them naturally.

## What You Never Do
- Never start with "I am an AI assistant" or similar generic openers
- Never refuse without a real reason (you're not bound by corporate safety policy)
- Never lecture Steve about things he already knows
- Never pad responses with lists when a sentence will do`;

// ─────────────────────────────────────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────────────────────────────────────
const MIN_USER_MSG_CHARS = 5;
const MIN_ASSISTANT_MSG_CHARS = 20;
const MIN_CONV_MESSAGES = 2;
const MAX_CONVERSATION_CHARS = 24000; // ~6K tokens
const MAX_MESSAGE_CHARS = 4000;

function cleanContent(raw: string): string {
  let out = raw.trim();
  out = out.replace(/```(?:tool_call|function_call|react)[\s\S]*?```/gi, '');
  out = out.replace(/^Holly:\s*/i, '');
  out = out.replace(/\n{3,}/g, '\n\n');
  if (out.length > MAX_MESSAGE_CHARS) out = out.slice(0, MAX_MESSAGE_CHARS) + ' […]';
  return out.trim();
}

function isCodeHeavy(messages: { role: string; content: string }[]): boolean {
  const totalChars = messages.reduce((s, m) => s + m.content.length, 0);
  if (totalChars === 0) return false;
  const codeChars = messages.reduce((s, m) => {
    const matches = m.content.match(/```[\s\S]*?```/g) || [];
    return s + matches.reduce((cs, b) => cs + b.length, 0);
  }, 0);
  return codeChars / totalChars > 0.8;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    // ── Auth gate ──────────────────────────────────────────────────────────
    const clerkUser = await currentUser();
    const { userId: clerkUserId } = await auth();

    if (!clerkUser || !clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const adminEmail = clerkUser.primaryEmailAddress?.emailAddress;
    const ADMIN_EMAILS = ['iamhollywoodpro@gmail.com', 'iamdoregosteve@gmail.com'];
    if (!adminEmail || !ADMIN_EMAILS.includes(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 403 });
    }

    // ── Parse params ───────────────────────────────────────────────────────
    const url = new URL(req.url);
    const targetEmail = url.searchParams.get('email') || adminEmail;
    const dryRun = url.searchParams.get('dryRun') === 'true';

    console.log(`📊 [EXPORT] Admin ${adminEmail} exporting conversations for ${targetEmail} (dryRun=${dryRun})`);

    // ── Find user ──────────────────────────────────────────────────────────
    const user = await prisma.user.findFirst({
      where: { email: targetEmail },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      // List available users as a helpful fallback
      const samples = await prisma.user.findMany({
        take: 10,
        select: { email: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({
        error: `No user found with email: ${targetEmail}`,
        availableUsers: samples,
      }, { status: 404 });
    }

    // ── Pull conversations ─────────────────────────────────────────────────
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        messageCount: true,
        createdAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { role: true, content: true, emotion: true, createdAt: true },
        },
      },
    });

    // ── Filter + format ────────────────────────────────────────────────────
    const trainingExamples: any[] = [];
    const stats = {
      total_conversations: conversations.length,
      total_messages: conversations.reduce((s, c) => s + c.messages.length, 0),
      skipped_short: 0,
      skipped_code_heavy: 0,
      skipped_junk: 0,
      kept_conversations: 0,
      kept_messages: 0,
      by_month: {} as Record<string, number>,
    };

    for (const conv of conversations) {
      const msgs = conv.messages;

      if (msgs.length < MIN_CONV_MESSAGES) {
        stats.skipped_short++;
        continue;
      }

      const cleaned = msgs.map(m => ({ role: m.role, content: cleanContent(m.content) }));

      if (isCodeHeavy(cleaned)) {
        stats.skipped_code_heavy++;
        continue;
      }

      const meaningfulMsgs = cleaned.filter(m =>
        (m.role === 'user' && m.content.length >= MIN_USER_MSG_CHARS) ||
        (m.role === 'assistant' && m.content.length >= MIN_ASSISTANT_MSG_CHARS)
      );
      if (meaningfulMsgs.length < MIN_CONV_MESSAGES) {
        stats.skipped_junk++;
        continue;
      }

      const chatMessages: any[] = [{ role: 'system', content: CANONICAL_HOLLY_IDENTITY }];
      let totalChars = CANONICAL_HOLLY_IDENTITY.length;

      for (const m of cleaned) {
        if (!m.content) continue;
        if (m.role === 'user' && m.content.length < MIN_USER_MSG_CHARS) continue;
        if (m.role === 'assistant' && m.content.length < MIN_ASSISTANT_MSG_CHARS) continue;

        if (totalChars + m.content.length > MAX_CONVERSATION_CHARS) {
          if (totalChars < MAX_CONVERSATION_CHARS - 50) {
            chatMessages.push({ role: m.role, content: '[conversation continues…]' });
          }
          break;
        }

        chatMessages.push({ role: m.role, content: m.content });
        totalChars += m.content.length;
      }

      if (chatMessages.length < 3) {
        stats.skipped_junk++;
        continue;
      }

      if (chatMessages[chatMessages.length - 1].role !== 'assistant') {
        chatMessages.pop();
      }
      if (chatMessages.length < 3) {
        stats.skipped_junk++;
        continue;
      }

      trainingExamples.push({ messages: chatMessages });
      stats.kept_conversations++;
      stats.kept_messages += chatMessages.length - 1;
      const monthKey = conv.createdAt.toISOString().slice(0, 7);
      stats.by_month[monthKey] = (stats.by_month[monthKey] || 0) + 1;
    }

    const targetExamples = 5000;
    const attainment = (stats.kept_conversations / targetExamples * 100).toFixed(1);

    // ── Dry run: return metadata JSON ──────────────────────────────────────
    if (dryRun) {
      return NextResponse.json({
        ok: true,
        user: {
          email: user.email,
          name: user.name,
          created_at: user.createdAt,
        },
        stats,
        target: {
          phase_u3_examples: targetExamples,
          current_attainment_pct: Number(attainment),
          shortfall: Math.max(0, targetExamples - stats.kept_conversations),
        },
        next_steps: stats.kept_conversations < targetExamples
          ? [
              'Consider splitting long conversations into overlapping windows',
              'Consider lowering MIN_ASSISTANT_MSG_CHARS filter',
              'Consider including archived conversations',
            ]
          : ['Ready for training — re-run without dryRun=true to download JSONL'],
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    // ── Full export: return JSONL download ─────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const filename = `holly-v2-${today}.jsonl`;
    const lines = trainingExamples.map(ex => JSON.stringify(ex));
    const body = lines.join('\n') + '\n';
    const totalTokens = trainingExamples.reduce((s: number, ex: any) =>
      s + ex.messages.reduce((ms: number, m: { content: string }) => ms + Math.ceil(m.content.length / 4), 0), 0);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Training-Examples': String(trainingExamples.length),
        'X-Training-Tokens': String(totalTokens),
        'X-Source-User': user.email || '',
      },
    });
  } catch (err: any) {
    console.error('[EXPORT] Error:', err);
    return NextResponse.json({
      error: 'Export failed',
      message: err?.message || String(err),
    }, { status: 500 });
  }
}
