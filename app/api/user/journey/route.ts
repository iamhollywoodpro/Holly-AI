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
        orderBy: {
          startedAt: 'desc'
        },
        take: 50
      });

      return NextResponse.json({ journeys });
    }

    if (action === 'stats') {
      // Get journey statistics
      const [totalJourneys, completedJourneys, averageDuration] = await Promise.all([
        prisma.userJourney.count({
          where: {
            clerkUserId: userId,
            startedAt: { gte: startDate }
          }
        }),
        prisma.userJourney.count({
          where: {
            clerkUserId: userId,
            status: 'completed',
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
        inProgress: totalJourneys - completedJourneys,
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
      const { goal, entryPoint, metadata } = body;

      const journey = await prisma.userJourney.create({
        data: {
          clerkUserId: userId,
          userId,
          goal: goal || 'browse',
          entryPoint: entryPoint || 'homepage',
          status: 'in_progress',
          metadata: metadata || {},
          startedAt: new Date()
        }
      });

      return NextResponse.json({ success: true, journey });
    }

    if (action === 'complete') {
      const { journeyId, completedGoal } = body;

      const journey = await prisma.userJourney.update({
        where: { id: journeyId },
        data: {
          status: 'completed',
          completedGoal: completedGoal || false,
          completedAt: new Date()
        }
      });

      return NextResponse.json({ success: true, journey });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' });

  } catch (error) {
    console.error('Journey POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create journey' },
      { status: 500 }
    );
  }
}
