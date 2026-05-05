/**
 * PHASE 3: Experiences API
 * Get learning experiences and statistics
 */

import { NextResponse } from 'next/server';
import { ExperienceTracker, getExperiences } from '@/lib/metamorphosis/experience-tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const outcome = searchParams.get('outcome') as any;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get experiences
    const experiences = await getExperiences({ type, outcome, limit });

    // Get statistics
    const tracker = new ExperienceTracker();
    const stats = await tracker.getStatistics();

    return NextResponse.json({
      success: true,
      count: experiences.length,
      experiences,
      statistics: stats
    });
  } catch (error: any) {
    console.error('[Experiences API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
