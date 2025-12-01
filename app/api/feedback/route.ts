/**
 * HOLLY'S METAMORPHOSIS - PHASE 1: FEEDBACK API
 * 
 * This endpoint receives user feedback (explicit and implicit) from the frontend.
 * POST /api/feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { feedback } from '@/lib/metamorphosis/feedback-system';
import { logger } from '@/lib/metamorphosis/logging-system';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FeedbackRequest {
  type: 'thumbs_up' | 'thumbs_down' | 'rating' | 'regenerate' | 'suggestion' | 'error_report';
  messageId?: string;
  conversationId?: string;
  rating?: number; // 1-5 for rating type
  suggestion?: string; // For suggestions and error reports
  context?: {
    hollyResponse?: string;
    userMessage?: string;
    featureUsed?: string;
    [key: string]: any;
  };
}

/**
 * POST /api/feedback - Record user feedback
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request
    const body: FeedbackRequest = await request.json();
    const { type, messageId, conversationId, rating, suggestion, context } = body;
    
    if (!type) {
      return NextResponse.json(
        { error: 'Feedback type is required' },
        { status: 400 }
      );
    }
    
    await logger.info('user_interaction', `Recording ${type} feedback`, { 
      userId: clerkUserId, 
      conversationId 
    });
    
    // Record feedback based on type
    let feedbackRecord;
    
    switch (type) {
      case 'thumbs_up':
        if (!messageId || !conversationId) {
          return NextResponse.json(
            { error: 'messageId and conversationId required for thumbs_up' },
            { status: 400 }
          );
        }
        feedbackRecord = await feedback.thumbsUp(clerkUserId, messageId, conversationId, context);
        break;
      
      case 'thumbs_down':
        if (!messageId || !conversationId) {
          return NextResponse.json(
            { error: 'messageId and conversationId required for thumbs_down' },
            { status: 400 }
          );
        }
        feedbackRecord = await feedback.thumbsDown(clerkUserId, messageId, conversationId, context);
        break;
      
      case 'rating':
        if (!conversationId || rating === undefined) {
          return NextResponse.json(
            { error: 'conversationId and rating (1-5) required for rating' },
            { status: 400 }
          );
        }
        if (rating < 1 || rating > 5) {
          return NextResponse.json(
            { error: 'Rating must be between 1 and 5' },
            { status: 400 }
          );
        }
        feedbackRecord = await feedback.rating(clerkUserId, rating, conversationId, context);
        break;
      
      case 'regenerate':
        if (!messageId || !conversationId) {
          return NextResponse.json(
            { error: 'messageId and conversationId required for regenerate' },
            { status: 400 }
          );
        }
        feedbackRecord = await feedback.regenerate(clerkUserId, messageId, conversationId, context);
        break;
      
      case 'suggestion':
        if (!conversationId || !suggestion) {
          return NextResponse.json(
            { error: 'conversationId and suggestion text required' },
            { status: 400 }
          );
        }
        feedbackRecord = await feedback.suggestion(clerkUserId, suggestion, conversationId, context);
        break;
      
      case 'error_report':
        if (!conversationId || !suggestion) {
          return NextResponse.json(
            { error: 'conversationId and error description required' },
            { status: 400 }
          );
        }
        feedbackRecord = await feedback.error(clerkUserId, suggestion, conversationId, context);
        break;
      
      default:
        return NextResponse.json(
          { error: `Unknown feedback type: ${type}` },
          { status: 400 }
        );
    }
    
    await logger.info('user_interaction', 'Feedback recorded successfully', { 
      feedbackId: feedbackRecord.id, 
      type, 
      sentiment: feedbackRecord.sentiment 
    });
    
    return NextResponse.json({
      success: true,
      feedback: {
        id: feedbackRecord.id,
        type: feedbackRecord.feedbackType,
        sentiment: feedbackRecord.sentiment,
        timestamp: feedbackRecord.timestamp,
      },
    });
    
  } catch (error) {
    await logger.error('user_interaction', 'Feedback recording failed', {}, {
      errorCode: (error as any).code,
      stackTrace: (error as any).stack,
    });
    
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record feedback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback - Get feedback statistics (optional, for debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    
    // Import getFeedbackStats dynamically to avoid circular imports
    const { getFeedbackStats } = await import('@/lib/metamorphosis/feedback-system');
    const stats = getFeedbackStats(hours);
    
    return NextResponse.json({
      timeWindow: `${hours} hours`,
      stats,
    });
    
  } catch (error) {
    console.error('Feedback stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get feedback stats' },
      { status: 500 }
    );
  }
}
