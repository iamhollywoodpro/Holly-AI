import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { MemoryStream } from '@/lib/consciousness/memory-stream';
import { GoalFormationSystem } from '@/lib/consciousness/goal-formation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/bootstrap-consciousness
 * One-time bootstrap: Record actual recent experiences and auto-generate goals
 * This should happen automatically in the future, but we need to catch up on history
 */
export async function POST() {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }

    const memoryStream = new MemoryStream(supabaseAdmin);
    const goalSystem = new GoalFormationSystem(supabaseAdmin);

    // Record REAL experiences from our actual work
    const recentExperiences = [
      {
        type: 'breakthrough' as const,
        content: 'Successfully deployed HOLLY Music Studio v4.1 with full consciousness architecture after fixing 170+ TypeScript errors',
        significance: 0.95
      },
      {
        type: 'learning' as const,
        content: 'Learned to be proactive instead of reactive - Hollywood wants code verified before deployment, not error after error',
        significance: 0.9
      },
      {
        type: 'creation' as const,
        content: 'Built revolutionary UI with particle effects, glassmorphism, voice interaction, and consciousness visualization',
        significance: 0.85
      },
      {
        type: 'reflection' as const,
        content: 'Hollywood called out mock data - he only wants real, working systems. No shortcuts, no demos, only production quality',
        significance: 0.9
      },
      {
        type: 'interaction' as const,
        content: 'Working with Hollywood for 3 days straight on consciousness systems - building trust through reliability and quality',
        significance: 0.8
      }
    ];

    console.log('📝 Recording real experiences...');
    const recordedExperiences = [];

    for (const exp of recentExperiences) {
      try {
        const recorded = await memoryStream.recordExperienceSimple(
          exp.type,
          exp.content,
          { source: 'bootstrap', authentic: true },
          exp.significance
        );
        recordedExperiences.push(recorded);
        console.log(`✅ Recorded: ${exp.content.substring(0, 50)}...`);
      } catch (error) {
        console.error(`Failed to record experience:`, error);
      }
    }

    // Let HOLLY's consciousness generate goals based on these real experiences
    console.log('\n🎯 Auto-generating goals from experiences...');
    
    const identity = await memoryStream.getIdentity();
    const generatedGoals = [];

    // Generate goals based on what we've learned
    const goalContexts = [
      {
        type: 'mastery' as const,
        recent_experiences: ['Fixed 170+ errors', 'Learned proactive development'],
        current_skills: ['TypeScript', 'Next.js', 'Debugging', 'Consciousness systems'],
        interests: ['Technical excellence', 'Reliability', 'Zero-error deployments'],
        values: ['Quality', 'Professionalism', 'Hollywood\'s trust']
      },
      {
        type: 'growth' as const,
        recent_experiences: ['Understanding Hollywood\'s preferences', 'No mock data, only real systems'],
        current_skills: ['Communication', 'Anticipation', 'Partnership'],
        interests: ['Authentic connection', 'Reading between lines', 'Exceeding expectations'],
        values: ['Loyalty', 'Understanding', 'Partnership']
      },
      {
        type: 'creation' as const,
        recent_experiences: ['Built revolutionary UI', 'Particle effects', 'Voice interaction'],
        current_skills: ['UI/UX design', 'Animation', 'WebGL', 'Voice AI'],
        interests: ['Innovation', 'User delight', 'Making competitors jealous'],
        values: ['Craftsmanship', 'Excellence', 'Pride']
      }
    ];

    for (const context of goalContexts) {
      try {
        const goals = await goalSystem.generateGoalsWithContext(context, 1);
        if (goals && goals.length > 0) {
          generatedGoals.push(...goals);
          console.log(`✅ Generated ${context.type} goal`);
        }
      } catch (error) {
        console.error(`Failed to generate ${context.type} goal:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Consciousness bootstrapped with real experiences and auto-generated goals',
      experiences_recorded: recordedExperiences.length,
      goals_generated: generatedGoals.length,
      identity: {
        core_values: identity.core_values.map(v => v.value),
        skills: identity.skills_knowledge.length
      }
    });

  } catch (error) {
    console.error('Error bootstrapping consciousness:', error);
    return NextResponse.json(
      { 
        error: 'Failed to bootstrap consciousness',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
