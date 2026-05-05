/**
 * POST/GET /api/background-learning — Phase 9E: HOLLY Background Learning
 *
 * HOLLY learns continuously, even when Steve isn't chatting.
 *
 * GET  /api/background-learning       → learning status + recent sessions
 * POST /api/background-learning/tick  → run one learning session (cron trigger)
 * POST /api/background-learning/study → trigger manual study on a topic
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  conductLearningSession,
  generateStudyReport,
  selectLearningDomain,
  selectStudyTopic,
  type LearningDomain,
} from '@/lib/background-learning/holly-learns';

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';

const VALID_DOMAINS: LearningDomain[] = [
  'world_knowledge', 'audio_music', 'ai_technology',
  'human_psychology', 'languages', 'self_improvement',
  'creative_arts', 'science',
];

// ─── GET: learning status ─────────────────────────────────────────────────────

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const nextDomain = selectLearningDomain();
    const nextTopic  = selectStudyTopic(nextDomain);

    return NextResponse.json({
      ok:    true,
      phase: '9E',
      description: 'HOLLY Background Learning — continuous self-study system',
      status: 'active',
      domains: VALID_DOMAINS,
      nextScheduled: {
        domain: nextDomain,
        topic:  nextTopic,
      },
      howToTrigger: {
        manual:    'POST /api/background-learning { "action": "study", "domain": "audio_music" }',
        tick:      'POST /api/background-learning { "action": "tick" } (automated)',
        scheduled: 'Deploy a cron job to hit POST /api/background-learning { "action": "tick" } every hour',
      },
      cronSetup: {
        vercel:     '// vercel.json: { "crons": [{ "path": "/api/background-learning", "schedule": "0 * * * *" }] }',
        description: 'Add to vercel.json to trigger HOLLY learning every hour automatically',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── POST: trigger learning ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Allow both authenticated users and cron trigger (no auth for cron)
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch { /* cron trigger — no auth */ }

    // Check cron secret for automated triggers
    const cronSecret  = req.headers.get('x-cron-secret');
    const isCronValid = cronSecret && cronSecret === process.env.CRON_SECRET;
    const isAuthed    = !!userId;

    if (!isAuthed && !isCronValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body   = await req.json().catch(() => ({}));
    const action = (body.action as string) ?? 'tick';

    if (action === 'tick' || action === 'study') {
      const domain = body.domain as LearningDomain | undefined;
      const topic  = body.topic  as string       | undefined;

      if (domain && !VALID_DOMAINS.includes(domain)) {
        return NextResponse.json({
          error: `Invalid domain. Valid: ${VALID_DOMAINS.join(', ')}`,
        }, { status: 400 });
      }

      const session = await conductLearningSession(domain, topic, userId ?? 'holly-cron');
      const report  = await generateStudyReport([session]);

      return NextResponse.json({
        ok:      true,
        message: `📚 HOLLY studied "${session.topic}" in ${session.domain}`,
        session: {
          id:         session.id,
          domain:     session.domain,
          topic:      session.topic,
          insights:   session.insights,
          questions:  session.questions,
          connections: session.connections,
          confidence: session.confidence,
          duration:   session.completedAt
            ? session.completedAt.getTime() - session.startedAt.getTime()
            : 0,
        },
        report,
      });
    }

    return NextResponse.json({
      error: `Unknown action: ${action}. Valid: tick, study`,
    }, { status: 400 });

  } catch (err: unknown) {
    console.error('[Background Learning] Error:', err);
    return NextResponse.json(
      { error: 'Learning session failed', details: (err as Error).message },
      { status: 500 }
    );
  }
}
