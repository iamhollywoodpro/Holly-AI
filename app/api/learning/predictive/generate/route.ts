// Predictive Engine - Generate Suggestions API
// Generates creative suggestions based on patterns

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { PredictiveEngine } from '@/lib/creativity/predictive-engine';

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
    const { projectType, context } = body;

    if (!projectType) {
      return NextResponse.json(
        { error: 'Missing required field: projectType' },
        { status: 400 }
      );
    }

    const predictive = new PredictiveEngine(userId);
    const suggestions = await predictive.generateSuggestions(projectType, context);

    return NextResponse.json({ 
      success: true,
      suggestions
    });
  } catch (error: any) {
    console.error('Generate suggestions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate suggestions' },
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
    const projectType = searchParams.get('projectType');

    if (!projectType) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectType' },
        { status: 400 }
      );
    }

    const predictive = new PredictiveEngine(userId);
    const suggestions = await predictive.generateSuggestions(projectType, {});

    return NextResponse.json({ 
      success: true,
      suggestions
    });
  } catch (error: any) {
    console.error('Get suggestions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
