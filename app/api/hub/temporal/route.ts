/**
 * POST /api/hub/temporal — Phase 5: Temporal Hub
 *
 * Unified API route for the Temporal MCP Hub.
 * All temporal/time-awareness tools are proxied through this single endpoint.
 *
 * Auth: Requires x-internal-token header matching INTERNAL_API_SECRET.
 *
 * Actions:
 *   record_event        — Record a temporal event
 *   get_recent_events   — Get recent events with optional filters
 *   get_timeline        — Get a timeline of events in a date range
 *   start_session       — Start a temporal session (coding, research, etc.)
 *   end_session         — End an active session with summary data
 *   get_active_session  — Get the currently active session (if any)
 *   detect_patterns     — Run pattern detection across temporal data
 *   get_patterns        — Retrieve detected patterns
 *   generate_insights   — Generate temporal insights
 *   get_pending_insights— Get insights not yet shown to the user
 *   mark_insight_shown  — Mark an insight as displayed
 *   mark_insight_acted_on — Mark an insight as acted upon
 *   dismiss_insight     — Dismiss an insight
 *   get_temporal_context— Get formatted temporal context for system prompts
 *   cleanup_expired     — Remove expired events
 */

import { NextRequest, NextResponse } from 'next/server';
import { TemporalEngine } from '@/lib/temporal/temporal-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INTERNAL_TOKEN = process.env.INTERNAL_API_SECRET || 'holly-internal';

// ── Auth helper ─────────────────────────────────────────────────────────────

function verifyToken(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  return token === INTERNAL_TOKEN;
}

// ── Main handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth check ───────────────────────────────────────────────────────
    if (!verifyToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse body ───────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { action, userId } = body;
    if (!action) {
      return NextResponse.json({ error: 'Missing "action" field' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Missing "userId" field' }, { status: 400 });
    }

    const engine = new TemporalEngine(userId);

    switch (action) {
      // ── record_event ─────────────────────────────────────────────────────
      case 'record_event': {
        const { eventType, category, title, description, metadata, importance, projectRef, expiresAt } = body;
        if (!eventType || !category || !title) {
          return NextResponse.json(
            { error: 'Missing required fields: eventType, category, title' },
            { status: 400 }
          );
        }

        const event = await engine.recordEvent({
          eventType,
          category,
          title,
          description,
          metadata,
          importance,
          projectRef,
          expiresAt,
        });

        return NextResponse.json({ ok: true, event });
      }

      // ── get_recent_events ────────────────────────────────────────────────
      case 'get_recent_events': {
        const { eventType, category, since, limit, minImportance } = body;

        const events = await engine.getRecentEvents({
          eventType,
          category,
          since,
          limit,
          minImportance,
        });

        return NextResponse.json({ ok: true, events });
      }

      // ── get_timeline ─────────────────────────────────────────────────────
      case 'get_timeline': {
        const { from, to, category, projectRef } = body;

        const timeline = await engine.getTimeline({
          from,
          to,
          category,
          projectRef,
        });

        return NextResponse.json({ ok: true, timeline });
      }

      // ── start_session ────────────────────────────────────────────────────
      case 'start_session': {
        const { sessionType, topic, projectRef, conversationId } = body;
        if (!sessionType) {
          return NextResponse.json(
            { error: 'Missing required field: sessionType' },
            { status: 400 }
          );
        }

        const session = await engine.startSession({
          sessionType,
          topic,
          projectRef,
          conversationId,
        });

        return NextResponse.json({ ok: true, session });
      }

      // ── end_session ──────────────────────────────────────────────────────
      case 'end_session': {
        const { sessionId, messageCount, toolsUsed, topics, productivity } = body;
        if (!sessionId) {
          return NextResponse.json(
            { error: 'Missing required field: sessionId' },
            { status: 400 }
          );
        }

        const session = await engine.endSession({
          sessionId,
          messageCount,
          toolsUsed,
          topics,
          productivity,
        });

        return NextResponse.json({ ok: true, session });
      }

      // ── get_active_session ───────────────────────────────────────────────
      case 'get_active_session': {
        const session = await engine.getActiveSession();
        return NextResponse.json({ ok: true, session });
      }

      // ── detect_patterns ──────────────────────────────────────────────────
      case 'detect_patterns': {
        const patterns = await engine.detectPatterns();
        return NextResponse.json({ ok: true, patterns });
      }

      // ── get_patterns ─────────────────────────────────────────────────────
      case 'get_patterns': {
        const { patternType, minConfidence } = body;

        const patterns = await engine.getPatterns({
          patternType,
          minConfidence,
        });

        return NextResponse.json({ ok: true, patterns });
      }

      // ── generate_insights ────────────────────────────────────────────────
      case 'generate_insights': {
        const insights = await engine.generateInsights();
        return NextResponse.json({ ok: true, insights });
      }

      // ── get_pending_insights ─────────────────────────────────────────────
      case 'get_pending_insights': {
        const { limit } = body;

        const insights = await engine.getPendingInsights({ limit });

        return NextResponse.json({ ok: true, insights });
      }

      // ── mark_insight_shown ───────────────────────────────────────────────
      case 'mark_insight_shown': {
        const { insightId } = body;
        if (!insightId) {
          return NextResponse.json(
            { error: 'Missing required field: insightId' },
            { status: 400 }
          );
        }

        const insight = await engine.markInsightShown(insightId);
        return NextResponse.json({ ok: true, insight });
      }

      // ── mark_insight_acted_on ────────────────────────────────────────────
      case 'mark_insight_acted_on': {
        const { insightId, feedback } = body;
        if (!insightId) {
          return NextResponse.json(
            { error: 'Missing required field: insightId' },
            { status: 400 }
          );
        }

        const insight = await engine.markInsightActedOn(insightId, feedback);
        return NextResponse.json({ ok: true, insight });
      }

      // ── dismiss_insight ──────────────────────────────────────────────────
      case 'dismiss_insight': {
        const { insightId } = body;
        if (!insightId) {
          return NextResponse.json(
            { error: 'Missing required field: insightId' },
            { status: 400 }
          );
        }

        const insight = await engine.dismissInsight(insightId);
        return NextResponse.json({ ok: true, insight });
      }

      // ── get_temporal_context ─────────────────────────────────────────────
      case 'get_temporal_context': {
        const context = await engine.getTemporalContext();
        return NextResponse.json({ ok: true, context });
      }

      // ── cleanup_expired ──────────────────────────────────────────────────
      case 'cleanup_expired': {
        const removed = await engine.cleanupExpired();
        return NextResponse.json({ ok: true, removed });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Valid actions: record_event, get_recent_events, get_timeline, start_session, end_session, get_active_session, detect_patterns, get_patterns, generate_insights, get_pending_insights, mark_insight_shown, mark_insight_acted_on, dismiss_insight, get_temporal_context, cleanup_expired`,
          },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('[/api/hub/temporal] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
}
