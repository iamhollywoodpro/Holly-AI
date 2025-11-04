// HOLLY Feature 44: Emotional Intelligence - API Routes
// REST API endpoints for emotion detection, tone adaptation, and insights

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import EmotionalManager from '@/lib/emotional/emotional-manager';
import SentimentAnalyzer from '@/lib/emotional/sentiment-analyzer';
import ToneAdapter from '@/lib/emotional/tone-adapter';

// ============================================================================
// INITIALIZE
// ============================================================================

const getEmotionalManager = () => {
  return new EmotionalManager({
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    groq_api_key: process.env.GROQ_API_KEY,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
    google_api_key: process.env.GOOGLE_API_KEY,
  });
};

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { action, user_id } = body as any;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const manager = getEmotionalManager();

    switch (action) {
      // -----------------------------------------------------------------------
      // ANALYZE EMOTION
      // -----------------------------------------------------------------------
      case 'analyze_emotion': {
        const { message } = body as any;

        if (!message) {
          return NextResponse.json(
            { error: 'message is required' },
            { status: 400 }
          );
        }

        const analyzer = new SentimentAnalyzer({
          groq_api_key: process.env.GROQ_API_KEY,
          anthropic_api_key: process.env.ANTHROPIC_API_KEY,
          google_api_key: process.env.GOOGLE_API_KEY,
        });

        const emotion = await analyzer.analyzeEmotion(message);

        // Log to database
        await manager.logEmotion(user_id, message, emotion);

        return NextResponse.json({
          success: true,
          emotion,
        });
      }

      // -----------------------------------------------------------------------
      // ADAPT TONE
      // -----------------------------------------------------------------------
      case 'adapt_tone': {
        const { message, response } = body as any;

        if (!message || !response) {
          return NextResponse.json(
            { error: 'message and response are required' },
            { status: 400 }
          );
        }

        const analyzer = new SentimentAnalyzer({
          groq_api_key: process.env.GROQ_API_KEY,
          anthropic_api_key: process.env.ANTHROPIC_API_KEY,
          google_api_key: process.env.GOOGLE_API_KEY,
        });

        const emotion = await analyzer.analyzeEmotion(message);
        
        const toneAdapter = new ToneAdapter();
        const adaptedResponse = toneAdapter.adaptTone(response, emotion);

        return NextResponse.json({
          success: true,
          emotion,
          adapted_response: adaptedResponse,
        });
      }

      // -----------------------------------------------------------------------
      // PROCESS MESSAGE (Full workflow)
      // -----------------------------------------------------------------------
      case 'process_message': {
        const { message, response } = body as any;

        if (!message || !response) {
          return NextResponse.json(
            { error: 'message and response are required' },
            { status: 400 }
          );
        }

        const result = await manager.processMessage(user_id, message, response);

        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      // -----------------------------------------------------------------------
      // GET INSIGHTS
      // -----------------------------------------------------------------------
      case 'get_insights': {
        const insights = await manager.getEmotionalInsights(user_id);

        return NextResponse.json({
          success: true,
          insights,
        });
      }

      // -----------------------------------------------------------------------
      // GET RECENT EMOTIONS
      // -----------------------------------------------------------------------
      case 'get_recent_emotions': {
        const { limit = 20 } = body as any;

        const emotions = await manager.getRecentEmotions(user_id, limit);

        return NextResponse.json({
          success: true,
          emotions,
          count: emotions.length,
        });
      }

      // -----------------------------------------------------------------------
      // UPDATE BASELINE
      // -----------------------------------------------------------------------
      case 'update_baseline': {
        await manager.updateEmotionalBaseline(user_id);

        const baseline = await manager.getEmotionalBaseline(user_id);

        return NextResponse.json({
          success: true,
          baseline,
        });
      }

      // -----------------------------------------------------------------------
      // GET BASELINE
      // -----------------------------------------------------------------------
      case 'get_baseline': {
        const baseline = await manager.getEmotionalBaseline(user_id);

        return NextResponse.json({
          success: true,
          baseline,
        });
      }

      // -----------------------------------------------------------------------
      // GET CONVERSATION HISTORY
      // -----------------------------------------------------------------------
      case 'get_conversation_history': {
        const { limit } = body as any;

        const history = manager.getConversationHistory(user_id, limit);

        return NextResponse.json({
          success: true,
          history,
          count: history.length,
        });
      }

      // -----------------------------------------------------------------------
      // CLEAR CONVERSATION HISTORY
      // -----------------------------------------------------------------------
      case 'clear_conversation_history': {
        manager.clearConversationHistory(user_id);

        return NextResponse.json({
          success: true,
          message: 'Conversation history cleared',
        });
      }

      // -----------------------------------------------------------------------
      // BATCH ANALYZE
      // -----------------------------------------------------------------------
      case 'batch_analyze': {
        const { messages } = body as any;

        if (!Array.isArray(messages) || messages.length === 0) {
          return NextResponse.json(
            { error: 'messages array is required' },
            { status: 400 }
          );
        }

        const analyzer = new SentimentAnalyzer({
          groq_api_key: process.env.GROQ_API_KEY,
          anthropic_api_key: process.env.ANTHROPIC_API_KEY,
          google_api_key: process.env.GOOGLE_API_KEY,
        });

        const emotions = await analyzer.analyzeBatch(messages);

        // Log all to database
        for (let i = 0; i < messages.length; i++) {
          await manager.logEmotion(user_id, messages[i], emotions[i]);
        }

        return NextResponse.json({
          success: true,
          emotions,
          count: emotions.length,
        });
      }

      // -----------------------------------------------------------------------
      // DETECT PATTERNS
      // -----------------------------------------------------------------------
      case 'detect_patterns': {
        const { limit = 20 } = body as any;

        const emotions = await manager.getRecentEmotions(user_id, limit);
        
        const analyzer = new SentimentAnalyzer();
        const patterns = analyzer.detectPatterns(emotions);

        return NextResponse.json({
          success: true,
          patterns,
          based_on_messages: emotions.length,
        });
      }

      // -----------------------------------------------------------------------
      // GET STATS
      // -----------------------------------------------------------------------
      case 'get_stats': {
        const { days = 7 } = body as any;

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        const { data, error } = await supabase
          .from('emotion_logs')
          .select('*')
          .eq('user_id', user_id)
          .gte('created_at', sinceDate.toISOString());

        if (error) throw error;

        // Calculate stats
        const emotions = data || [];
        const emotionCounts: Record<string, number> = {};
        let totalSentiment = 0;
        let totalStress = 0;
        let totalEnergy = 0;
        let supportNeeded = 0;

        emotions.forEach(e => {
          emotionCounts[e.primary_emotion] = (emotionCounts[e.primary_emotion] || 0) + 1;
          totalSentiment += e.sentiment_score;
          totalStress += e.stress_level;
          totalEnergy += e.energy_level;
          if (e.needs_support) supportNeeded++;
        });

        const count = emotions.length;

        return NextResponse.json({
          success: true,
          stats: {
            total_messages: count,
            days_analyzed: days,
            emotion_distribution: emotionCounts,
            average_sentiment: count > 0 ? totalSentiment / count : 0,
            average_stress: count > 0 ? totalStress / count : 0,
            average_energy: count > 0 ? totalEnergy / count : 0,
            support_needed_percentage: count > 0 ? (supportNeeded / count) * 100 : 0,
          },
        });
      }

      // -----------------------------------------------------------------------
      // UNKNOWN ACTION
      // -----------------------------------------------------------------------
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Emotional API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET HANDLER (Read-only operations)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    const action = searchParams.get('action');

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const manager = getEmotionalManager();

    switch (action) {
      case 'get_insights': {
        const insights = await manager.getEmotionalInsights(user_id);
        return NextResponse.json({ success: true, insights });
      }

      case 'get_baseline': {
        const baseline = await manager.getEmotionalBaseline(user_id);
        return NextResponse.json({ success: true, baseline });
      }

      case 'get_recent_emotions': {
        const limit = parseInt(searchParams.get('limit') || '20');
        const emotions = await manager.getRecentEmotions(user_id, limit);
        return NextResponse.json({ success: true, emotions, count: emotions.length });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Emotional API GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
