// User Journey API
// Phase 4B: Track and visualize user journeys

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch user journeys
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const range = searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    const daysAgo = parseInt(range.replace('d', '')) || 7;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    if (action === 'list') {
      // Get user journeys
      const journeys = await prisma.userJourney.findMany({
        where: {
          clerkUserId: userId,
          startedAt: {
            gte: startDate
          }
        },
        include: {
          session: {
            select: {
              id: true,
              startTime: true,
              endTime: true
            }
          }
        },
        orderBy: {
          startedAt: 'desc'
        },
        take: 50
      });

      return NextResponse.json({ journeys });
    }

    if (action === 'stats') {
      // Get journey statistics
      const [totalJourneys, completedJourneys, abandonedJourneys, averageDuration] = await Promise.all([
        prisma.userJourney.count({
          where: {
            clerkUserId: userId,
            startedAt: { gte: startDate }
          }
        }),
        prisma.userJourney.count({
          where: {
            clerkUserId: userId,
            completed: true,
            startedAt: { gte: startDate }
          }
        }),
        prisma.userJourney.count({
          where: {
            clerkUserId: userId,
            abandoned: true,
            startedAt: { gte: startDate }
          }
        }),
        prisma.userJourney.aggregate({
          where: {
            clerkUserId: userId,
            duration: { not: null },
            startedAt: { gte: startDate }
          },
          _avg: {
            duration: true
          }
        })
      ]);

      const stats = {
        total: totalJourneys,
        completed: completedJourneys,
        abandoned: abandonedJourneys,
        inProgress: totalJourneys - completedJourneys - abandonedJourneys,
        averageDuration: Math.round(averageDuration._avg.duration || 0),
        completionRate: totalJourneys > 0 ? Math.round((completedJourneys / totalJourneys) * 100) : 0
      };

      return NextResponse.json({ stats });
    }

    // Default: return empty response
    return NextResponse.json({ 
      journeys: [],
      stats: {
        total: 0,
        completed: 0,
        abandoned: 0,
        inProgress: 0,
        averageDuration: 0,
        completionRate: 0
      }
    });

  } catch (error) {
    console.error('Journey GET error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch journeys',
        journeys: [],
        stats: {
          total: 0,
          completed: 0,
          abandoned: 0,
          inProgress: 0,
          averageDuration: 0,
          completionRate: 0
        }
      },
      { status: 200 } // Return 200 to avoid crashing UI
    );
  }
}

// POST: Create or update journey
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'start') {
      const { 
        sessionId, 
        journeyName, 
        currentStep, 
        totalSteps,
        steps 
      } = body;

      if (!sessionId || !journeyName) {
        return NextResponse.json(
          { success: false, error: 'sessionId and journeyName required' },
          { status: 400 }
        );
      }

      const journey = await prisma.userJourney.create({
        data: {
          clerkUserId: userId,
          userId,
          sessionId,
          journeyName,
          currentStep: currentStep || 'start',
          totalSteps: totalSteps || 1,
          completedSteps: 0,
          status: 'in_progress',
          completed: false,
          abandoned: false,
          steps: steps || [],
          startedAt: new Date()
        }
      });

      return NextResponse.json({ success: true, journey });
    }

    if (action === 'complete') {
      const { journeyId } = body;

      if (!journeyId) {
        return NextResponse.json(
          { success: false, error: 'journeyId required' },
          { status: 400 }
        );
      }

      const journey = await prisma.userJourney.update({
        where: { id: journeyId },
        data: {
          status: 'completed',
          completed: true,
          completedAt: new Date()
        }
      });

      return NextResponse.json({ success: true, journey });
    }

    if (action === 'abandon') {
      const { journeyId, dropOffStep, dropOffReason } = body;

      if (!journeyId) {
        return NextResponse.json(
          { success: false, error: 'journeyId required' },
          { status: 400 }
        );
      }

      const journey = await prisma.userJourney.update({
        where: { id: journeyId },
        data: {
          status: 'abandoned',
          abandoned: true,
          abandonedAt: new Date(),
          dropOffStep,
          dropOffReason
        }
      });

      return NextResponse.json({ success: true, journey });
    }

    if (action === 'update-step') {
      const { journeyId, currentStep, completedSteps } = body;

      if (!journeyId) {
        return NextResponse.json(
          { success: false, error: 'journeyId required' },
          { status: 400 }
        );
      }

      const journey = await prisma.userJourney.update({
        where: { id: journeyId },
        data: {
          currentStep,
          ...(completedSteps !== undefined && { completedSteps })
        }
      });

      return NextResponse.json({ success: true, journey });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' });

  } catch (error) {
    console.error('Journey POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process journey' },
      { status: 200 } // Return 200 to prevent UI crash
    );
  }
}
