// Contextual Intelligence - Context API
// Gets context-aware suggestions and project context

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
    const { projectId, action } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    const contextual = new ContextualIntelligence(userId);

    if (action === 'suggestions') {
      const suggestions = await contextual.getSuggestions(projectId);
      return NextResponse.json({ 
        success: true,
        suggestions
      });
    }

    // Default: get full context
    const context = await contextual.getContext(projectId);
    return NextResponse.json({ 
      success: true,
      context
    });
  } catch (error: any) {
    console.error('Get context error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get context' },
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
    const context = await contextual.getContext(projectId);

    return NextResponse.json({ 
      success: true,
      context
    });
  } catch (error: any) {
    console.error('Get context error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get context' },
      { status: 500 }
    );
  }
}
