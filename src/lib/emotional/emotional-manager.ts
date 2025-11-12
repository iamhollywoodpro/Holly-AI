// HOLLY Feature 44: Emotional Intelligence - Emotional Manager
// High-level coordinator for emotion detection, tone adaptation, and pattern tracking

// REMOVED: Supabase import (migrated to Prisma)
import SentimentAnalyzer, { EmotionAnalysis, EmotionalPattern } from './sentiment-analyzer';
import ToneAdapter, { AdaptedResponse, ToneAdapterConfig } from './tone-adapter';

// ============================================================================
// TYPES
// ============================================================================

export interface EmotionalManagerConfig {
  supabase_url: string;
  supabase_key: string;
  groq_api_key?: string;
  anthropic_api_key?: string;
  google_api_key?: string;
  tone_config?: ToneAdapterConfig;
}

export interface EmotionalInsights {
  current_emotion: EmotionAnalysis;
  emotional_baseline: EmotionalPattern | null;
  recent_patterns: {
    dominant_emotion: string;
    average_sentiment: number;
    stress_trend: 'increasing' | 'decreasing' | 'stable';
    energy_trend: 'increasing' | 'decreasing' | 'stable';
    needs_intervention: boolean;
  };
  recommendations: string[];
}

export interface ConversationContext {
  message_id: string;
  user_id: string;
  message: string;
  emotion: EmotionAnalysis;
  adapted_response?: AdaptedResponse;
  timestamp: string;
}

// ============================================================================
// EMOTIONAL MANAGER
// ============================================================================

export class EmotionalManager {
  private supabase: SupabaseClient;
  private analyzer: SentimentAnalyzer;
  private toneAdapter: ToneAdapter;
  private conversationHistory: Map<string, ConversationContext[]> = new Map();

  constructor(config: EmotionalManagerConfig) {
    // Initialize Supabase
    this.supabase = createClient(config.supabase_url, config.supabase_key);

    // Initialize Sentiment Analyzer
    this.analyzer = new SentimentAnalyzer({
      groq_api_key: config.groq_api_key,
      anthropic_api_key: config.anthropic_api_key,
      google_api_key: config.google_api_key,
    });

    // Initialize Tone Adapter
    this.toneAdapter = new ToneAdapter(config.tone_config);
  }

  // --------------------------------------------------------------------------
  // MAIN WORKFLOW
  // --------------------------------------------------------------------------

  async processMessage(
    userId: string,
    message: string,
    response: string
  ): Promise<{
    emotion: EmotionAnalysis;
    adapted_response: AdaptedResponse;
    insights: EmotionalInsights;
  }> {
    try {
      // 1. Analyze emotion
      const emotion = await this.analyzer.analyzeEmotion(message);

      // 2. Adapt response tone
      const adapted_response = this.toneAdapter.adaptTone(response, emotion);

      // 3. Log to database
      await this.logEmotion(userId, message, emotion);

      // 4. Update conversation history
      this.updateConversationHistory(userId, {
        message_id: this.generateMessageId(),
        user_id: userId,
        message,
        emotion,
        adapted_response,
        timestamp: new Date().toISOString(),
      });

      // 5. Get insights
      const insights = await this.getEmotionalInsights(userId);

      return {
        emotion,
        adapted_response,
        insights,
      };
    } catch (error) {
      console.error('Process message error:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // EMOTION TRACKING
  // --------------------------------------------------------------------------

  async logEmotion(userId: string, message: string, emotion: EmotionAnalysis): Promise<void> {
    try {
      const { error } = // TODO: await this.supabase.from('emotion_logs').insert({
        user_id: userId,
        message_text: message.substring(0, 1000), // Truncate long messages
        primary_emotion: emotion.primary_emotion,
        secondary_emotions: emotion.secondary_emotions,
        intensity: emotion.intensity,
        sentiment_score: emotion.sentiment_score,
        confidence: emotion.confidence,
        needs_support: emotion.needs_support,
        stress_level: emotion.stress_level,
        energy_level: emotion.energy_level,
        context: emotion.context,
        suggested_response_tone: emotion.suggested_response_tone,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error('Log emotion error:', error);
      // Don't throw - logging failure shouldn't break the flow
    }
  }

  async getRecentEmotions(userId: string, limit: number = 20): Promise<EmotionAnalysis[]> {
    try {
      const { data, error } = await this.supabase
        .from('emotion_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(row => ({
        primary_emotion: row.primary_emotion,
        secondary_emotions: row.secondary_emotions || [],
        intensity: row.intensity,
        sentiment_score: row.sentiment_score,
        confidence: row.confidence,
        needs_support: row.needs_support,
        stress_level: row.stress_level,
        energy_level: row.energy_level,
        context: row.context || {},
        suggested_response_tone: row.suggested_response_tone || [],
        timestamp: row.created_at,
      }));
    } catch (error) {
      console.error('Get recent emotions error:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // EMOTIONAL BASELINE
  // --------------------------------------------------------------------------

  async updateEmotionalBaseline(userId: string): Promise<void> {
    try {
      // Get last 50 emotions
      const emotions = await this.getRecentEmotions(userId, 50);
      
      if (emotions.length < 5) {
        // Not enough data yet
        return;
      }

      // Calculate baseline
      const baseline_sentiment = emotions.reduce((sum, e) => sum + e.sentiment_score, 0) / emotions.length;
      
      const emotionCounts: Record<string, number> = {};
      emotions.forEach(e => {
        emotionCounts[e.primary_emotion] = (emotionCounts[e.primary_emotion] || 0) + 1;
      });
      
      const common_emotions = Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([emotion]) => emotion);

      // Detect stress indicators
      const stress_indicators: string[] = [];
      const avgStress = emotions.reduce((sum, e) => sum + e.stress_level, 0) / emotions.length;
      if (avgStress > 0.6) stress_indicators.push('elevated_stress_levels');
      
      const supportNeeded = emotions.filter(e => e.needs_support).length;
      if (supportNeeded / emotions.length > 0.3) stress_indicators.push('frequent_support_needs');

      // Energy patterns by time of day
      const energyByHour: Record<number, number[]> = {};
      emotions.forEach(e => {
        const hour = new Date(e.timestamp).getHours();
        if (!energyByHour[hour]) energyByHour[hour] = [];
        energyByHour[hour].push(e.energy_level);
      });

      const energy_patterns = Object.entries(energyByHour).map(([hour, levels]) => ({
        time_of_day: `${hour}:00`,
        average_energy: levels.reduce((sum, l) => sum + l, 0) / levels.length,
      }));

      // Update baseline in database
      const { error } = await this.supabase
        .from('emotional_baselines')
        .upsert({
          user_id: userId,
          baseline_sentiment,
          common_emotions,
          stress_indicators,
          energy_patterns,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Update baseline error:', error);
    }
  }

  async getEmotionalBaseline(userId: string): Promise<EmotionalPattern | null> {
    try {
      const { data, error } = await this.supabase
        .from('emotional_baselines')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      return {
        user_id: userId,
        baseline_sentiment: data.baseline_sentiment,
        common_emotions: data.common_emotions || [],
        stress_indicators: data.stress_indicators || [],
        energy_patterns: data.energy_patterns || [],
        last_updated: data.updated_at,
      };
    } catch (error) {
      console.error('Get baseline error:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // EMOTIONAL INSIGHTS
  // --------------------------------------------------------------------------

  async getEmotionalInsights(userId: string): Promise<EmotionalInsights> {
    try {
      // Get recent emotions
      const recentEmotions = await this.getRecentEmotions(userId, 10);
      
      // Get current emotion (most recent)
      const current_emotion = recentEmotions[0] || this.getDefaultEmotion();

      // Get baseline
      const emotional_baseline = await this.getEmotionalBaseline(userId);

      // Detect patterns
      const recent_patterns = this.analyzer.detectPatterns(recentEmotions);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        current_emotion,
        recent_patterns,
        emotional_baseline
      );

      return {
        current_emotion,
        emotional_baseline,
        recent_patterns,
        recommendations,
      };
    } catch (error) {
      console.error('Get insights error:', error);
      return {
        current_emotion: this.getDefaultEmotion(),
        emotional_baseline: null,
        recent_patterns: {
          dominant_emotion: 'neutral',
          average_sentiment: 0,
          stress_trend: 'stable',
          energy_trend: 'stable',
          needs_intervention: false,
        },
        recommendations: [],
      };
    }
  }

  private generateRecommendations(
    current: EmotionAnalysis,
    patterns: ReturnType<typeof this.analyzer.detectPatterns>,
    baseline: EmotionalPattern | null
  ): string[] {
    const recommendations: string[] = [];

    // Stress intervention
    if (patterns.needs_intervention) {
      recommendations.push('Consider taking a break - stress levels are elevated');
      recommendations.push('Try breaking tasks into smaller, manageable chunks');
    }

    // Burnout detection
    if (patterns.stress_trend === 'increasing' && patterns.energy_trend === 'decreasing') {
      recommendations.push('⚠️ Burnout warning: Both stress increasing and energy decreasing');
      recommendations.push('Schedule some downtime or relaxing activities');
    }

    // Low energy
    if (current.energy_level < 0.3) {
      recommendations.push('Energy is low - consider a short walk or change of scenery');
    }

    // Consistent negativity
    if (patterns.average_sentiment < -0.3) {
      recommendations.push('Mood has been lower lately - celebrate small wins to boost morale');
    }

    // Baseline comparison
    if (baseline && current.sentiment_score < baseline.baseline_sentiment - 0.3) {
      recommendations.push('Current mood is below your baseline - check in with yourself');
    }

    // Positive reinforcement
    if (current.primary_emotion === 'happy' || current.primary_emotion === 'excited') {
      recommendations.push('🎉 Great energy! Ride this momentum!');
    }

    // No recommendations = all good
    if (recommendations.length === 0) {
      recommendations.push('✅ Emotional balance looks healthy!');
    }

    return recommendations;
  }

  // --------------------------------------------------------------------------
  // CONVERSATION HISTORY
  // --------------------------------------------------------------------------

  private updateConversationHistory(userId: string, context: ConversationContext): void {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId)!;
    history.push(context);

    // Keep last 50 messages
    if (history.length > 50) {
      history.shift();
    }
  }

  getConversationHistory(userId: string, limit?: number): ConversationContext[] {
    const history = this.conversationHistory.get(userId) || [];
    return limit ? history.slice(-limit) : history;
  }

  clearConversationHistory(userId: string): void {
    this.conversationHistory.delete(userId);
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  private getDefaultEmotion(): EmotionAnalysis {
    return {
      primary_emotion: 'neutral',
      secondary_emotions: [],
      intensity: 0.3,
      sentiment_score: 0,
      confidence: 0.5,
      needs_support: false,
      stress_level: 0.3,
      energy_level: 0.5,
      context: {
        is_work_related: false,
        is_personal: false,
        topic: 'general',
        urgency: 'medium',
      },
      suggested_response_tone: ['friendly', 'encouraging'],
      timestamp: new Date().toISOString(),
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  // --------------------------------------------------------------------------
  // BATCH OPERATIONS
  // --------------------------------------------------------------------------

  async processBatchMessages(
    userId: string,
    messages: { text: string; response: string }[]
  ): Promise<Array<{
    emotion: EmotionAnalysis;
    adapted_response: AdaptedResponse;
  }>> {
    const results = [];

    for (const { text, response } of messages) {
      const emotion = await this.analyzer.analyzeEmotion(text);
      const adapted_response = this.toneAdapter.adaptTone(response, emotion);

      await this.logEmotion(userId, text, emotion);

      results.push({ emotion, adapted_response });
    }

    // Update baseline after batch
    await this.updateEmotionalBaseline(userId);

    return results;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default EmotionalManager;
