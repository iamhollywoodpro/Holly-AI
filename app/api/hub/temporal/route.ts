/**
 * POST /api/hub/temporal — Phase 5: Temporal Hub
 *
 * Unified API route for the Temporal MCP Hub.
 * All temporal/time-awareness tools are proxied through this single endpoint.
 *
 * Auth: Requires x-internal-token header matching INTERNAL_API_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { temporalEngine } from '@/lib/temporal/temporal-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INTERNAL_TOKEN = process.env.INTERNAL_API_SECRET || '';

function verifyToken(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  return token === INTERNAL_TOKEN;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    switch (action) {
      case 'record_event': {
        const { eventType, category, title, description, metadata, importance, projectRef, expiresAt } = body;
        if (!eventType || !category || !title) {
          return NextResponse.json(
            { error: 'Missing required fields: eventType, category, title' },
            { status: 400 }
          );
        }
        const event = await temporalEngine.recordEvent(userId, {
          eventType, category, title, description, metadata, importance, projectRef, expiresAt,
        });
        return NextResponse.json({ ok: true, event });
      }

      case 'get_recent_events': {
        const { eventType, category, since, limit, minImportance } = body;
        const events = await temporalEngine.getRecentEvents(userId, {
          eventType, category, since, limit, minImportance,
        });
        return NextResponse.json({ ok: true, events });
      }

      case 'get_timeline': {
        const { from, to, category, projectRef } = body;
        const timeline = await temporalEngine.getTimeline(userId, { from, to, category, projectRef });
        return NextResponse.json({ ok: true, timeline });
      }

      case 'start_session': {
        const { sessionType, topic, projectRef, conversationId } = body;
        if (!sessionType) {
          return NextResponse.json({ error: 'Missing required field: sessionType' }, { status: 400 });
        }
        const session = await temporalEngine.recordActivitySession(userId, {
          sessionType, topic, projectRef, conversationId,
        });
        return NextResponse.json({ ok: true, session });
      }

      case 'end_session': {
        const { sessionId, messageCount, toolsUsed, topics, productivity } = body;
        if (!sessionId) {
          return NextResponse.json({ error: 'Missing required field: sessionId' }, { status: 400 });
        }
        const session = await temporalEngine.endActivitySession(sessionId, {
          messageCount, toolsUsed, topics, productivity,
        });
        return NextResponse.json({ ok: true, session });
      }

      case 'get_active_session': {
        const session = await temporalEngine.getActiveSession(userId);
        return NextResponse.json({ ok: true, session });
      }

      case 'detect_patterns': {
        const patterns = await temporalEngine.detectPatterns(userId);
        return NextResponse.json({ ok: true, patterns });
      }

      case 'get_patterns': {
        const { patternType, minConfidence } = body;
        const patterns = await temporalEngine.getPatterns(userId, { patternType, minConfidence });
        return NextResponse.json({ ok: true, patterns });
      }

      case 'generate_insights': {
        const insights = await temporalEngine.generateInsights(userId);
        return NextResponse.json({ ok: true, insights });
      }

      case 'get_pending_insights': {
        const { limit } = body;
        const insights = await temporalEngine.getPendingInsights(userId, { limit });
        return NextResponse.json({ ok: true, insights });
      }

      case 'mark_insight_shown': {
        const { insightId } = body;
        if (!insightId) {
          return NextResponse.json({ error: 'Missing required field: insightId' }, { status: 400 });
        }
        await temporalEngine.markInsightShown(insightId);
        return NextResponse.json({ ok: true });
      }

      case 'mark_insight_acted_on': {
        const { insightId, feedback } = body;
        if (!insightId) {
          return NextResponse.json({ error: 'Missing required field: insightId' }, { status: 400 });
        }
        await temporalEngine.markInsightActedOn(insightId, feedback);
        return NextResponse.json({ ok: true });
      }

      case 'dismiss_insight': {
        const { insightId } = body;
        if (!insightId) {
          return NextResponse.json({ error: 'Missing required field: insightId' }, { status: 400 });
        }
        await temporalEngine.dismissInsight(insightId);
        return NextResponse.json({ ok: true });
      }

      case 'get_temporal_context': {
        const context = await temporalEngine.getTemporalContext(userId);
        return NextResponse.json({ ok: true, context });
      }

      case 'cleanup_expired': {
        const removed = await temporalEngine.cleanupExpired(userId);
        return NextResponse.json({ ok: true, removed });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: record_event, get_recent_events, get_timeline, start_session, end_session, get_active_session, detect_patterns, get_patterns, generate_insights, get_pending_insights, mark_insight_shown, mark_insight_acted_on, dismiss_insight, get_temporal_context, cleanup_expired` },
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
