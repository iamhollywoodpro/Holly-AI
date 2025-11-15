// Contextual Intelligence - Patterns Analysis API
// Analyzes patterns in project activities

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
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    const contextual = new ContextualIntelligence(userId);
    const patterns = await contextual.analyzePatterns(projectId);

    return NextResponse.json({ 
      success: true,
      patterns
    });
  } catch (error: any) {
    console.error('Analyze patterns error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze patterns' },
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

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    const contextual = new ContextualIntelligence(userId);
    const patterns = await contextual.analyzePatterns(projectId);

    return NextResponse.json({ 
      success: true,
      patterns
    });
  } catch (error: any) {
    console.error('Get patterns error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get patterns' },
      { status: 500 }
    );
  }
}
