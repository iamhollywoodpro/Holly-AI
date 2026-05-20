/**
 * POST /api/hub/taste — Phase 4: Taste + Judgment Hub
 *
 * Unified API route for the Taste MCP Hub (#9).
 * All taste/judgment tools are proxied through this single endpoint.
 *
 * Actions:
 *   record_signal    — Record a taste signal (positive/negative/neutral)
 *   batch_signals    — Record multiple signals at once
 *   get_profile      — Get the user's current taste profile
 *   assess_quality   — Assess quality of code, content, or design
 *   detect_signals   — Heuristic detection of implicit taste signals from text
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateUser } from '@/lib/user-manager';
import { TasteEngine } from '@/lib/learning/taste-engine';
import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';

// ── Quality assessment prompt builder ──────────────────────────────────────

function buildQualityPrompt(type: 'code' | 'content' | 'design', input: string, context?: string): string {
  const base = `You are HOLLY's Taste + Judgment Engine. Assess the following ${type} for quality.
Be specific, constructive, and score on a 0-100 scale.

`;
  const prompts: Record<string, string> = {
    code: `${base}Evaluate:
- Clean code principles (naming, structure, DRY)
- Error handling and edge cases
- Performance considerations
- Security best practices
- Maintainability and readability
- Pattern usage (appropriate design patterns)

Respond in JSON format:
{
  "score": <0-100>,
  "grade": "<A+/A/B/C/D/F>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "summary": "<one-line summary>"
}

${context ? `Context: ${context}\n\n` : ''}${type} to assess:
\`\`\`
${input}
\`\`\``,

    content: `${base}Evaluate:
- Clarity and coherence
- Tone appropriateness
- Structure and formatting
- Grammar and readability
- Engagement factor
- Target audience fit

Respond in JSON format:
{
  "score": <0-100>,
  "grade": "<A+/A/B/C/D/F>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "summary": "<one-line summary>"
}

${context ? `Context: ${context}\n\n` : ''}${type} to assess:
\`\`\`
${input}
\`\`\``,

    design: `${base}Evaluate:
- Visual hierarchy and spacing
- Color theory and contrast
- Typography choices
- Accessibility (WCAG compliance)
- Responsiveness considerations
- User experience flow

Respond in JSON format:
{
  "score": <0-100>,
  "grade": "<A+/A/B/C/D/F>",
  "strengths": ["<strength1>", "<strength2>"],
  "weaknesses": ["<weakness1>", "<weakness2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "summary": "<one-line summary>"
}

${context ? `Context: ${context}\n\n` : ''}${type} to assess:
\`\`\`
${input}
\`\`\``,
  };

  return prompts[type] || prompts.content;
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action } = body;
    if (!action) {
      return NextResponse.json({ error: 'Missing "action" field' }, { status: 400 });
    }

    const dbUser = await getOrCreateUser(userId);
    const engine = new TasteEngine(dbUser.id);

    switch (action) {
      // ── record_signal ──────────────────────────────────────────────────
      case 'record_signal': {
        const { category, item, signal, context, weight, source } = body;
        if (!category || !item || !signal) {
          return NextResponse.json(
            { error: 'Missing required fields: category, item, signal' },
            { status: 400 }
          );
        }

        await engine.recordSignal({
          category,
          item,
          signal,
          context,
          weight: typeof weight === 'number' ? weight : 1.0,
          source: source ?? 'implicit',
        });

        return NextResponse.json({ success: true, action: 'record_signal' });
      }

      // ── batch_signals ──────────────────────────────────────────────────
      case 'batch_signals': {
        const { signals } = body;
        if (!Array.isArray(signals) || signals.length === 0) {
          return NextResponse.json(
            { error: 'Missing or empty "signals" array' },
            { status: 400 }
          );
        }

        await engine.recordSignals(signals);

        return NextResponse.json({ success: true, action: 'batch_signals', count: signals.length });
      }

      // ── get_profile ────────────────────────────────────────────────────
      case 'get_profile': {
        const profile = await engine.getProfile();
        return NextResponse.json({
          success: true,
          action: 'get_profile',
          profile,
          message: profile
            ? 'Taste profile loaded'
            : 'No taste profile yet — send signals to build one',
        });
      }

      // ── assess_quality ─────────────────────────────────────────────────
      case 'assess_quality': {
        const { type, input, context } = body;
        const validTypes = ['code', 'content', 'design'];
        if (!validTypes.includes(type)) {
          return NextResponse.json(
            { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
            { status: 400 }
          );
        }
        if (!input || typeof input !== 'string') {
          return NextResponse.json(
            { error: 'Missing "input" field (string of content to assess)' },
            { status: 400 }
          );
        }

        // Use Smart Router to pick the best model for quality assessment
        const prompt = buildQualityPrompt(type as 'code' | 'content' | 'design', input, context);
        const messages = [
          { role: 'system' as const, content: 'You are a quality assessment engine. Always respond with valid JSON only.' },
          { role: 'user' as const, content: prompt },
        ];

        const routing = await smartRoute(prompt);
        const result = await cascadeCollect(routing.waterfall, messages, {
          maxTokens: 1000,
          temperature: 0.3,
        });

        // Parse the LLM response
        let assessment;
        try {
          // Extract JSON from potential markdown code blocks
          const jsonStr = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
          assessment = JSON.parse(jsonStr);
        } catch {
          assessment = {
            score: 50,
            grade: 'C',
            strengths: ['Could not parse assessment'],
            weaknesses: ['LLM returned non-JSON response'],
            suggestions: ['Try again with simpler input'],
            summary: result.text.slice(0, 200),
            _raw: result.text,
          };
        }

        return NextResponse.json({
          success: true,
          action: 'assess_quality',
          type,
          assessment,
          model: result.model,
        });
      }

      // ── detect_signals ─────────────────────────────────────────────────
      case 'detect_signals': {
        const { userMessage, assistantResponse } = body;
        if (!userMessage || typeof userMessage !== 'string') {
          return NextResponse.json(
            { error: 'Missing "userMessage" field' },
            { status: 400 }
          );
        }

        const detected = TasteEngine.detectImplicit(userMessage, assistantResponse);

        // Auto-record detected signals
        if (detected.length > 0) {
          await engine.recordSignals(detected);
        }

        return NextResponse.json({
          success: true,
          action: 'detect_signals',
          detectedCount: detected.length,
          signals: detected,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: record_signal, batch_signals, get_profile, assess_quality, detect_signals` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('[/api/hub/taste] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
}
