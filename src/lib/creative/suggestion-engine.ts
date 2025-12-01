/**
 * PHASE 2D: Proactive Suggestion Engine
 * Analyzes context and generates helpful suggestions before being asked
 */

import prisma from '@/lib/prisma';

export interface SuggestionContext {
  conversationHistory: Array<{ role: string; content: string }>;
  currentTopic?: string;
  recentActivity?: string;
  projectContext?: any;
  userPreferences?: any;
}

export interface GeneratedSuggestion {
  type: 'next_step' | 'improvement' | 'alternative' | 'optimization' | 'creative_idea';
  suggestion: string;
  reasoning: string;
  priority: number; // 1-10
  confidence: number; // 0.0-1.0
}

export class SuggestionEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Generate proactive suggestions based on context
   */
  async generateSuggestions(context: SuggestionContext): Promise<GeneratedSuggestion[]> {
    const suggestions: GeneratedSuggestion[] = [];

    // Analyze conversation for suggestion opportunities
    const conversationAnalysis = this.analyzeConversation(context.conversationHistory);

    // Generate next step suggestions
    if (conversationAnalysis.hasUnfinishedTask) {
      suggestions.push(this.suggestNextStep(conversationAnalysis, context));
    }

    // Generate improvement suggestions
    if (conversationAnalysis.hasImprovementOpportunity) {
      suggestions.push(...this.suggestImprovements(conversationAnalysis, context));
    }

    // Generate creative alternatives
    if (conversationAnalysis.hasCreativeOpportunity) {
      suggestions.push(this.suggestAlternative(conversationAnalysis, context));
    }

    // Generate optimization suggestions
    if (conversationAnalysis.hasOptimizationOpportunity) {
      suggestions.push(this.suggestOptimization(conversationAnalysis, context));
    }

    // Sort by priority and confidence
    return suggestions
      .sort((a, b) => b.priority * b.confidence - a.priority * a.confidence)
      .slice(0, 3); // Return top 3
  }

  /**
   * Analyze conversation for opportunities
   */
  private analyzeConversation(history: Array<{ role: string; content: string }>): any {
    const recentMessages = history.slice(-5);
    const allText = recentMessages.map(m => m.content).join(' ').toLowerCase();

    return {
      hasUnfinishedTask: this.detectUnfinishedTask(recentMessages),
      hasImprovementOpportunity: this.detectImprovementOpportunity(allText),
      hasCreativeOpportunity: this.detectCreativeOpportunity(allText),
      hasOptimizationOpportunity: this.detectOptimizationOpportunity(allText),
      topics: this.extractTopics(allText),
      userIntent: this.detectUserIntent(recentMessages)
    };
  }

  /**
   * Detect if there's an unfinished task
   */
  private detectUnfinishedTask(messages: Array<{ role: string; content: string }>): boolean {
    const userMessages = messages.filter(m => m.role === 'user');
    const lastUser = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';

    // Check for task indicators
    return (
      lastUser.includes('next') ||
      lastUser.includes('then') ||
      lastUser.includes('after') ||
      lastUser.includes('going to') ||
      messages.some(m => 
        m.content.toLowerCase().includes('todo') ||
        m.content.toLowerCase().includes('need to') ||
        m.content.toLowerCase().includes('should')
      )
    );
  }

  /**
   * Detect improvement opportunities
   */
  private detectImprovementOpportunity(text: string): boolean {
    return (
      text.includes('working but') ||
      text.includes('could be better') ||
      text.includes('not quite') ||
      text.includes('almost') ||
      text.includes('error') ||
      text.includes('issue') ||
      text.includes('problem')
    );
  }

  /**
   * Detect creative opportunities
   */
  private detectCreativeOpportunity(text: string): boolean {
    return (
      text.includes('idea') ||
      text.includes('brainstorm') ||
      text.includes('creative') ||
      text.includes('design') ||
      text.includes('alternative') ||
      text.includes('different way')
    );
  }

  /**
   * Detect optimization opportunities
   */
  private detectOptimizationOpportunity(text: string): boolean {
    return (
      text.includes('slow') ||
      text.includes('performance') ||
      text.includes('optimize') ||
      text.includes('faster') ||
      text.includes('efficient') ||
      text.includes('reduce')
    );
  }

  /**
   * Extract topics from conversation
   */
  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    
    // Technical topics
    if (text.includes('code') || text.includes('function') || text.includes('api')) topics.push('coding');
    if (text.includes('design') || text.includes('ui') || text.includes('layout')) topics.push('design');
    if (text.includes('deploy') || text.includes('production')) topics.push('deployment');
    if (text.includes('music') || text.includes('song') || text.includes('track')) topics.push('music');
    if (text.includes('write') || text.includes('copy') || text.includes('content')) topics.push('writing');

    return topics;
  }

  /**
   * Detect user's intent
   */
  private detectUserIntent(messages: Array<{ role: string; content: string }>): string {
    const lastUser = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || '';

    if (lastUser.includes('?')) return 'asking';
    if (lastUser.includes('help') || lastUser.includes('can you')) return 'requesting_help';
    if (lastUser.includes('build') || lastUser.includes('create')) return 'building';
    if (lastUser.includes('fix') || lastUser.includes('error')) return 'troubleshooting';
    
    return 'exploring';
  }

  /**
   * Suggest next step
   */
  private suggestNextStep(analysis: any, context: SuggestionContext): GeneratedSuggestion {
    const topics = analysis.topics.join(', ') || 'this project';

    return {
      type: 'next_step',
      suggestion: `Based on our conversation, a natural next step would be to test what we've built and verify it's working as expected.`,
      reasoning: `You've been working on ${topics}. Testing ensures everything functions correctly before moving forward.`,
      priority: 8,
      confidence: 0.75
    };
  }

  /**
   * Suggest improvements
   */
  private suggestImprovements(analysis: any, context: SuggestionContext): GeneratedSuggestion[] {
    const suggestions: GeneratedSuggestion[] = [];

    if (analysis.topics.includes('coding')) {
      suggestions.push({
        type: 'improvement',
        suggestion: `Consider adding error handling and input validation to make your code more robust.`,
        reasoning: `Error handling prevents unexpected crashes and provides better user experience.`,
        priority: 7,
        confidence: 0.7
      });
    }

    if (analysis.topics.includes('design')) {
      suggestions.push({
        type: 'improvement',
        suggestion: `Add accessibility features like proper contrast ratios and ARIA labels.`,
        reasoning: `Accessibility ensures your design works for all users, including those with disabilities.`,
        priority: 6,
        confidence: 0.65
      });
    }

    return suggestions;
  }

  /**
   * Suggest creative alternative
   */
  private suggestAlternative(analysis: any, context: SuggestionContext): GeneratedSuggestion {
    return {
      type: 'alternative',
      suggestion: `Have you considered approaching this from a different angle? Sometimes a fresh perspective reveals better solutions.`,
      reasoning: `Creative alternatives can lead to more elegant or efficient solutions.`,
      priority: 6,
      confidence: 0.6
    };
  }

  /**
   * Suggest optimization
   */
  private suggestOptimization(analysis: any, context: SuggestionContext): GeneratedSuggestion {
    return {
      type: 'optimization',
      suggestion: `I notice performance could be improved. Consider optimizing database queries or implementing caching.`,
      reasoning: `Performance optimizations improve user experience and reduce resource usage.`,
      priority: 7,
      confidence: 0.7
    };
  }

  /**
   * Save suggestion to database
   */
  async saveSuggestion(
    suggestion: GeneratedSuggestion,
    context: { relatedTo?: string; conversationId?: string }
  ): Promise<void> {
    try {
      await prisma.creativeSuggestion.create({
        data: {
          userId: this.userId,
          suggestionType: suggestion.type,
          context: context,
          suggestion: suggestion.suggestion,
          reasoning: suggestion.reasoning,
          priority: suggestion.priority,
          relatedTo: context.relatedTo
        }
      });
    } catch (error) {
      console.error('[Suggestion Engine] Error saving suggestion:', error);
    }
  }

  /**
   * Get pending suggestions
   */
  async getPendingSuggestions(): Promise<any[]> {
    return prisma.creativeSuggestion.findMany({
      where: {
        userId: this.userId,
        status: 'pending'
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 5
    });
  }

  /**
   * Mark suggestion as accepted/declined
   */
  async updateSuggestionStatus(
    suggestionId: string,
    status: 'accepted' | 'declined' | 'implemented',
    feedback?: string
  ): Promise<void> {
    try {
      await prisma.creativeSuggestion.update({
        where: { id: suggestionId },
        data: {
          status,
          userFeedback: feedback,
          implemented: status === 'implemented'
        }
      });
    } catch (error) {
      console.error('[Suggestion Engine] Error updating status:', error);
    }
  }
}
