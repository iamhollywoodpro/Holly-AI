/**
 * Contextual Context API
 * Gets project context and AI-generated suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ContextualIntelligence } from '@/lib/learning/contextual-intelligence';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const contextual = new ContextualIntelligence(userId);

    // Get project context
    const context = await contextual.getProjectContext(projectId);
    
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get patterns
    const patterns = await contextual.detectPatterns();
    
    // Get suggestions with current context
    const suggestions = await contextual.getSuggestions({
      projectId,
      currentTechnologies: context.technologies,
      currentPhase: context.status
    });

    return NextResponse.json({
      success: true,
      context: {
        ...context,
        patterns: patterns.slice(0, 5), // Top 5 patterns
        suggestions: suggestions.slice(0, 10) // Top 10 suggestions
      }
    });
  } catch (error) {
    console.error('Context API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
