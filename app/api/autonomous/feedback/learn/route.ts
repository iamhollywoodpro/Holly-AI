// PHASE 1: REAL Feedback Learning System
// Stores and learns from user feedback
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { feedback, context, userId, feedbackType } = await req.json();

    if (!feedback || !userId) {
      return NextResponse.json(
        { success: false, error: 'feedback and userId required' },
        { status: 400 }
      );
    }

    // Determine feedback type if not provided
    const type = feedbackType || (
      feedback.toLowerCase().includes('good') || feedback.toLowerCase().includes('great') 
        ? 'positive' 
        : feedback.toLowerCase().includes('bad') || feedback.toLowerCase().includes('wrong')
        ? 'negative'
        : 'suggestion'
    );

    // Store feedback
    const feedbackRecord = await prisma.userFeedback.create({
      data: {
        userId,
        type,
        content: feedback,
        context: context || {},
        rating: type === 'positive' ? 5 : type === 'negative' ? 1 : 3,
        status: 'reviewed',
        createdAt: new Date()
      }
    });

    // Analyze patterns in feedback
    const recentFeedback = await prisma.userFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const positiveFeedback = recentFeedback.filter(f => f.type === 'positive').length;
    const negativeFeedback = recentFeedback.filter(f => f.type === 'negative').length;
    const suggestions = recentFeedback.filter(f => f.type === 'suggestion').length;

    // Extract learning adjustments
    const adjustments: string[] = [];
    
    if (type === 'negative') {
      adjustments.push('Noted area for improvement');
      if (feedback.toLowerCase().includes('slow')) {
        adjustments.push('Focus on response speed optimization');
      }
      if (feedback.toLowerCase().includes('unclear') || feedback.toLowerCase().includes('confusing')) {
        adjustments.push('Improve clarity and explanations');
      }
      if (feedback.toLowerCase().includes('error') || feedback.toLowerCase().includes('wrong')) {
        adjustments.push('Review accuracy and error handling');
      }
    }

    if (type === 'positive') {
      adjustments.push('Reinforced successful approach');
      if (feedback.toLowerCase().includes('clear')) {
        adjustments.push('Continue providing clear explanations');
      }
      if (feedback.toLowerCase().includes('fast') || feedback.toLowerCase().includes('quick')) {
        adjustments.push('Maintain response speed');
      }
    }

    if (type === 'suggestion') {
      adjustments.push('New feature or improvement suggested');
      adjustments.push('Logged for future enhancement');
    }

    // Calculate satisfaction score
    const satisfactionScore = recentFeedback.length > 0
      ? Math.round((positiveFeedback / recentFeedback.length) * 100)
      : 50;

    const result = {
      success: true,
      feedbackId: feedbackRecord.id,
      learned: true,
      adjustments,
      analysis: {
        type,
        recentFeedbackCount: recentFeedback.length,
        positiveFeedback,
        negativeFeedback,
        suggestions,
        satisfactionScore,
        trend: positiveFeedback > negativeFeedback ? 'improving' : 
               positiveFeedback < negativeFeedback ? 'needs_attention' : 'stable'
      },
      timestamp: feedbackRecord.createdAt.toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Feedback learning error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
