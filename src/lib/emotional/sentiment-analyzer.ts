// HOLLY Feature 44: Emotional Intelligence - Sentiment Analyzer
// AI-powered emotion detection and sentiment analysis

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

// ============================================================================
// TYPES
// ============================================================================

export interface EmotionAnalysis {
  primary_emotion: string;
  secondary_emotions: string[];
  intensity: number; // 0-1
  sentiment_score: number; // -1 to 1
  confidence: number;
  needs_support: boolean;
  stress_level: number; // 0-1
  energy_level: number; // 0-1
  context: {
    is_work_related: boolean;
    is_personal: boolean;
    topic: string;
    urgency: 'low' | 'medium' | 'high';
  };
  suggested_response_tone: string[];
  timestamp: string;
}

export interface EmotionalPattern {
  user_id: string;
  baseline_sentiment: number;
  common_emotions: string[];
  stress_indicators: string[];
  energy_patterns: {
    time_of_day: string;
    average_energy: number;
  }[];
  last_updated: string;
}

export interface SentimentAnalyzerConfig {
  groq_api_key?: string;
  anthropic_api_key?: string;
  google_api_key?: string;
  cache_enabled?: boolean;
  cache_ttl_minutes?: number;
}

// ============================================================================
// EMOTION DETECTION ENGINE
// ============================================================================

export class SentimentAnalyzer {
  private groq: Groq | null = null;
  private anthropic: Anthropic | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private cache: Map<string, { result: EmotionAnalysis; expires: number }> = new Map();
  private config: Required<SentimentAnalyzerConfig>;

  constructor(config: SentimentAnalyzerConfig = {}) {
    this.config = {
      groq_api_key: config.groq_api_key || process.env.GROQ_API_KEY || '',
      anthropic_api_key: config.anthropic_api_key || process.env.ANTHROPIC_API_KEY || '',
      google_api_key: config.google_api_key || process.env.GOOGLE_API_KEY || '',
      cache_enabled: config.cache_enabled ?? true,
      cache_ttl_minutes: config.cache_ttl_minutes ?? 30,
    };

    // Initialize AI clients
    if (this.config.groq_api_key) {
      this.groq = new Groq({ apiKey: this.config.groq_api_key });
    }
    if (this.config.anthropic_api_key) {
      this.anthropic = new Anthropic({ apiKey: this.config.anthropic_api_key });
    }
    if (this.config.google_api_key) {
      this.gemini = new GoogleGenerativeAI(this.config.google_api_key);
    }
  }

  // --------------------------------------------------------------------------
  // MAIN ANALYSIS
  // --------------------------------------------------------------------------

  async analyzeEmotion(text: string, context?: Partial<EmotionAnalysis['context']>): Promise<EmotionAnalysis> {
    try {
      // Check cache
      if (this.config.cache_enabled) {
        const cached = this.getFromCache(text);
        if (cached) {
          return cached;
        }
      }

      // Run analysis with best available model
      let analysis: EmotionAnalysis;

      if (this.groq) {
        analysis = await this.analyzeWithGroq(text, context);
      } else if (this.anthropic) {
        analysis = await this.analyzeWithClaude(text, context);
      } else if (this.gemini) {
        analysis = await this.analyzeWithGemini(text, context);
      } else {
        // Fallback to basic analysis
        analysis = this.basicEmotionAnalysis(text, context);
      }

      // Cache result
      if (this.config.cache_enabled) {
        this.addToCache(text, analysis);
      }

      return analysis;
    } catch (error) {
      console.error('Emotion analysis error:', error);
      // Return neutral fallback
      return this.basicEmotionAnalysis(text, context);
    }
  }

  // --------------------------------------------------------------------------
  // GROQ ANALYSIS (Llama 3.3 70B - Best for deep understanding)
  // --------------------------------------------------------------------------

  private async analyzeWithGroq(text: string, context?: Partial<EmotionAnalysis['context']>): Promise<EmotionAnalysis> {
    if (!this.groq) throw new Error('Groq not initialized');

    const prompt = `Analyze the emotional content of this message and return a JSON response.

Message: "${text}"

Return JSON with this structure:
{
  "primary_emotion": "string (e.g., happy, sad, frustrated, excited, anxious, neutral)",
  "secondary_emotions": ["string array of 0-3 secondary emotions"],
  "intensity": number (0-1, how strong is the emotion),
  "sentiment_score": number (-1 to 1, negative to positive),
  "confidence": number (0-1, how confident are you),
  "needs_support": boolean (does the user need emotional support?),
  "stress_level": number (0-1, how stressed does the user seem?),
  "energy_level": number (0-1, how energetic/motivated does the user seem?),
  "context": {
    "is_work_related": boolean,
    "is_personal": boolean,
    "topic": "brief topic description",
    "urgency": "low | medium | high"
  },
  "suggested_response_tone": ["array of 2-3 tone suggestions like empathetic, encouraging, humorous, direct"]
}

Analyze carefully for subtle emotional cues, context, and underlying feelings.`;

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const result = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(result);

    return {
      ...parsed,
      context: { ...parsed.context, ...context },
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // CLAUDE ANALYSIS (Claude 3.5 Sonnet - Best for empathy)
  // --------------------------------------------------------------------------

  private async analyzeWithClaude(text: string, context?: Partial<EmotionAnalysis['context']>): Promise<EmotionAnalysis> {
    if (!this.anthropic) throw new Error('Anthropic not initialized');

    const prompt = `Analyze the emotional content of this message with empathy and nuance.

Message: "${text}"

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "primary_emotion": "string",
  "secondary_emotions": ["array"],
  "intensity": 0.0,
  "sentiment_score": 0.0,
  "confidence": 0.0,
  "needs_support": false,
  "stress_level": 0.0,
  "energy_level": 0.0,
  "context": {
    "is_work_related": false,
    "is_personal": false,
    "topic": "string",
    "urgency": "low"
  },
  "suggested_response_tone": ["array"]
}`;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const parsed = JSON.parse(result);

    return {
      ...parsed,
      context: { ...parsed.context, ...context },
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // GEMINI ANALYSIS (Gemini 1.5 Flash - Fast and cheap)
  // --------------------------------------------------------------------------

  private async analyzeWithGemini(text: string, context?: Partial<EmotionAnalysis['context']>): Promise<EmotionAnalysis> {
    if (!this.gemini) throw new Error('Gemini not initialized');

    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze emotions in this message. Return ONLY JSON:

"${text}"

JSON format:
{"primary_emotion":"string","secondary_emotions":[],"intensity":0.0,"sentiment_score":0.0,"confidence":0.0,"needs_support":false,"stress_level":0.0,"energy_level":0.0,"context":{"is_work_related":false,"is_personal":false,"topic":"string","urgency":"low"},"suggested_response_tone":[]}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean response (remove markdown if present)
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      ...parsed,
      context: { ...parsed.context, ...context },
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // BASIC ANALYSIS (Fallback without AI)
  // --------------------------------------------------------------------------

  private basicEmotionAnalysis(text: string, context?: Partial<EmotionAnalysis['context']>): EmotionAnalysis {
    const lowerText = text.toLowerCase();

    // Simple keyword matching
    const emotions = {
      happy: ['happy', 'excited', 'great', 'awesome', 'love', 'amazing', '😊', '🎉', '🔥'],
      sad: ['sad', 'down', 'depressed', 'unhappy', 'crying', '😢', '😭'],
      frustrated: ['frustrated', 'annoyed', 'irritated', 'stuck', 'ugh', '😤'],
      anxious: ['anxious', 'worried', 'nervous', 'scared', 'stress'],
      excited: ['excited', 'pumped', 'can\'t wait', 'woohoo', '🚀'],
    };

    let primary_emotion = 'neutral';
    let max_score = 0;

    for (const [emotion, keywords] of Object.entries(emotions)) {
      const score = keywords.filter(kw => lowerText.includes(kw)).length;
      if (score > max_score) {
        max_score = score;
        primary_emotion = emotion;
      }
    }

    // Calculate sentiment
    const positive_words = ['good', 'great', 'awesome', 'love', 'happy', 'excellent'];
    const negative_words = ['bad', 'terrible', 'hate', 'frustrated', 'stuck', 'problem'];
    
    const pos_count = positive_words.filter(w => lowerText.includes(w)).length;
    const neg_count = negative_words.filter(w => lowerText.includes(w)).length;
    const sentiment_score = (pos_count - neg_count) / Math.max(pos_count + neg_count, 1);

    return {
      primary_emotion,
      secondary_emotions: [],
      intensity: max_score > 0 ? 0.6 : 0.3,
      sentiment_score,
      confidence: 0.5,
      needs_support: primary_emotion === 'frustrated' || primary_emotion === 'sad',
      stress_level: primary_emotion === 'frustrated' || primary_emotion === 'anxious' ? 0.7 : 0.3,
      energy_level: primary_emotion === 'excited' || primary_emotion === 'happy' ? 0.8 : 0.5,
      context: {
        is_work_related: lowerText.includes('work') || lowerText.includes('code') || lowerText.includes('bug'),
        is_personal: lowerText.includes('feel') || lowerText.includes('i\'m'),
        topic: 'general',
        urgency: 'medium',
        ...context,
      },
      suggested_response_tone: primary_emotion === 'frustrated' ? ['empathetic', 'solution-focused'] : ['friendly', 'encouraging'],
      timestamp: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // BATCH ANALYSIS
  // --------------------------------------------------------------------------

  async analyzeBatch(messages: string[]): Promise<EmotionAnalysis[]> {
    const results = await Promise.allSettled(
      messages.map(msg => this.analyzeEmotion(msg))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Batch analysis failed for message ${index}:`, result.reason);
        return this.basicEmotionAnalysis(messages[index]);
      }
    });
  }

  // --------------------------------------------------------------------------
  // EMOTIONAL PATTERN DETECTION
  // --------------------------------------------------------------------------

  detectPatterns(analyses: EmotionAnalysis[]): {
    dominant_emotion: string;
    average_sentiment: number;
    stress_trend: 'increasing' | 'decreasing' | 'stable';
    energy_trend: 'increasing' | 'decreasing' | 'stable';
    needs_intervention: boolean;
  } {
    if (analyses.length === 0) {
      return {
        dominant_emotion: 'neutral',
        average_sentiment: 0,
        stress_trend: 'stable',
        energy_trend: 'stable',
        needs_intervention: false,
      };
    }

    // Find dominant emotion
    const emotionCounts: Record<string, number> = {};
    analyses.forEach(a => {
      emotionCounts[a.primary_emotion] = (emotionCounts[a.primary_emotion] || 0) + 1;
    });
    const dominant_emotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0][0];

    // Average sentiment
    const average_sentiment = analyses.reduce((sum, a) => sum + a.sentiment_score, 0) / analyses.length;

    // Stress trend (compare first half vs second half)
    const mid = Math.floor(analyses.length / 2);
    const firstHalfStress = analyses.slice(0, mid).reduce((sum, a) => sum + a.stress_level, 0) / mid;
    const secondHalfStress = analyses.slice(mid).reduce((sum, a) => sum + a.stress_level, 0) / (analyses.length - mid);
    const stressDiff = secondHalfStress - firstHalfStress;
    const stress_trend = stressDiff > 0.1 ? 'increasing' : stressDiff < -0.1 ? 'decreasing' : 'stable';

    // Energy trend
    const firstHalfEnergy = analyses.slice(0, mid).reduce((sum, a) => sum + a.energy_level, 0) / mid;
    const secondHalfEnergy = analyses.slice(mid).reduce((sum, a) => sum + a.energy_level, 0) / (analyses.length - mid);
    const energyDiff = secondHalfEnergy - firstHalfEnergy;
    const energy_trend = energyDiff > 0.1 ? 'increasing' : energyDiff < -0.1 ? 'decreasing' : 'stable';

    // Intervention check
    const needs_intervention = 
      stress_trend === 'increasing' && secondHalfStress > 0.7 ||
      average_sentiment < -0.5 ||
      analyses.filter(a => a.needs_support).length / analyses.length > 0.5;

    return {
      dominant_emotion,
      average_sentiment,
      stress_trend,
      energy_trend,
      needs_intervention,
    };
  }

  // --------------------------------------------------------------------------
  // CACHE MANAGEMENT
  // --------------------------------------------------------------------------

  private getFromCache(text: string): EmotionAnalysis | null {
    const key = this.getCacheKey(text);
    const cached = this.cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }

    // Clean expired
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  private addToCache(text: string, result: EmotionAnalysis): void {
    const key = this.getCacheKey(text);
    const expires = Date.now() + (this.config.cache_ttl_minutes * 60 * 1000);
    
    this.cache.set(key, { result, expires });

    // Clean old cache entries (keep last 100)
    if (this.cache.size > 100) {
      const keys = Array.from(this.cache.keys());
      keys.slice(0, keys.length - 100).forEach(k => this.cache.delete(k));
    }
  }

  private getCacheKey(text: string): string {
    // Simple hash for cache key
    return text.toLowerCase().trim().substring(0, 100);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default SentimentAnalyzer;
