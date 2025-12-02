/**
 * User Behavior Tracking API
 * Phase 4B - Track user sessions, events, and journeys
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/user/behavior/session/start
 * Start a new user session
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const pathname = url.pathname;

    if (pathname.endsWith('/session/start')) {
      return await startSession(req, userId);
    } else if (pathname.endsWith('/session/end')) {
      return await endSession(req, userId);
    } else if (pathname.endsWith('/event')) {
      return await trackEvent(req, userId);
    } else if (pathname.endsWith('/journey')) {
      return await trackJourney(req, userId);
    }

    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 404 });

  } catch (error) {
    console.error('Error in behavior tracking:', error);
    return NextResponse.json(
      { error: 'Failed to track behavior' },
      { status: 500 }
    );
  }
}

/**
 * Start a new session
 */
async function startSession(req: NextRequest, userId: string) {
  const body = await req.json();
  const {
    sessionId,
    landingPage,
    userAgent,
    ipAddress,
    device,
    browser,
    os,
    country,
    city
  } = body;

  const session = await prisma.userSession.create({
    data: {
      userId,
      clerkUserId: userId,
      sessionId,
      landingPage,
      userAgent,
      ipAddress,
      device,
      browser,
      os,
      country,
      city,
      pagesVisited: [landingPage].filter(Boolean)
    }
  });

  return NextResponse.json({
    success: true,
    session: {
      id: session.id,
      sessionId: session.sessionId,
      startedAt: session.startedAt
    }
  });
}

/**
 * End a session
 */
async function endSession(req: NextRequest, userId: string) {
  const body = await req.json();
  const { sessionId, exitPage } = body;

  const session = await prisma.userSession.findFirst({
    where: { sessionId, clerkUserId: userId }
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const duration = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);

  const updatedSession = await prisma.userSession.update({
    where: { id: session.id },
    data: {
      endedAt: new Date(),
      exitPage,
      duration
    }
  });

  return NextResponse.json({
    success: true,
    session: {
      id: updatedSession.id,
      duration: updatedSession.duration
    }
  });
}

/**
 * Track an event
 */
async function trackEvent(req: NextRequest, userId: string) {
  const body = await req.json();
  const {
    sessionId,
    eventType,
    eventName,
    eventCategory,
    page,
    component,
    elementId,
    elementText,
    eventData,
    metadata,
    timeOnPage,
    scrollPosition,
    clickX,
    clickY
  } = body;

  // Create event
  const event = await prisma.userEvent.create({
    data: {
      userId,
      clerkUserId: userId,
      sessionId,
      eventType,
      eventName,
      eventCategory,
      page,
      component,
      elementId,
      elementText,
      eventData: eventData ? JSON.parse(JSON.stringify(eventData)) : null,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      timeOnPage,
      scrollPosition,
      clickX,
      clickY
    }
  });

  // Update session metrics
  await prisma.userSession.update({
    where: { sessionId },
    data: {
      eventsCount: { increment: 1 },
      clickCount: eventType === 'click' ? { increment: 1 } : undefined,
      pageViews: eventType === 'page_view' ? { increment: 1 } : undefined,
      pagesVisited: eventType === 'page_view' && page
        ? { push: page }
        : undefined,
      scrollDepth: scrollPosition
        ? Math.max(scrollPosition / 100, 0)
        : undefined
    }
  });

  return NextResponse.json({
    success: true,
    event: {
      id: event.id,
      eventType: event.eventType,
      eventName: event.eventName,
      timestamp: event.timestamp
    }
  });
}

/**
 * Track a journey
 */
async function trackJourney(req: NextRequest, userId: string) {
  const body = await req.json();
  const {
    sessionId,
    journeyName,
    currentStep,
    totalSteps,
    completedSteps,
    status,
    completed,
    abandoned,
    steps,
    dropOffStep,
    dropOffReason
  } = body;

  // Check if journey exists
  const existingJourney = await prisma.userJourney.findFirst({
    where: {
      clerkUserId: userId,
      sessionId,
      journeyName,
      status: 'in_progress'
    }
  });

  if (existingJourney) {
    // Update existing journey
    const duration = Math.floor((Date.now() - new Date(existingJourney.startedAt).getTime()) / 1000);

    const updatedJourney = await prisma.userJourney.update({
      where: { id: existingJourney.id },
      data: {
        currentStep,
        completedSteps,
        status,
        completed,
        abandoned,
        completedAt: completed ? new Date() : undefined,
        abandonedAt: abandoned ? new Date() : undefined,
        duration: completed || abandoned ? duration : undefined,
        steps: steps ? JSON.parse(JSON.stringify(steps)) : undefined,
        dropOffStep,
        dropOffReason
      }
    });

    return NextResponse.json({
      success: true,
      journey: {
        id: updatedJourney.id,
        status: updatedJourney.status,
        progress: completedSteps / totalSteps
      }
    });
  } else {
    // Create new journey
    const journey = await prisma.userJourney.create({
      data: {
        userId,
        clerkUserId: userId,
        sessionId,
        journeyName,
        currentStep,
        totalSteps,
        completedSteps: completedSteps || 0,
        status: status || 'in_progress',
        completed: completed || false,
        abandoned: abandoned || false,
        steps: steps ? JSON.parse(JSON.stringify(steps)) : []
      }
    });

    return NextResponse.json({
      success: true,
      journey: {
        id: journey.id,
        status: journey.status,
        progress: (completedSteps || 0) / totalSteps
      }
    });
  }
}

/**
 * GET /api/user/behavior/analytics
 * Get user behavior analytics
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const timeRange = url.searchParams.get('range') || '30d';
    
    // Calculate date range
    const daysAgo = timeRange === '7d' ? 7 : 30;
    const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    // Get sessions
    const sessions = await prisma.userSession.findMany({
      where: {
        clerkUserId: userId,
        startedAt: { gte: since }
      },
      orderBy: { startedAt: 'desc' }
    });

    // Get events
    const events = await prisma.userEvent.findMany({
      where: {
        clerkUserId: userId,
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'desc' },
      take: 1000
    });

    // Get journeys
    const journeys = await prisma.userJourney.findMany({
      where: {
        clerkUserId: userId,
        startedAt: { gte: since }
      },
      orderBy: { startedAt: 'desc' }
    });

    // Calculate metrics
    const totalSessions = sessions.length;
    const avgDuration = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
      : 0;
    
    const avgPageViews = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.pageViews, 0) / sessions.length
      : 0;

    const totalEvents = events.length;
    
    // Event breakdown
    const eventsByType = events.reduce((acc: any, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});

    // Top pages
    const pageVisits = events
      .filter(e => e.eventType === 'page_view')
      .reduce((acc: any, event) => {
        acc[event.page] = (acc[event.page] || 0) + 1;
        return acc;
      }, {});

    const topPages = Object.entries(pageVisits)
      .map(([page, count]) => ({ page, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // Journey metrics
    const completedJourneys = journeys.filter(j => j.completed).length;
    const abandonedJourneys = journeys.filter(j => j.abandoned).length;
    const completionRate = journeys.length > 0
      ? (completedJourneys / journeys.length) * 100
      : 0;

    return NextResponse.json({
      success: true,
      timeRange,
      summary: {
        totalSessions,
        avgDuration: Math.round(avgDuration),
        avgPageViews: Math.round(avgPageViews),
        totalEvents
      },
      events: {
        total: totalEvents,
        byType: eventsByType
      },
      pages: {
        topPages
      },
      journeys: {
        total: journeys.length,
        completed: completedJourneys,
        abandoned: abandonedJourneys,
        completionRate: Math.round(completionRate)
      },
      recentSessions: sessions.slice(0, 10),
      recentEvents: events.slice(0, 20)
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}
