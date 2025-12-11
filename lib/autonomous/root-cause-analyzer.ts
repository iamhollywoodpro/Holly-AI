/**
 * ROOT CAUSE ANALYZER - HOLLY's Brain for Problem Diagnosis
 * 
 * This is NOT keyword matching. This is semantic analysis using GPT-4.
 * HOLLY will understand the MEANING of errors, not just patterns.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ProblemContext {
  errorMessage: string;
  stackTrace?: string;
  fileLocation?: string;
  lineNumber?: number;
  recentChanges?: string[];
  relatedCode?: string;
  userContext?: string;
}

export interface RootCause {
  cause: string;
  confidence: number;
  reasoning: string;
  affectedFiles: string[];
  suggestedFix: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: 'syntax' | 'logic' | 'runtime' | 'performance' | 'security' | 'design';
}

export class RootCauseAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Analyze a problem and determine its root cause using semantic understanding
   */
  async analyze(context: ProblemContext): Promise<RootCause> {
    const prompt = this.buildAnalysisPrompt(context);

    try {
      const systemPrompt = 'You are HOLLY, an expert AI software engineer with deep understanding of code architecture, debugging, and root cause analysis. You think semantically, not through pattern matching. You understand INTENT, not just syntax.';
      const fullPrompt = `${systemPrompt}\n\n${prompt}\n\nRespond ONLY with valid JSON.`;

      const response = await this.model.generateContent(fullPrompt);
      const text = response.response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      
      return {
        cause: result.root_cause || 'Unknown cause',
        confidence: result.confidence || 0.5,
        reasoning: result.reasoning || '',
        affectedFiles: result.affected_files || [],
        suggestedFix: result.suggested_fix || '',
        impact: result.impact || 'medium',
        category: result.category || 'logic'
      };
    } catch (error) {
      console.error('[RootCauseAnalyzer] Error analyzing problem:', error);
      throw new Error('Failed to analyze root cause');
    }
  }

  /**
   * Analyze code quality semantically (not keyword matching)
   */
  async analyzeCodeQuality(code: string, filePath: string): Promise<{
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      suggestion: string;
      line?: number;
    }>;
    complexity: number;
    maintainability: number;
    security: number;
  }> {
    const prompt = `Analyze this code for quality issues using semantic understanding:

File: ${filePath}

\`\`\`typescript
${code}
\`\`\`

Provide deep semantic analysis:
1. Potential bugs (not just syntax, but LOGIC errors)
2. Performance issues (algorithmic complexity, unnecessary operations)
3. Security vulnerabilities (injection, XSS, auth issues)
4. Code smells (duplicate logic, tight coupling, poor naming)
5. Maintainability issues (complex functions, unclear intent)
6. Complexity score (1-10, based on cyclomatic complexity + cognitive load)
7. Maintainability score (1-10)
8. Security score (1-10)

Think like a senior engineer reviewing this code. Find issues a junior dev would miss.

Respond in JSON format:
{
  "issues": [
    {
      "type": "bug|performance|security|maintainability",
      "severity": "low|medium|high",
      "description": "What's wrong",
      "suggestion": "How to fix it",
      "line": 10
    }
  ],
  "complexity": 7,
  "maintainability": 6,
  "security": 8
}`;

    try {
      const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON.`;
      const response = await this.model.generateContent(fullPrompt);
      const text = response.response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (error) {
      console.error('[RootCauseAnalyzer] Error analyzing code quality:', error);
      return {
        issues: [],
        complexity: 5,
        maintainability: 5,
        security: 5
      };
    }
  }

  /**
   * Analyze system-wide patterns (detect recurring issues)
   */
  async analyzePatterns(recentErrors: string[]): Promise<{
    patterns: Array<{
      pattern: string;
      frequency: number;
      commonCause: string;
      recommendation: string;
    }>;
    systemicIssue: boolean;
  }> {
    const prompt = `Analyze these recent errors for patterns:

${recentErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Find:
1. Recurring patterns (same root cause?)
2. Common themes (database issues? API failures? auth problems?)
3. Systemic issues (architectural problems?)
4. Recommendations to prevent these errors

Respond in JSON.`;

    try {
      const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON.`;
      const response = await this.model.generateContent(fullPrompt);
      const text = response.response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (error) {
      console.error('[RootCauseAnalyzer] Error analyzing patterns:', error);
      return {
        patterns: [],
        systemicIssue: false
      };
    }
  }

  private buildAnalysisPrompt(context: ProblemContext): string {
    return `Analyze this error and determine its root cause using deep semantic understanding:

**Error Message:**
${context.errorMessage}

**Stack Trace:**
${context.stackTrace || 'N/A'}

**File Location:**
${context.fileLocation || 'Unknown'}:${context.lineNumber || '?'}

**Recent Changes:**
${context.recentChanges?.join('\n') || 'None provided'}

**Related Code:**
\`\`\`typescript
${context.relatedCode || 'N/A'}
\`\`\`

**User Context:**
${context.userContext || 'None'}

---

**Your Task:**
Think like a senior engineer debugging this. Don't just match keywords. Understand:
- What was the INTENT of this code?
- Why did this error happen (not just "what" but "WHY")?
- What are the RIPPLE EFFECTS of this error?
- What's the BEST fix (not just quick fix)?

Provide your analysis in JSON format:
{
  "root_cause": "Specific root cause (be precise)",
  "confidence": 0.85,
  "reasoning": "Your reasoning process (show your thinking)",
  "affected_files": ["file1.ts", "file2.ts"],
  "suggested_fix": "Specific code changes or architectural changes needed",
  "impact": "low|medium|high|critical",
  "category": "syntax|logic|runtime|performance|security|design"
}`;
  }
}

// Singleton instance
export const rootCauseAnalyzer = new RootCauseAnalyzer();
