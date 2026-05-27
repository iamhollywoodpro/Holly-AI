/**
 * Language Tutor Plugin API Routes
 *
 * POST /api/plugins/holly-language-tutor              — Start a new session { language }
 * POST /api/plugins/holly-language-tutor?exercise=true — Generate exercise { sessionId, type? }
 * POST /api/plugins/holly-language-tutor?evaluate=true — Evaluate answer { sessionId, exercise, answer }
 * GET  /api/plugins/holly-language-tutor?progress=true — Get progress summary
 * GET  /api/plugins/holly-language-tutor?sessionId=xxx — Get session details
 * PATCH /api/plugins/holly-language-tutor              — Update session score { sessionId, scoreDelta }
 * DELETE /api/plugins/holly-language-tutor             — End a session { sessionId }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { languageTutorService } from '@/lib/plugins/implementations/holly-language-tutor';

/** Verify ownership of a session, return it or null. */
async function getUserSession(userId: string, sessionId: string) {
  return prisma.pluginLanguageSession.findFirst({
    where: { id: sessionId, userId },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const progress = searchParams.get('progress');

    // Progress summary
    if (progress === 'true') {
      const progressData = await languageTutorService.getProgressSummary(user.id);
      return NextResponse.json(progressData);
    }

    // Get session details
    if (sessionId) {
      const session = await getUserSession(user.id, sessionId);
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      return NextResponse.json(session);
    }

    return NextResponse.json({ error: 'Provide sessionId or progress=true' }, { status: 400 });
  } catch (error) {
    console.error('[LanguageTutor] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const isExercise = searchParams.get('exercise') === 'true';
    const isEvaluate = searchParams.get('evaluate') === 'true';

    // Generate exercise
    if (isExercise) {
      const { sessionId, type } = body;
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
      }

      const session = await getUserSession(user.id, sessionId);
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

      const exercise = await languageTutorService.generateExercise(
        session.language,
        session.level as 'beginner' | 'intermediate' | 'advanced',
        type || 'translation',
      );

      return NextResponse.json({ sessionId, ...exercise }, { status: 201 });
    }

    // Evaluate answer
    if (isEvaluate) {
      const { sessionId, exercise, answer } = body;
      if (!sessionId || !exercise || !answer) {
        return NextResponse.json(
          { error: 'sessionId, exercise, and answer required' },
          { status: 400 },
        );
      }

      const session = await getUserSession(user.id, sessionId);
      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

      const result = await languageTutorService.evaluateAnswer(
        session.language,
        exercise,
        answer,
      );

      // Update session score in background
      languageTutorService.updateSession(sessionId, result.scoreDelta).catch(() => {});

      return NextResponse.json(result);
    }

    // Start new session
    const { language } = body;
    if (!language) {
      return NextResponse.json({ error: 'language required' }, { status: 400 });
    }

    const session = await languageTutorService.startSession(user.id, language);
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error('[LanguageTutor] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { sessionId, scoreDelta } = await req.json();
    if (!sessionId || typeof scoreDelta !== 'number') {
      return NextResponse.json({ error: 'sessionId and scoreDelta required' }, { status: 400 });
    }

    const session = await getUserSession(user.id, sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    await languageTutorService.updateSession(sessionId, scoreDelta);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LanguageTutor] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const session = await getUserSession(user.id, sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    await languageTutorService.endSession(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LanguageTutor] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
