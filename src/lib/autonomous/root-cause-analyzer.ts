/**
 * PHASE 4: ROOT CAUSE ANALYZER
 * 
 * Traces errors back to their source:
 * - Stack trace analysis
 * - Dependency chain tracking
 * - Historical pattern matching
 * - AI-powered cause inference
 */

import OpenAI from 'openai';
import { ExperienceTracker } from '../metamorphosis/experience-tracker';

const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

export interface RootCauseAnalysis {
  error: string;
  rootCause: string;
  contributingFactors: string[];
  affectedComponents: string[];
  confidence: number; // 0-100
  historicalContext?: {
    similarErrors: number;
    previousSolutions: string[];
  };
  recommendations: string[];
}

export class RootCauseAnalyzer {
  private experienceTracker: ExperienceTracker;

  constructor() {
    this.experienceTracker = new ExperienceTracker();
  }

  /**
   * Analyze an error to determine root cause
   */
  async analyze(
    error: string | Error,
    stackTrace?: string,
    context?: any
  ): Promise<RootCauseAnalysis> {
    const errorString = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : stackTrace;

    console.log(`[Root Cause] Analyzing error: ${errorString.substring(0, 100)}...`);

    // Check for similar past errors
    const similarErrors = await this.findSimilarErrors(errorString);

    // Extract keywords from error
    const keywords = this.extractKeywords(errorString);

    // Use AI to analyze root cause
    const aiAnalysis = await this.analyzeWithAI(errorString, stack, context, similarErrors);

    // Combine AI analysis with historical data
    const analysis: RootCauseAnalysis = {
      error: errorString,
      rootCause: aiAnalysis.rootCause,
      contributingFactors: aiAnalysis.contributingFactors,
      affectedComponents: this.extractComponents(errorString, stack),
      confidence: aiAnalysis.confidence,
      historicalContext: {
        similarErrors: similarErrors.length,
        previousSolutions: similarErrors
          .filter(e => e.outcome === 'success')
          .slice(0, 3)
          .map(e => e.action)
      },
      recommendations: aiAnalysis.recommendations
    };

    console.log(`[Root Cause] Root cause identified: ${analysis.rootCause} (${analysis.confidence}% confidence)`);

    return analysis;
  }

  /**
   * Use AI to analyze root cause
   */
  private async analyzeWithAI(
    error: string,
    stackTrace?: string,
    context?: any,
    similarErrors?: any[]
  ): Promise<{
    rootCause: string;
    contributingFactors: string[];
    confidence: number;
    recommendations: string[];
  }> {
    try {
      const prompt = this.buildAnalysisPrompt(error, stackTrace, context, similarErrors);

      const response = await gemini.chat.completions.create({
        model: 'gemini-2.0-flash-exp',
        messages: [
          {
            role: 'system',
            content: `You are HOLLY's root cause analysis engine. Your job is to analyze errors and determine the underlying cause.

Be specific and actionable. Focus on:
1. The TRUE root cause (not just the symptom)
2. Contributing factors
3. Practical recommendations`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Low temperature for consistent analysis
        max_tokens: 1000
      });

      const analysis = response.choices[0]?.message?.content || '';

      return this.parseAIAnalysis(analysis);
    } catch (error) {
      console.error('[Root Cause] AI analysis failed:', error);
      
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(error);
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(
    error: string,
    stackTrace?: string,
    context?: any,
    similarErrors?: any[]
  ): string {
    let prompt = `ERROR ANALYSIS REQUEST\n\n`;
    prompt += `Error: ${error}\n\n`;

    if (stackTrace) {
      prompt += `Stack Trace:\n${stackTrace.substring(0, 1000)}\n\n`;
    }

    if (context) {
      prompt += `Context:\n${JSON.stringify(context, null, 2)}\n\n`;
    }

    if (similarErrors && similarErrors.length > 0) {
      prompt += `Historical Context:\n`;
      prompt += `- Similar errors occurred ${similarErrors.length} times\n`;
      const successful = similarErrors.filter(e => e.outcome === 'success');
      if (successful.length > 0) {
        prompt += `- Previous successful fixes:\n`;
        successful.slice(0, 2).forEach(e => {
          prompt += `  * ${e.action}\n`;
        });
      }
      prompt += `\n`;
    }

    prompt += `Please provide:\n`;
    prompt += `1. ROOT CAUSE: The underlying reason this error occurred (be specific)\n`;
    prompt += `2. CONTRIBUTING FACTORS: What made this happen (2-3 factors)\n`;
    prompt += `3. CONFIDENCE: 0-100, how confident are you in this analysis\n`;
    prompt += `4. RECOMMENDATIONS: Specific actions to fix this (3-5 recommendations)\n`;

    return prompt;
  }

  /**
   * Parse AI analysis response
   */
  private parseAIAnalysis(analysis: string): {
    rootCause: string;
    contributingFactors: string[];
    confidence: number;
    recommendations: string[];
  } {
    const rootCauseMatch = analysis.match(/ROOT CAUSE[:\s]+(.+?)(?=\n\n|CONTRIBUTING|$)/is);
    const factorsMatch = analysis.match(/CONTRIBUTING FACTORS?[:\s]+(.+?)(?=\n\n|CONFIDENCE|$)/is);
    const confidenceMatch = analysis.match(/CONFIDENCE[:\s]+(\d+)/i);
    const recommendationsMatch = analysis.match(/RECOMMENDATIONS?[:\s]+(.+?)$/is);

    const rootCause = rootCauseMatch 
      ? rootCauseMatch[1].trim() 
      : 'Unable to determine root cause - manual analysis needed';

    const contributingFactors = factorsMatch
      ? factorsMatch[1].split(/\n|;/).map(f => f.replace(/^[-*•]\s*/, '').trim()).filter(f => f)
      : ['Unknown contributing factors'];

    const confidence = confidenceMatch 
      ? parseInt(confidenceMatch[1]) 
      : 50;

    const recommendations = recommendationsMatch
      ? recommendationsMatch[1].split(/\n/).map(r => r.replace(/^[-*•\d.]\s*/, '').trim()).filter(r => r)
      : ['Manual investigation required'];

    return {
      rootCause,
      contributingFactors,
      confidence,
      recommendations
    };
  }

  /**
   * Fallback analysis when AI fails
   */
  private fallbackAnalysis(errorString: string): {
    rootCause: string;
    contributingFactors: string[];
    confidence: number;
    recommendations: string[];
  } {
    // Simple rule-based analysis
    let rootCause = 'Unknown error';
    const contributingFactors: string[] = [];
    const recommendations: string[] = [];

    if (errorString.includes('Cannot find module')) {
      rootCause = 'Missing module or dependency';
      contributingFactors.push('Module not installed', 'Incorrect import path');
      recommendations.push('Run npm install', 'Check import statement');
    } else if (errorString.includes('Type') && errorString.includes('not assignable')) {
      rootCause = 'TypeScript type mismatch';
      contributingFactors.push('Incorrect type annotation', 'Data type changed');
      recommendations.push('Add type assertion', 'Fix source type');
    } else if (errorString.includes('database') || errorString.includes('connection')) {
      rootCause = 'Database connectivity issue';
      contributingFactors.push('Database server down', 'Invalid connection string');
      recommendations.push('Check DATABASE_URL', 'Verify database is running');
    }

    return {
      rootCause,
      contributingFactors,
      confidence: 60,
      recommendations
    };
  }

  /**
   * Find similar errors from past experiences
   */
  private async findSimilarErrors(error: string): Promise<any[]> {
    const keywords = this.extractKeywords(error);
    
    return this.experienceTracker.findSimilarExperiences({
      keywords,
      type: 'fix'
    }, 10);
  }

  /**
   * Extract keywords from error message
   */
  private extractKeywords(error: string): string[] {
    // Extract important words from error message
    const words = error
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Filter out common words
    const stopWords = ['this', 'that', 'with', 'from', 'have', 'will', 'been', 'does'];
    const keywords = words.filter(w => !stopWords.includes(w));

    return [...new Set(keywords)].slice(0, 5);
  }

  /**
   * Extract affected components from error and stack trace
   */
  private extractComponents(error: string, stackTrace?: string): string[] {
    const components = new Set<string>();

    // Extract from error message
    const errorMatches = error.match(/[\w-]+\.(ts|tsx|js|jsx)/g);
    if (errorMatches) {
      errorMatches.forEach(m => components.add(m));
    }

    // Extract from stack trace
    if (stackTrace) {
      const stackMatches = stackTrace.match(/at\s+.+?\s+\((.+?)\)/g);
      if (stackMatches) {
        stackMatches.forEach(match => {
          const fileMatch = match.match(/[\w-]+\.(ts|tsx|js|jsx)/);
          if (fileMatch) components.add(fileMatch[0]);
        });
      }
    }

    return Array.from(components).slice(0, 5);
  }

  /**
   * Get analysis confidence based on historical data
   */
  async getConfidence(errorPattern: string): Promise<number> {
    const similar = await this.findSimilarErrors(errorPattern);
    
    if (similar.length === 0) return 50;

    const successful = similar.filter(e => e.outcome === 'success').length;
    const baseConfidence = (successful / similar.length) * 100;

    // Boost confidence if we have many examples
    const experienceBonus = Math.min(20, similar.length * 2);

    return Math.min(100, baseConfidence + experienceBonus);
  }
}

/**
 * Quick root cause analysis
 */
export async function analyzeError(error: string | Error): Promise<RootCauseAnalysis> {
  const analyzer = new RootCauseAnalyzer();
  return await analyzer.analyze(error);
}

// ===========================
// Export Singleton Instance
// ===========================

export const rootCauseAnalyzer = new RootCauseAnalyzer();
