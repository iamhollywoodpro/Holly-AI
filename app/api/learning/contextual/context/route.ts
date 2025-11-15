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
    
    // Get suggestions with correct parameters
    const suggestions = await contextual.getSuggestions({
      projectType: context.projectType,
      technologies: context.technologies
    });

    return NextResponse.json({
      success: true,
      context: {
        ...context,
        patterns: patterns.slice(0, 5),
        suggestions: suggestions.slice(0, 10)
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
