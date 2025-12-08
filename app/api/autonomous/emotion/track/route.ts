// PHASE 1: REAL Emotional State Tracking
// Stores and queries EmotionalState from database
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { interaction, userId, emotionDetected, confidence, sentiment } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    // Analyze interaction for emotion (simple keyword-based for now)
    let detectedEmotion = emotionDetected || 'neutral';
    let emotionConfidence = confidence || 0.5;
    let emotionSentiment = sentiment || 'neutral';

    if (interaction) {
      const text = interaction.toLowerCase();
      
      // Simple emotion detection
      if (text.includes('upset') || text.includes('angry') || text.includes('frustrated')) {
        detectedEmotion = 'frustrated';
        emotionSentiment = 'negative';
        emotionConfidence = 0.8;
      } else if (text.includes('happy') || text.includes('great') || text.includes('excellent')) {
        detectedEmotion = 'happy';
        emotionSentiment = 'positive';
        emotionConfidence = 0.85;
      } else if (text.includes('confused') || text.includes('unsure')) {
        detectedEmotion = 'confused';
        emotionSentiment = 'neutral';
        emotionConfidence = 0.75;
      } else if (text.includes('excited') || text.includes('amazing')) {
        detectedEmotion = 'excited';
        emotionSentiment = 'positive';
        emotionConfidence = 0.9;
      }
    }

    // Store in database
    const emotionalState = await prisma.emotionalState.create({
      data: {
        userId,
        primaryEmotion: detectedEmotion,
        intensity: emotionConfidence,
        valence: emotionSentiment === 'positive' ? 0.7 : emotionSentiment === 'negative' ? -0.7 : 0,
        arousal: emotionConfidence,
        secondaryEmotions: [],
        triggers: interaction ? [interaction.substring(0, 100)] : [],
        cues: [],
        context: { interaction, sentiment: emotionSentiment },
        timestamp: new Date()
      }
    });

    // Get recent emotional pattern
    const recentStates = await prisma.emotionalState.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    const emotionCounts: Record<string, number> = {};
    recentStates.forEach(state => {
      emotionCounts[state.primaryEmotion] = (emotionCounts[state.primaryEmotion] || 0) + 1;
    });

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral';

    const result = {
      success: true,
      emotionId: emotionalState.id,
      emotion: {
        current: detectedEmotion,
        confidence: Math.round(emotionConfidence * 100) / 100,
        sentiment: emotionSentiment,
        intensity: emotionalState.intensity
      },
      pattern: {
        dominant: dominantEmotion,
        recent: recentStates.slice(0, 5).map(s => s.primaryEmotion),
        stability: recentStates.length >= 3 && 
                   recentStates.slice(0, 3).every(s => s.primaryEmotion === recentStates[0].primaryEmotion)
                   ? 'stable' : 'variable'
      },
      timestamp: emotionalState.timestamp.toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Emotional state tracking error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
