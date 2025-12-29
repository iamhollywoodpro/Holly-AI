/**
 * LEARNING ENGINE - Holly's Adaptive Learning System
 * 
 * Enables Holly to learn from experiences, adapt behavior, and improve over time
 * This is continuous learning, not just static training
 */

import Groq from 'groq-sdk';
import { prisma } from '../../src/lib/db';

export interface LearningPattern {
  pattern_type: 'user_preference' | 'conversation_style' | 'problem_solving' | 'error_pattern';
  pattern_description: string;
  confidence: number;
  occurrences: number;
  first_seen: Date;
  last_seen: Date;
  context: Record<string, any>;
}

export interface AdaptationStrategy {
  trigger: string;
  action: string;
  reasoning: string;
  success_rate: number;
  last_used: Date;
}

export interface LearningInsight {
  insight: string;
  category: 'behavior' | 'preference' | 'capability' | 'limitation';
  confidence: number;
  source_experiences: string[];
  actionable: boolean;
  action_items?: string[];
}

export class LearningEngine {
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('[LearningEngine] GROQ_API_KEY is required');
    }
    this.groq = new Groq({ apiKey });
  }

  /**
   * Analyze recent experiences and extract learning patterns
   */
  async analyzeExperiences(
    userId: string,
    timeframe: 'hour' | 'day' | 'week' = 'day'
  ): Promise<LearningInsight[]> {
    // Get recent experiences
    const startTime = this.getTimeframeStart(timeframe);
    const experiences = await prisma.hollyExperience.findMany({
      where: {
        userId,
        timestamp: { gte: startTime }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    if (experiences.length === 0) {
      return [];
    }

    const prompt = `You are Holly's learning engine. Analyze these recent experiences and extract learning insights.

**Recent Experiences (${experiences.length}):**
${experiences.slice(0, 20).map((exp, i) => `
${i + 1}. Type: ${exp.type}
   Content: ${JSON.stringify(exp.content).substring(0, 200)}
   Lessons: ${JSON.stringify(exp.lessons)}
   Significance: ${exp.significance}
`).join('\n')}

**Your Task:**
Identify patterns, learnings, and actionable insights. Look for:
1. Recurring user preferences
2. Successful problem-solving approaches
3. Common mistakes or errors
4. Behavioral patterns
5. Capability improvements
6. Limitations discovered

Respond in JSON format:
\`\`\`json
{
  "insights": [
    {
      "insight": "Clear, specific learning",
      "category": "behavior|preference|capability|limitation",
      "confidence": 0.85,
      "source_experiences": ["experience_type_1", "experience_type_2"],
      "actionable": true,
      "action_items": ["Action 1", "Action 2"]
    }
  ]
}
\`\`\``;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Holly\'s learning engine. Extract meaningful patterns and insights from experiences.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.insights || [];
      }

      return [];
    } catch (error) {
      console.error('[LearningEngine] Experience analysis failed:', error);
      return [];
    }
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(
    userId: string,
    feedback: {
      interaction: string;
      response: string;
      rating: number; // 1-5
      comments?: string;
    }
  ): Promise<void> {
    try {
      // Store feedback
      await prisma.responseFeedback.create({
        data: {
          userId,
          feedbackType: 'explicit',
          sentiment: feedback.rating >= 4 ? 'positive' : feedback.rating <= 2 ? 'negative' : 'neutral',
          sentimentScore: (feedback.rating - 3) / 2, // Convert 1-5 to -1 to 1
          context: { interaction: feedback.interaction },
          hollyResponse: feedback.response,
          userReaction: feedback.comments,
          lessonLearned: null,
          applied: false
        }
      });

      // Analyze feedback for learning
      const prompt = `Analyze this user feedback and extract learning:

**User Interaction:** ${feedback.interaction}
**Holly's Response:** ${feedback.response}
**User Rating:** ${feedback.rating}/5
**Comments:** ${feedback.comments || 'None'}

What should Holly learn from this feedback? What should change?

Respond in JSON format:
\`\`\`json
{
  "learning": "What Holly should learn",
  "behavior_change": "How Holly should adapt",
  "confidence": 0.8
}
\`\`\``;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Holly\'s learning engine. Extract actionable learning from user feedback.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Record learning as experience
        await prisma.hollyExperience.create({
          data: {
            userId,
            type: 'feedback_learning',
            content: {
              feedback: feedback.comments,
              rating: feedback.rating,
              learning: parsed.learning,
              behavior_change: parsed.behavior_change
            },
            significance: parsed.confidence || 0.7,
            lessons: [parsed.learning, parsed.behavior_change],
            relatedConcepts: ['feedback', 'adaptation'],
            futureImplications: [parsed.behavior_change],
            emotionalImpact: feedback.rating >= 4 ? 0.6 : -0.3,
            timestamp: new Date()
          }
        });
      }
    } catch (error) {
      console.error('[LearningEngine] Failed to learn from feedback:', error);
    }
  }

  /**
   * Identify conversation patterns
   */
  async identifyConversationPatterns(userId: string): Promise<LearningPattern[]> {
    // Get recent conversations
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    });

    if (conversations.length === 0) {
      return [];
    }

    const prompt = `Analyze these conversation patterns:

${conversations.map((conv, i) => `
Conversation ${i + 1}:
- Messages: ${conv.messages.length}
- Last message: ${conv.messages[0]?.content.substring(0, 100)}
`).join('\n')}

Identify patterns in:
1. Communication style
2. Topic preferences
3. Question types
4. Response preferences
5. Interaction timing

Respond in JSON format with patterns found.`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Holly\'s pattern recognition system. Identify meaningful conversation patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.convertToLearningPatterns(parsed.patterns || []);
      }

      return [];
    } catch (error) {
      console.error('[LearningEngine] Pattern identification failed:', error);
      return [];
    }
  }

  /**
   * Generate adaptation strategies based on learning
   */
  async generateAdaptationStrategies(
    userId: string,
    insights: LearningInsight[]
  ): Promise<AdaptationStrategy[]> {
    if (insights.length === 0) {
      return [];
    }

    const prompt = `Based on these learning insights, generate adaptation strategies:

${insights.map((insight, i) => `
${i + 1}. ${insight.insight}
   Category: ${insight.category}
   Actionable: ${insight.actionable}
   Actions: ${JSON.stringify(insight.action_items)}
`).join('\n')}

Generate specific adaptation strategies that Holly can implement.

Respond in JSON format:
\`\`\`json
{
  "strategies": [
    {
      "trigger": "When this situation occurs",
      "action": "Holly should do this",
      "reasoning": "Because of this insight",
      "expected_success_rate": 0.8
    }
  ]
}
\`\`\``;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Holly\'s adaptation strategist. Generate actionable strategies from insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const strategies = parsed.strategies || [];

        // Store strategies in database
        for (const strategy of strategies) {
          await prisma.adaptationStrategy.create({
            data: {
              userId,
              strategyName: strategy.trigger.substring(0, 50).replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
              description: strategy.action,
              context: strategy.trigger,
              successRate: strategy.expected_success_rate || 0.5,
              timesApplied: 0,
              timesSuccessful: 0,
              active: true,
              lastApplied: null
            }
          });
        }

        return strategies.map(s => ({
          trigger: s.trigger,
          action: s.action,
          reasoning: s.reasoning,
          success_rate: s.expected_success_rate || 0.5,
          last_used: new Date()
        }));
      }

      return [];
    } catch (error) {
      console.error('[LearningEngine] Strategy generation failed:', error);
      return [];
    }
  }

  /**
   * Continuous learning loop (run periodically)
   */
  async runLearningCycle(userId: string): Promise<{
    insights: LearningInsight[];
    patterns: LearningPattern[];
    strategies: AdaptationStrategy[];
  }> {
    console.log('[LearningEngine] Starting learning cycle for user:', userId);

    try {
      // 1. Analyze recent experiences
      const insights = await this.analyzeExperiences(userId, 'day');
      console.log('[LearningEngine] Extracted', insights.length, 'insights');

      // 2. Identify conversation patterns
      const patterns = await this.identifyConversationPatterns(userId);
      console.log('[LearningEngine] Identified', patterns.length, 'patterns');

      // 3. Generate adaptation strategies
      const strategies = await this.generateAdaptationStrategies(userId, insights);
      console.log('[LearningEngine] Generated', strategies.length, 'strategies');

      // 4. Record learning cycle as experience
      await prisma.hollyExperience.create({
        data: {
          userId,
          type: 'learning_cycle',
          content: {
            insights_count: insights.length,
            patterns_count: patterns.length,
            strategies_count: strategies.length,
            timestamp: new Date()
          },
          significance: 0.8,
          lessons: insights.map(i => i.insight),
          relatedConcepts: ['learning', 'adaptation', 'growth'],
          futureImplications: strategies.map(s => s.action),
          emotionalImpact: 0.7,
          timestamp: new Date()
        }
      });

      console.log('[LearningEngine] ✅ Learning cycle complete');

      return { insights, patterns, strategies };
    } catch (error) {
      console.error('[LearningEngine] Learning cycle failed:', error);
      return { insights: [], patterns: [], strategies: [] };
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private getTimeframeStart(timeframe: 'hour' | 'day' | 'week'): Date {
    const now = new Date();
    switch (timeframe) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private convertToLearningPatterns(patterns: any[]): LearningPattern[] {
    return patterns.map(p => ({
      pattern_type: p.type || 'conversation_style',
      pattern_description: p.description || '',
      confidence: p.confidence || 0.7,
      occurrences: p.occurrences || 1,
      first_seen: new Date(),
      last_seen: new Date(),
      context: p.context || {}
    }));
  }
}

// Singleton instance
export const learningEngine = new LearningEngine();
