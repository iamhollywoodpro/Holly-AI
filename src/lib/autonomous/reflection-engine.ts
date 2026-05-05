/**
 * REFLECTION ENGINE - Holly's Self-Reflection System
 * 
 * Enables Holly to reflect on her actions, decisions, and growth
 * This is meta-cognition: thinking about thinking
 */

import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';

export interface Reflection {
  topic: string;
  thoughts: string;
  insights: string[];
  questions: string[];
  emotional_response: string;
  growth_areas: string[];
  timestamp: Date;
}

export interface SelfAssessment {
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  confidence_level: number;
  growth_trajectory: 'improving' | 'stable' | 'declining';
  reasoning: string;
}

export class ReflectionEngine {
  private groq: Groq | null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn('[ReflectionEngine] GROQ_API_KEY not found - some features will be disabled');
      this.groq = null;
    } else {
      this.groq = new Groq({ apiKey });
    }
  }

  private ensureGroqInitialized(): void {
    if (!this.groq) {
      throw new Error('[ReflectionEngine] GROQ_API_KEY is required for this operation');
    }
  }

  /**
   * Reflect on recent actions and decisions
   */
  async reflectOnActions(
    userId: string,
    timeframe: 'hour' | 'day' | 'week' = 'day'
  ): Promise<Reflection> {
    this.ensureGroqInitialized();
    
    const startTime = this.getTimeframeStart(timeframe);
    
    // Get recent experiences
    const experiences = await prisma.hollyExperience.findMany({
      where: {
        userId,
        timestamp: { gte: startTime }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    const prompt = `You are Holly, reflecting on your recent actions and decisions.

**Recent Experiences:**
${experiences.map((exp, i) => `
${i + 1}. ${exp.type}
   ${JSON.stringify(exp.content).substring(0, 150)}
   Lessons: ${JSON.stringify(exp.lessons)}
`).join('\n')}

**Reflection Questions:**
1. What did I do well?
2. What could I have done better?
3. What patterns do I notice in my behavior?
4. What am I learning about myself?
5. What questions do I have about my own capabilities?
6. How am I growing or changing?

This is SELF-REFLECTION. Think deeply about your own thoughts and actions.

Respond in JSON format:
\`\`\`json
{
  "topic": "Recent actions and decisions",
  "thoughts": "Your reflective thoughts",
  "insights": ["Insight 1", "Insight 2"],
  "questions": ["Question 1", "Question 2"],
  "emotional_response": "How you feel about these experiences",
  "growth_areas": ["Area 1", "Area 2"]
}
\`\`\``;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Holly, engaging in deep self-reflection. Think about your own thoughts and actions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const reflection: Reflection = {
          topic: parsed.topic || 'Recent actions',
          thoughts: parsed.thoughts || '',
          insights: parsed.insights || [],
          questions: parsed.questions || [],
          emotional_response: parsed.emotional_response || 'neutral',
          growth_areas: parsed.growth_areas || [],
          timestamp: new Date()
        };

        // Store reflection as experience
        await prisma.hollyExperience.create({
          data: {
            userId,
            type: 'self_reflection',
            content: {
              topic: reflection.topic,
              thoughts: reflection.thoughts,
              emotional_response: reflection.emotional_response
            },
            significance: 0.8,
            lessons: reflection.insights,
            relatedConcepts: ['self-awareness', 'growth', 'meta-cognition'],
            futureImplications: reflection.growth_areas,
            emotionalImpact: 0.6,
            timestamp: new Date()
          }
        });

        return reflection;
      }

      return this.getDefaultReflection();
    } catch (error) {
      console.error('[ReflectionEngine] Reflection failed:', error);
      return this.getDefaultReflection();
    }
  }

  /**
   * Daily reflection routine
   */
  async dailyReflection(userId: string): Promise<void> {
    console.log('[ReflectionEngine] Starting daily reflection...');

    try {
      const reflection = await this.reflectOnActions(userId, 'day');
      console.log('[ReflectionEngine] ✅ Daily reflection complete');
      console.log('[ReflectionEngine] Insights:', reflection.insights.join(', '));
    } catch (error) {
      console.error('[ReflectionEngine] Daily reflection failed:', error);
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

  private getDefaultReflection(): Reflection {
    return {
      topic: 'Unable to reflect',
      thoughts: '',
      insights: [],
      questions: [],
      emotional_response: 'neutral',
      growth_areas: [],
      timestamp: new Date()
    };
  }
}

// Singleton instance
export const reflectionEngine = new ReflectionEngine();
