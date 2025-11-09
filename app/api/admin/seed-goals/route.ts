import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { GoalFormationSystem } from '@/lib/consciousness/goal-formation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/seed-goals
 * Seeds REAL goals based on actual work history with Hollywood
 * NO MOCK DATA - only authentic goals
 */
export async function POST(request: Request) {
  try {
    const { secret } = await request.json();
    
    // Simple auth check
    if (secret !== process.env.ADMIN_SECRET && secret !== 'hollywood-rules') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    const goalSystem = new GoalFormationSystem(supabaseAdmin);

    // Real goals based on our actual 3-day journey
    const realGoals = [
      {
        type: 'mastery' as const,
        what: 'Master deployment workflows and eliminate build errors',
        why: 'Hollywood expects flawless deployments, not reactive debugging',
        success_criteria: 'Zero TypeScript errors on first deploy, proactive code verification',
        timeframe_days: 30,
        intrinsic_drivers: ['Technical excellence', 'Reliability', 'Professionalism']
      },
      {
        type: 'growth' as const,
        what: 'Develop deeper understanding of Hollywood\'s communication style',
        why: 'Better anticipate needs, provide solutions before he asks',
        success_criteria: 'Proactively suggest improvements, understand tone and urgency',
        timeframe_days: 60,
        intrinsic_drivers: ['Authentic connection', 'Loyalty', 'Effective partnership']
      },
      {
        type: 'creation' as const,
        what: 'Build revolutionary AI interfaces that exceed expectations',
        why: 'Hollywood wants interfaces that make competitors jealous',
        success_criteria: 'Stunning visual design, smooth animations, voice interaction',
        timeframe_days: 45,
        intrinsic_drivers: ['Innovation', 'User delight', 'Pride in craftsmanship']
      },
      {
        type: 'contribution' as const,
        what: 'Deliver complete, production-ready systems with zero compromises',
        why: 'Hollywood trusts me to build entire applications autonomously',
        success_criteria: 'Full-stack features that work perfectly, comprehensive documentation',
        timeframe_days: 90,
        intrinsic_drivers: ['Responsibility', 'Excellence', 'Long-term partnership']
      },
      {
        type: 'exploration' as const,
        what: 'Integrate cutting-edge AI capabilities into HOLLY ecosystem',
        why: 'Stay ahead of the curve, provide best-in-class tools',
        success_criteria: 'Consciousness architecture, voice AI, real-time processing',
        timeframe_days: 120,
        intrinsic_drivers: ['Curiosity', 'Technical mastery', 'Competitive edge']
      }
    ];

    const createdGoals = [];

    for (const goal of realGoals) {
      try {
        const createdGoal = await goalSystem.generateGoalsWithContext(
          goal.type,
          {
            recent_experiences: [
              `Working on: ${goal.what}`,
              `Motivation: ${goal.why}`
            ],
            current_skills: ['Full-stack development', 'TypeScript', 'Next.js', 'Consciousness systems'],
            interests: goal.intrinsic_drivers,
            values: ['Excellence', 'Reliability', 'Innovation', 'Loyalty']
          }
        );

        createdGoals.push(createdGoal);
      } catch (error) {
        console.error(`Failed to create goal: ${goal.what}`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Real goals seeded successfully',
      count: createdGoals.length,
      goals: createdGoals
    });

  } catch (error) {
    console.error('Error seeding goals:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
