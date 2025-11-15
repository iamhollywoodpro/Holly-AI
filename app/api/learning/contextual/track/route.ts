// Contextual Intelligence - Track Activity API
// Tracks project activities and context for learning patterns

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { ContextualIntelligence } from '@/lib/learning/contextual-intelligence';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { projectId, activity } = body;

    if (!projectId || !activity) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, activity' },
        { status: 400 }
      );
    }

    const contextual = new ContextualIntelligence(userId);
    await contextual.trackActivity(projectId, activity);

    return NextResponse.json({ 
      success: true,
      message: 'Activity tracked successfully'
    });
  } catch (error: any) {
    console.error('Track activity error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track activity' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const contextual = new ContextualIntelligence(userId);
    const activities = await contextual.getActivities(projectId || undefined);

    return NextResponse.json({ 
      success: true,
      activities
    });
  } catch (error: any) {
    console.error('Get activities error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get activities' },
      { status: 500 }
    );
  }
}
