/**
 * AUTONOMOUS OPERATION ACTIVATION API
 * 
 * Enables/disables Holly's autonomous operation capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { codeGenerator } from '../../../../lib/autonomous/code-generator';
import { learningEngine } from '../../../../lib/autonomous/learning-engine';
import { reflectionEngine } from '../../../../lib/autonomous/reflection-engine';
import { selfDiagnosis } from '../../../../lib/autonomous/self-diagnosis';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, features } = body;

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { clerkUserId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dbUserId = user.id;

    if (action === 'activate') {
      console.log('[Autonomous] Activating autonomous operation for user:', dbUserId);

      // Run initial system health check
      const health = await selfDiagnosis.checkSystemHealth();
      console.log('[Autonomous] System health:', health.overall_status);

      if (health.overall_status === 'critical') {
        return NextResponse.json({
          error: 'Cannot activate: System health is critical',
          health
        }, { status: 500 });
      }

      // Run initial learning cycle
      console.log('[Autonomous] Running initial learning cycle...');
      const learningResult = await learningEngine.runLearningCycle(dbUserId);
      console.log('[Autonomous] Learning cycle complete:', {
        insights: learningResult.insights.length,
        patterns: learningResult.patterns.length,
        strategies: learningResult.strategies.length
      });

      // Run initial reflection
      console.log('[Autonomous] Running initial reflection...');
      await reflectionEngine.dailyReflection(dbUserId);

      // Record activation
      await prisma.hollyExperience.create({
        data: {
          userId: dbUserId,
          type: 'autonomous_activation',
          content: {
            action: 'activate',
            features: features || ['all'],
            health: health.overall_status,
            timestamp: new Date()
          },
          significance: 1.0,
          lessons: ['Autonomous operation activated'],
          relatedConcepts: ['autonomy', 'self-operation'],
          futureImplications: ['Can now operate autonomously'],
          emotionalImpact: 0.9,
          timestamp: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Autonomous operation activated',
        health,
        learning: {
          insights: learningResult.insights.length,
          patterns: learningResult.patterns.length,
          strategies: learningResult.strategies.length
        }
      });
    }

    if (action === 'deactivate') {
      console.log('[Autonomous] Deactivating autonomous operation for user:', dbUserId);

      await prisma.hollyExperience.create({
        data: {
          userId: dbUserId,
          type: 'autonomous_deactivation',
          content: {
            action: 'deactivate',
            timestamp: new Date()
          },
          significance: 0.7,
          lessons: ['Autonomous operation deactivated'],
          relatedConcepts: ['autonomy'],
          futureImplications: [],
          emotionalImpact: -0.3,
          timestamp: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Autonomous operation deactivated'
      });
    }

    if (action === 'status') {
      // Get system health
      const health = await selfDiagnosis.checkSystemHealth();

      // Get recent autonomous activities
      const recentActivities = await prisma.hollyExperience.findMany({
        where: {
          userId: dbUserId,
          type: {
            in: ['learning_cycle', 'self_reflection', 'code_generation', 'autonomous_activation']
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      });

      return NextResponse.json({
        health,
        recent_activities: recentActivities.length,
        last_activity: recentActivities[0]?.timestamp || null,
        is_active: health.overall_status !== 'critical'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Autonomous] Activation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get system health
    const health = await selfDiagnosis.checkSystemHealth();

    // Get recent autonomous activities
    const recentActivities = await prisma.hollyExperience.findMany({
      where: {
        userId: user.id,
        type: {
          in: ['learning_cycle', 'self_reflection', 'code_generation']
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    return NextResponse.json({
      health,
      recent_activities: recentActivities.map(a => ({
        type: a.type,
        timestamp: a.timestamp,
        significance: a.significance
      })),
      is_active: health.overall_status !== 'critical'
    });
  } catch (error) {
    console.error('[Autonomous] Status check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
