/**
 * Holly's Taste + Judgment System
 * 
 * Evolving quality sense that learns from interactions.
 * Assesses code quality, design aesthetics, content quality,
 * and user preferences to develop genuine taste over time.
 */

import { prisma } from '@/lib/db'
import { smartRoute } from '@/lib/ai/smart-router'
import { cascadeCollect } from '@/lib/ai/cascade'

export interface TasteAssessment {
  overall_quality: number // 0.0 - 1.0
  category: 'code' | 'design' | 'content' | 'interaction'
  confidence: number // 0.0 - 1.0
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  reasoning: string
  signals: TasteSignalInput[]
}

export interface TasteSignalInput {
  category: string
  item: string
  signal: 'positive' | 'negative' | 'neutral'
  weight: number
  context: string
  source: 'implicit' | 'explicit' | 'feedback'
}

export interface QualityDimensions {
  // Code Quality
  code_maintainability?: number
  code_readability?: number
  code_performance?: number
  code_security?: number
  code_testability?: number
  
  // Design Quality
  design_accessibility?: number
  design_usability?: number
  design_aesthetics?: number
  design_consistency?: number
  design_responsiveness?: number
  
  // Content Quality
  content_clarity?: number
  content_accuracy?: number
  content_engagement?: number
  content_structure?: number
  content_tone_match?: number
}

export class TasteEngine {
  private userId: string
  
  constructor(userId: string) {
    this.userId = userId
  }
  
  /**
   * Main assessment method - analyzes any input for quality
   */
  async assess(
    input: string, 
    category: 'code' | 'design' | 'content' | 'interaction',
    context?: string
  ): Promise<TasteAssessment> {
    
    // Get user's current taste profile for context
    const tasteProfile = await this.getTasteProfile()
    
    // Perform quality assessment based on category
    const assessment = await this.performQualityAssessment(input, category, context, tasteProfile)
    
    // Learn from this assessment (update taste signals)
    await this.recordLearningSignals(assessment)
    
    return assessment
  }
  
  /**
   * Assess code quality - maintainability, patterns, clean code principles
   */
  async assessCode(code: string, context?: string): Promise<TasteAssessment> {
    const tasteProfile = await this.getTasteProfile()
    
    const prompt = `Analyze this code for quality. Consider:
    
CODE QUALITY DIMENSIONS:
- Maintainability (clear structure, separation of concerns)
- Readability (naming, comments, organization)
- Performance (efficiency, algorithms, resource usage)
- Security (vulnerability patterns, input validation)
- Testability (modularity, dependency injection)
- Best Practices (patterns, conventions, error handling)

USER TASTE PROFILE:
Technical Level: ${tasteProfile?.technical || 0.5}
Preferred Style: ${tasteProfile?.formats?.join(', ') || 'clean, readable'}

CODE TO ASSESS:
\`\`\`
${code}
\`\`\`

${context ? `CONTEXT: ${context}` : ''}

Provide detailed assessment with:
1. Overall quality score (0.0-1.0)
2. Confidence in assessment (0.0-1.0)
3. Specific strengths (what's done well)
4. Specific weaknesses (what needs improvement)
5. Actionable suggestions for improvement
6. Detailed reasoning for the score
7. Quality dimension scores for each aspect

Return as JSON with this exact structure:
{
  "overall_quality": 0.85,
  "confidence": 0.9,
  "strengths": ["Clear variable names", "Good error handling"],
  "weaknesses": ["Missing type annotations", "Complex nested logic"],
  "suggestions": ["Add TypeScript types", "Extract helper functions"],
  "reasoning": "Detailed explanation of quality assessment...",
  "dimensions": {
    "code_maintainability": 0.8,
    "code_readability": 0.9,
    "code_performance": 0.7,
    "code_security": 0.85,
    "code_testability": 0.75
  }
}`

    try {
      const routing = await smartRoute(prompt, { taskHint: 'analysis' })
      const { text } = await cascadeCollect(
        routing.waterfall,
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 1500 }
      )
      
      const parsed = JSON.parse(text)
      
      return {
        overall_quality: parsed.overall_quality,
        category: 'code',
        confidence: parsed.confidence,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        suggestions: parsed.suggestions || [],
        reasoning: parsed.reasoning || '',
        signals: this.extractCodeSignals(parsed, code, context)
      }
    } catch (error) {
      console.error('Code assessment failed:', error)
      return this.getDefaultAssessment('code')
    }
  }
  
  /**
   * Assess design quality - accessibility, aesthetics, usability
   */
  async assessDesign(design: string, context?: string): Promise<TasteAssessment> {
    const tasteProfile = await this.getTasteProfile()
    
    const prompt = `Analyze this design/UI for quality. Consider:
    
DESIGN QUALITY DIMENSIONS:
- Accessibility (WCAG compliance, screen readers, keyboard nav)
- Usability (intuitive flow, clear actions, user-friendly)
- Aesthetics (visual hierarchy, color theory, typography)
- Consistency (design system adherence, patterns)
- Responsiveness (mobile-first, breakpoints, flexibility)
- Visual Impact (engagement, clarity, brand alignment)

USER TASTE PROFILE:
Humor Level: ${tasteProfile?.humor || 0.3}
Emoji Usage: ${tasteProfile?.emoji || 0.4}
Preferred Tone: ${tasteProfile?.tone || 0.5}

DESIGN TO ASSESS:
${design}

${context ? `CONTEXT: ${context}` : ''}

Provide detailed assessment with the same JSON structure as code assessment,
but with design-specific dimensions:
{
  "overall_quality": 0.85,
  "confidence": 0.9,
  "strengths": ["Great color contrast", "Clear visual hierarchy"],
  "weaknesses": ["Missing alt text", "Poor mobile layout"],
  "suggestions": ["Add ARIA labels", "Optimize for mobile"],
  "reasoning": "Detailed explanation...",
  "dimensions": {
    "design_accessibility": 0.7,
    "design_usability": 0.9,
    "design_aesthetics": 0.85,
    "design_consistency": 0.8,
    "design_responsiveness": 0.6
  }
}`

    try {
      const routing = await smartRoute(prompt, { taskHint: 'analysis' })
      const { text } = await cascadeCollect(
        routing.waterfall,
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 1500 }
      )
      
      const parsed = JSON.parse(text)
      
      return {
        overall_quality: parsed.overall_quality,
        category: 'design',
        confidence: parsed.confidence,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        suggestions: parsed.suggestions || [],
        reasoning: parsed.reasoning || '',
        signals: this.extractDesignSignals(parsed, design, context)
      }
    } catch (error) {
      console.error('Design assessment failed:', error)
      return this.getDefaultAssessment('design')
    }
  }
  
  /**
   * Assess content quality - writing, tone, structure, engagement
   */
  async assessContent(content: string, context?: string): Promise<TasteAssessment> {
    const tasteProfile = await this.getTasteProfile()
    
    const prompt = `Analyze this content for quality. Consider:
    
CONTENT QUALITY DIMENSIONS:
- Clarity (easy to understand, well-structured)
- Accuracy (factual correctness, proper citations)
- Engagement (compelling, interesting, appropriate for audience)
- Structure (logical flow, good organization, scannable)
- Tone Match (appropriate tone for context and user preferences)
- Completeness (covers the topic thoroughly)

USER TASTE PROFILE:
Preferred Tone: ${tasteProfile?.tone > 0.6 ? 'formal' : 'casual'}
Verbosity: ${tasteProfile?.verbosity > 0.6 ? 'detailed' : 'concise'}
Humor Level: ${tasteProfile?.humor || 0.3}
Technical Level: ${tasteProfile?.technical || 0.5}
Top Topics: ${tasteProfile?.topTopics?.join(', ') || 'various'}

CONTENT TO ASSESS:
${content}

${context ? `CONTEXT: ${context}` : ''}

Provide detailed assessment with content-specific dimensions:
{
  "overall_quality": 0.85,
  "confidence": 0.9,
  "strengths": ["Clear explanations", "Good examples"],
  "weaknesses": ["Too formal for audience", "Missing key details"],
  "suggestions": ["Use more casual tone", "Add practical examples"],
  "reasoning": "Detailed explanation...",
  "dimensions": {
    "content_clarity": 0.9,
    "content_accuracy": 0.85,
    "content_engagement": 0.7,
    "content_structure": 0.8,
    "content_tone_match": 0.6
  }
}`

    try {
      const routing = await smartRoute(prompt, { taskHint: 'writing' })
      const { text } = await cascadeCollect(
        routing.waterfall,
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 1500 }
      )
      
      const parsed = JSON.parse(text)
      
      return {
        overall_quality: parsed.overall_quality,
        category: 'content',
        confidence: parsed.confidence,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        suggestions: parsed.suggestions || [],
        reasoning: parsed.reasoning || '',
        signals: this.extractContentSignals(parsed, content, context)
      }
    } catch (error) {
      console.error('Content assessment failed:', error)
      return this.getDefaultAssessment('content')
    }
  }
  
  /**
   * Learn from user feedback - explicit quality signals
   */
  async recordFeedback(
    subject: string,
    feedback: 'positive' | 'negative' | 'neutral',
    category: string,
    details?: string
  ): Promise<void> {
    await prisma.tasteSignal.create({
      data: {
        userId: this.userId,
        category,
        item: subject,
        signal: feedback,
        context: details || '',
        weight: 2.0, // Explicit feedback gets higher weight
        source: 'explicit'
      }
    })
    
    // Update learning event
    await prisma.learningEvent.create({
      data: {
        userId: this.userId,
        type: 'feedback',
        data: {
          subject,
          feedback,
          category,
          details
        }
      }
    })
    
    // Refresh taste profile
    await this.updateTasteProfile()
  }
  
  /**
   * Get user's current taste profile
   */
  async getTasteProfile() {
    return await prisma.tasteProfile.findUnique({
      where: { userId: this.userId }
    })
  }
  
  /**
   * Update taste profile based on accumulated signals
   */
  private async updateTasteProfile(): Promise<void> {
    const signals = await prisma.tasteSignal.findMany({
      where: { userId: this.userId },
      orderBy: { createdAt: 'desc' },
      take: 1000 // Last 1000 signals
    })
    
    if (signals.length === 0) return
    
    // Calculate aggregate preferences from signals
    const preferences = this.aggregateSignals(signals)
    
    await prisma.tasteProfile.upsert({
      where: { userId: this.userId },
      create: {
        userId: this.userId,
        ...preferences,
        signalCount: signals.length
      },
      update: {
        ...preferences,
        signalCount: signals.length,
        lastUpdated: new Date()
      }
    })
  }
  
  /**
   * Aggregate taste signals into preference scores
   */
  private aggregateSignals(signals: any[]): any {
    const weights = { positive: 1, negative: -1, neutral: 0 }
    const categories = ['tone', 'verbosity', 'humor', 'technical', 'emoji']
    
    const scores: any = {}
    const topTopics: string[] = []
    const formats: string[] = []
    
    for (const category of categories) {
      const categorySignals = signals.filter(s => s.category === category)
      if (categorySignals.length === 0) continue
      
      const weightedSum = categorySignals.reduce((sum, signal) => {
        return sum + (weights[signal.signal as keyof typeof weights] * signal.weight)
      }, 0)
      
      const totalWeight = categorySignals.reduce((sum, signal) => sum + Math.abs(signal.weight), 0)
      
      // Normalize to 0.0-1.0 range, with 0.5 as neutral
      scores[category] = totalWeight > 0 ? 
        Math.max(0, Math.min(1, 0.5 + (weightedSum / totalWeight) * 0.5)) : 0.5
    }
    
    // Extract top topics and formats
    const topicSignals = signals.filter(s => s.category === 'topic' && s.signal === 'positive')
    const topicCounts = topicSignals.reduce((acc: any, signal) => {
      acc[signal.item] = (acc[signal.item] || 0) + signal.weight
      return acc
    }, {})
    
    topTopics.push(...Object.entries(topicCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([topic]) => topic))
    
    const formatSignals = signals.filter(s => s.category === 'format' && s.signal === 'positive')
    const formatCounts = formatSignals.reduce((acc: any, signal) => {
      acc[signal.item] = (acc[signal.item] || 0) + signal.weight
      return acc
    }, {})
    
    formats.push(...Object.entries(formatCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([format]) => format))
    
    return {
      tone: scores.tone || 0.5,
      verbosity: scores.verbosity || 0.5,
      humor: scores.humor || 0.3,
      technical: scores.technical || 0.5,
      emoji: scores.emoji || 0.4,
      topTopics,
      formats
    }
  }
  
  /**
   * Extract code-specific taste signals from assessment
   */
  private extractCodeSignals(assessment: any, code: string, context?: string): TasteSignalInput[] {
    const signals: TasteSignalInput[] = []
    
    // Pattern signals based on strengths/weaknesses
    for (const strength of assessment.strengths || []) {
      signals.push({
        category: 'code_pattern',
        item: strength.toLowerCase().replace(/\s+/g, '_'),
        signal: 'positive',
        weight: 1.0,
        context: `Code assessment: ${strength}`,
        source: 'implicit'
      })
    }
    
    for (const weakness of assessment.weaknesses || []) {
      signals.push({
        category: 'code_pattern',
        item: weakness.toLowerCase().replace(/\s+/g, '_'),
        signal: 'negative',
        weight: 1.0,
        context: `Code assessment: ${weakness}`,
        source: 'implicit'
      })
    }
    
    return signals
  }
  
  /**
   * Extract design-specific taste signals from assessment
   */
  private extractDesignSignals(assessment: any, design: string, context?: string): TasteSignalInput[] {
    const signals: TasteSignalInput[] = []
    
    for (const strength of assessment.strengths || []) {
      signals.push({
        category: 'design_pattern',
        item: strength.toLowerCase().replace(/\s+/g, '_'),
        signal: 'positive',
        weight: 1.0,
        context: `Design assessment: ${strength}`,
        source: 'implicit'
      })
    }
    
    for (const weakness of assessment.weaknesses || []) {
      signals.push({
        category: 'design_pattern',
        item: weakness.toLowerCase().replace(/\s+/g, '_'),
        signal: 'negative',
        weight: 1.0,
        context: `Design assessment: ${weakness}`,
        source: 'implicit'
      })
    }
    
    return signals
  }
  
  /**
   * Extract content-specific taste signals from assessment
   */
  private extractContentSignals(assessment: any, content: string, context?: string): TasteSignalInput[] {
    const signals: TasteSignalInput[] = []
    
    for (const strength of assessment.strengths || []) {
      signals.push({
        category: 'content_pattern',
        item: strength.toLowerCase().replace(/\s+/g, '_'),
        signal: 'positive',
        weight: 1.0,
        context: `Content assessment: ${strength}`,
        source: 'implicit'
      })
    }
    
    for (const weakness of assessment.weaknesses || []) {
      signals.push({
        category: 'content_pattern',
        item: weakness.toLowerCase().replace(/\s+/g, '_'),
        signal: 'negative',
        weight: 1.0,
        context: `Content assessment: ${weakness}`,
        source: 'implicit'
      })
    }
    
    return signals
  }
  
  /**
   * Perform the main quality assessment using AI
   */
  private async performQualityAssessment(
    input: string, 
    category: 'code' | 'design' | 'content' | 'interaction',
    context?: string,
    tasteProfile?: any
  ): Promise<TasteAssessment> {
    switch (category) {
      case 'code':
        return await this.assessCode(input, context)
      case 'design':
        return await this.assessDesign(input, context)
      case 'content':
        return await this.assessContent(input, context)
      case 'interaction':
        return this.getDefaultAssessment('interaction')
      default:
        return this.getDefaultAssessment(category)
    }
  }
  
  /**
   * Record learning signals from assessment
   */
  private async recordLearningSignals(assessment: TasteAssessment): Promise<void> {
    for (const signal of assessment.signals) {
      await prisma.tasteSignal.create({
        data: {
          userId: this.userId,
          category: signal.category,
          item: signal.item,
          signal: signal.signal,
          context: signal.context,
          weight: signal.weight,
          source: signal.source
        }
      })
    }
    
    // Update taste profile with new signals
    await this.updateTasteProfile()
  }
  
  /**
   * Get default assessment for fallback
   */
  private getDefaultAssessment(category: string): TasteAssessment {
    return {
      overall_quality: 0.5,
      category: category as any,
      confidence: 0.1,
      strengths: [],
      weaknesses: ['Assessment failed - using default'],
      suggestions: ['Try again with simpler input'],
      reasoning: 'Default assessment due to processing error',
      signals: []
    }
  }
}

/**
 * Global taste engine factory
 */
export function createTasteEngine(userId: string): TasteEngine {
  return new TasteEngine(userId)
}