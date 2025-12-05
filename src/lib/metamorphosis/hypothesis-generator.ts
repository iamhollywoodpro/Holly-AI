/**
 * PHASE 3: HYPOTHESIS GENERATION MODULE
 * 
 * Generates solution hypotheses for detected problems:
 * - Root cause analysis
 * - Multiple solution approaches
 * - Confidence scoring
 * - Risk assessment
 * - Implementation planning
 */

import { prisma } from '@/lib/db';
import OpenAI from 'openai';

const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

export interface HypothesisData {
  problemId: string;
  proposedSolution: string;
  reasoning: string;
  expectedImpact: string;
  confidence: number; // 0-100
  testingStrategy: string;
  risks: string[];
  implementation: {
    filesAffected: string[];
    complexity: 'low' | 'medium' | 'high';
    dependencies: string[];
  };
}

export class HypothesisGenerator {
  /**
   * Generate solution hypotheses for a problem using AI
   */
  async generateHypotheses(problemId: string): Promise<HypothesisData[]> {
    try {
      // Get problem details
      const problem = await prisma.detectedProblem.findUnique({
        where: { id: problemId }
      });

      if (!problem) {
        throw new Error('Problem not found');
      }

      console.log(`[Hypothesis Generator] Generating solutions for: ${problem.title}`);

      // Update problem status
      await prisma.detectedProblem.update({
        where: { id: problemId },
        data: { status: 'analyzing' }
      });

      // Generate hypotheses using AI
      const hypotheses = await this.generateAISolutions(problem);

      // Save hypotheses to database
      for (const hypothesis of hypotheses) {
        await this.saveHypothesis(hypothesis);
      }

      console.log(`[Hypothesis Generator] Generated ${hypotheses.length} hypotheses`);

      return hypotheses;
    } catch (error) {
      console.error('[Hypothesis Generator] Error generating hypotheses:', error);
      return [];
    }
  }

  /**
   * Use AI to generate creative solutions
   */
  private async generateAISolutions(problem: any): Promise<HypothesisData[]> {
    try {
      const prompt = this.buildSolutionPrompt(problem);

      const response = await gemini.chat.completions.create({
        model: 'gemini-2.0-flash-exp',
        messages: [
          {
            role: 'system',
            content: `You are HOLLY's self-improvement module. Your job is to analyze system problems and generate practical, actionable solution hypotheses.

For each solution:
1. Explain the root cause
2. Propose a specific, implementable solution
3. Assess confidence level (0-100)
4. Identify risks
5. Outline implementation steps

Be practical and specific. Focus on solutions that can be implemented and tested.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const aiResponse = response.choices[0]?.message?.content || '';

      // Parse AI response into structured hypotheses
      return this.parseAIResponse(aiResponse, problem.id);
    } catch (error) {
      console.error('[Hypothesis Generator] Error with AI generation:', error);
      
      // Fallback: Generate basic hypothesis manually
      return [this.generateFallbackHypothesis(problem)];
    }
  }

  /**
   * Build prompt for AI solution generation
   */
  private buildSolutionPrompt(problem: any): string {
    return `
PROBLEM ANALYSIS REQUEST

Problem Type: ${problem.type}
Severity: ${problem.severity}
Title: ${problem.title}

Description:
${problem.description}

Evidence:
${JSON.stringify(problem.evidence, null, 2)}

Impact:
${problem.impact}

---

Generate 2-3 solution hypotheses for this problem. For each hypothesis, provide:

1. **Proposed Solution**: What should we do? (be specific)
2. **Root Cause Analysis**: Why is this problem happening?
3. **Expected Impact**: What will improve if we implement this?
4. **Confidence**: 0-100, how confident are you this will work?
5. **Testing Strategy**: How can we verify this solution works?
6. **Risks**: What could go wrong?
7. **Implementation**: Which files/components need to change? What's the complexity?

Format each hypothesis clearly with these sections.
`;
  }

  /**
   * Parse AI response into structured hypotheses
   */
  private parseAIResponse(aiResponse: string, problemId: string): HypothesisData[] {
    const hypotheses: HypothesisData[] = [];

    try {
      // Split response into individual hypotheses
      // This is a simplified parser - in production, we'd use more robust parsing
      const hypothesisSections = aiResponse.split(/Hypothesis \d+|Solution \d+/i).filter(s => s.trim());

      for (const section of hypothesisSections.slice(0, 3)) {
        const hypothesis = this.extractHypothesisData(section, problemId);
        if (hypothesis) {
          hypotheses.push(hypothesis);
        }
      }

      // If parsing failed, create at least one hypothesis from the full response
      if (hypotheses.length === 0) {
        hypotheses.push({
          problemId,
          proposedSolution: this.extractSection(aiResponse, 'Proposed Solution') || 'Investigate and fix the root cause',
          reasoning: this.extractSection(aiResponse, 'Root Cause') || aiResponse.substring(0, 500),
          expectedImpact: this.extractSection(aiResponse, 'Expected Impact') || 'Should resolve the issue',
          confidence: this.extractConfidence(aiResponse),
          testingStrategy: this.extractSection(aiResponse, 'Testing') || 'Monitor metrics after deployment',
          risks: this.extractRisks(aiResponse),
          implementation: {
            filesAffected: this.extractFiles(aiResponse),
            complexity: 'medium',
            dependencies: []
          }
        });
      }
    } catch (error) {
      console.error('[Hypothesis Generator] Error parsing AI response:', error);
    }

    return hypotheses;
  }

  /**
   * Extract hypothesis data from a section
   */
  private extractHypothesisData(section: string, problemId: string): HypothesisData | null {
    try {
      return {
        problemId,
        proposedSolution: this.extractSection(section, 'Proposed Solution') || this.extractSection(section, 'Solution') || section.substring(0, 200),
        reasoning: this.extractSection(section, 'Root Cause') || this.extractSection(section, 'Reasoning') || 'Analysis pending',
        expectedImpact: this.extractSection(section, 'Expected Impact') || this.extractSection(section, 'Impact') || 'Should improve system performance',
        confidence: this.extractConfidence(section),
        testingStrategy: this.extractSection(section, 'Testing') || this.extractSection(section, 'Test') || 'Verify with monitoring',
        risks: this.extractRisks(section),
        implementation: {
          filesAffected: this.extractFiles(section),
          complexity: this.extractComplexity(section),
          dependencies: []
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract a specific section from text
   */
  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}[:\\-\\s]+(.*?)(?=\\n\\n|\\n[A-Z]|$)`, 'is');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * Extract confidence score
   */
  private extractConfidence(text: string): number {
    const confidenceMatch = text.match(/confidence[:\\s]+(\d+)/i);
    if (confidenceMatch) {
      return Math.min(100, Math.max(0, parseInt(confidenceMatch[1])));
    }
    return 70; // Default confidence
  }

  /**
   * Extract risks from text
   */
  private extractRisks(text: string): string[] {
    const risksSection = this.extractSection(text, 'Risks');
    if (risksSection) {
      return risksSection
        .split(/\n|;/)
        .map(r => r.replace(/^[-*]\s*/, '').trim())
        .filter(r => r.length > 0)
        .slice(0, 5);
    }
    return ['Unknown risks - needs analysis'];
  }

  /**
   * Extract affected files
   */
  private extractFiles(text: string): string[] {
    const fileMatches = text.match(/[\w\/\-]+\.(ts|tsx|js|jsx|prisma)/gi);
    return fileMatches ? Array.from(new Set(fileMatches)).slice(0, 10) : [];
  }

  /**
   * Extract complexity level
   */
  private extractComplexity(text: string): 'low' | 'medium' | 'high' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('complexity: high') || lowerText.includes('complex') || lowerText.includes('difficult')) {
      return 'high';
    }
    if (lowerText.includes('complexity: low') || lowerText.includes('simple') || lowerText.includes('easy')) {
      return 'low';
    }
    return 'medium';
  }

  /**
   * Generate fallback hypothesis if AI fails
   */
  private generateFallbackHypothesis(problem: any): HypothesisData {
    return {
      problemId: problem.id,
      proposedSolution: `Investigate and resolve ${problem.type} issue: ${problem.title}`,
      reasoning: 'Automated detection identified this issue. Requires manual analysis to determine root cause.',
      expectedImpact: problem.impact,
      confidence: 50,
      testingStrategy: 'Monitor system metrics and user feedback after implementing fix',
      risks: ['Solution may not address root cause', 'Could introduce new issues if not tested properly'],
      implementation: {
        filesAffected: [],
        complexity: 'medium',
        dependencies: []
      }
    };
  }

  /**
   * Save hypothesis to database
   */
  private async saveHypothesis(hypothesis: HypothesisData): Promise<void> {
    try {
      await prisma.hypothesis.create({
        data: {
          problemId: hypothesis.problemId,
          proposedSolution: hypothesis.proposedSolution,
          reasoning: hypothesis.reasoning,
          expectedImpact: hypothesis.expectedImpact,
          confidence: hypothesis.confidence,
          testingStrategy: hypothesis.testingStrategy,
          risks: hypothesis.risks,
          implementation: hypothesis.implementation
        }
      });

      console.log(`[Hypothesis Generator] Saved hypothesis: ${hypothesis.proposedSolution.substring(0, 50)}...`);
    } catch (error) {
      console.error('[Hypothesis Generator] Error saving hypothesis:', error);
    }
  }

  /**
   * Get hypotheses for a problem
   */
  async getHypotheses(problemId: string): Promise<any[]> {
    return prisma.hypothesis.findMany({
      where: { problemId },
      orderBy: { confidence: 'desc' }
    });
  }

  /**
   * Mark hypothesis as tested
   */
  async recordTestResults(
    hypothesisId: string,
    testResults: {
      success: boolean;
      metrics: Record<string, any>;
      observations: string;
    }
  ): Promise<void> {
    await prisma.hypothesis.update({
      where: { id: hypothesisId },
      data: {
        tested: true,
        testResults: testResults
      }
    });
  }
}

/**
 * Get all hypotheses (optionally filtered by problem)
 */
export async function getHypotheses(problemId?: string): Promise<any[]> {
  const where = problemId ? { problemId } : {};
  
  return prisma.hypothesis.findMany({
    where,
    include: {
      problem: true,
      experiences: true
    },
    orderBy: { confidence: 'desc' }
  });
}
