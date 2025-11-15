// Predictive Engine - Blocker Anticipation API
// Anticipates potential blockers in projects

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { PredictiveEngine } from '@/lib/creativity/predictive-engine';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
  const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { projectId, timeline } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    const predictive = new PredictiveEngine(userId);
    const blockers = await predictive.anticipateBlockers(projectId, timeline);

    return NextResponse.json({ 
      success: true,
      blockers
    });
  } catch (error: any) {
    console.error('Anticipate blockers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to anticipate blockers' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
  const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    const predictive = new PredictiveEngine(userId);
    const blockers = await predictive.anticipateBlockers(projectId);

    return NextResponse.json({ 
      success: true,
      blockers
    });
  } catch (error: any) {
    console.error('Get blockers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get blockers' },
      { status: 500 }
    );
  }
}
