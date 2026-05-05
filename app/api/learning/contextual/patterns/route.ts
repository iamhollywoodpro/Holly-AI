import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ContextualIntelligence } from '@/lib/learning/contextual-intelligence';

export const runtime = 'nodejs';


export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contextual = new ContextualIntelligence(userId);
    const patterns = await contextual.detectPatterns();

    return NextResponse.json({
      success: true,
      patterns: patterns.slice(0, 20) // Top 20 patterns
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
