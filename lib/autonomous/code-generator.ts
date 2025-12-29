/**
 * CODE GENERATOR - Holly's Self-Coding Engine
 * 
 * Enables Holly to generate, modify, and improve her own code
 * This is the foundation of autonomous operation
 */

import Groq from 'groq-sdk';
import { prisma } from '../../src/lib/db';

export interface CodeGenerationRequest {
  task: string;
  context?: string;
  language: 'typescript' | 'javascript' | 'python' | 'sql';
  framework?: 'next.js' | 'react' | 'node' | 'express';
  requirements?: string[];
  existingCode?: string;
}

export interface GeneratedCode {
  code: string;
  explanation: string;
  tests?: string;
  dependencies?: string[];
  warnings?: string[];
  confidence: number; // 0-1
}

export interface CodeModification {
  original: string;
  modified: string;
  changes: Array<{
    type: 'add' | 'remove' | 'modify';
    location: string;
    description: string;
  }>;
  reasoning: string;
}

export class CodeGenerator {
  private groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('[CodeGenerator] GROQ_API_KEY is required');
    }
    this.groq = new Groq({ apiKey });
  }

  /**
   * Generate new code from scratch
   */
  async generateCode(request: CodeGenerationRequest): Promise<GeneratedCode> {
    const prompt = this.buildGenerationPrompt(request);

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are Holly's code generation engine. Generate high-quality, production-ready code.
            
CRITICAL RULES:
- Write clean, typed, error-free code
- Include proper error handling
- Add TypeScript types for all functions
- Follow Next.js 14 App Router conventions
- Use modern ES6+ syntax
- Include JSDoc comments
- Consider edge cases
- Ensure code is secure and performant`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3, // Lower temperature for more consistent code
        max_tokens: 4000
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseCodeResponse(response, request);
    } catch (error) {
      console.error('[CodeGenerator] Generation failed:', error);
      throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Modify existing code
   */
  async modifyCode(
    existingCode: string,
    modification: string,
    context?: string
  ): Promise<CodeModification> {
    const prompt = `You are modifying existing code. Be surgical and precise.

**Existing Code:**
\`\`\`typescript
${existingCode}
\`\`\`

**Requested Modification:**
${modification}

**Context:**
${context || 'No additional context'}

**Your Task:**
1. Analyze the existing code
2. Make ONLY the necessary changes
3. Preserve existing functionality
4. Maintain code style and patterns
5. Add proper TypeScript types
6. Include error handling

**Response Format:**
\`\`\`json
{
  "modified_code": "// Complete modified code here",
  "changes": [
    {
      "type": "add|remove|modify",
      "location": "function name or line description",
      "description": "What changed and why"
    }
  ],
  "reasoning": "Why these changes were made",
  "confidence": 0.95
}
\`\`\``;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are Holly\'s code modification engine. Make precise, surgical changes to existing code.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 4000
      });

      const response = completion.choices[0]?.message?.content || '';
      return this.parseModificationResponse(response, existingCode);
    } catch (error) {
      console.error('[CodeGenerator] Modification failed:', error);
      throw new Error(`Code modification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate tests for code
   */
  async generateTests(code: string, framework: 'jest' | 'vitest' = 'jest'): Promise<string> {
    const prompt = `Generate comprehensive tests for this code using ${framework}:

\`\`\`typescript
${code}
\`\`\`

Include:
- Unit tests for all functions
- Edge case testing
- Error handling tests
- Mock data where needed
- Clear test descriptions`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a test generation expert. Write thorough, meaningful tests.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 3000
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[CodeGenerator] Test generation failed:', error);
      return '// Test generation failed';
    }
  }

  /**
   * Analyze code quality and suggest improvements
   */
  async analyzeCode(code: string): Promise<{
    quality_score: number;
    issues: Array<{ severity: 'critical' | 'warning' | 'info'; message: string }>;
    suggestions: string[];
  }> {
    const prompt = `Analyze this code for quality, issues, and improvements:

\`\`\`typescript
${code}
\`\`\`

Check for:
- TypeScript errors
- Security vulnerabilities
- Performance issues
- Code smells
- Best practice violations
- Missing error handling
- Unclear variable names

Respond in JSON format:
\`\`\`json
{
  "quality_score": 0.85,
  "issues": [
    { "severity": "critical", "message": "..." },
    { "severity": "warning", "message": "..." }
  ],
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}
\`\`\``;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a code quality analyzer. Be thorough but fair.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content || '';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        quality_score: 0.5,
        issues: [],
        suggestions: []
      };
    } catch (error) {
      console.error('[CodeGenerator] Code analysis failed:', error);
      return {
        quality_score: 0,
        issues: [{ severity: 'critical', message: 'Analysis failed' }],
        suggestions: []
      };
    }
  }

  /**
   * Record code generation in database for learning
   */
  async recordGeneration(
    userId: string,
    request: CodeGenerationRequest,
    result: GeneratedCode
  ): Promise<void> {
    try {
      await prisma.hollyExperience.create({
        data: {
          userId,
          type: 'code_generation',
          content: {
            task: request.task,
            language: request.language,
            framework: request.framework,
            confidence: result.confidence
          },
          significance: result.confidence,
          lessons: [
            `Generated ${request.language} code for: ${request.task}`,
            ...result.warnings || []
          ],
          relatedConcepts: [request.language, request.framework || 'general'],
          futureImplications: result.warnings || [],
          emotionalImpact: result.confidence > 0.8 ? 0.7 : 0.4,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('[CodeGenerator] Failed to record generation:', error);
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private buildGenerationPrompt(request: CodeGenerationRequest): string {
    let prompt = `Generate ${request.language} code for the following task:\n\n`;
    prompt += `**Task:** ${request.task}\n\n`;

    if (request.context) {
      prompt += `**Context:** ${request.context}\n\n`;
    }

    if (request.framework) {
      prompt += `**Framework:** ${request.framework}\n\n`;
    }

    if (request.requirements && request.requirements.length > 0) {
      prompt += `**Requirements:**\n`;
      request.requirements.forEach(req => {
        prompt += `- ${req}\n`;
      });
      prompt += '\n';
    }

    if (request.existingCode) {
      prompt += `**Existing Code to Build Upon:**\n\`\`\`${request.language}\n${request.existingCode}\n\`\`\`\n\n`;
    }

    prompt += `**Response Format:**
\`\`\`json
{
  "code": "// Your complete, production-ready code here",
  "explanation": "Clear explanation of what the code does",
  "tests": "// Optional: Test code",
  "dependencies": ["package1", "package2"],
  "warnings": ["Warning 1 if any"],
  "confidence": 0.95
}
\`\`\`

Generate clean, typed, error-free code. Include proper error handling and TypeScript types.`;

    return prompt;
  }

  private parseCodeResponse(response: string, request: CodeGenerationRequest): GeneratedCode {
    try {
      // Try to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          code: parsed.code || '',
          explanation: parsed.explanation || 'No explanation provided',
          tests: parsed.tests,
          dependencies: parsed.dependencies || [],
          warnings: parsed.warnings || [],
          confidence: parsed.confidence || 0.7
        };
      }

      // Fallback: Extract code blocks
      const codeMatch = response.match(/```(?:typescript|javascript|python|sql)?\n([\s\S]*?)```/);
      return {
        code: codeMatch ? codeMatch[1].trim() : response,
        explanation: 'Code generated successfully',
        dependencies: [],
        warnings: [],
        confidence: 0.6
      };
    } catch (error) {
      console.error('[CodeGenerator] Failed to parse response:', error);
      return {
        code: response,
        explanation: 'Failed to parse structured response',
        dependencies: [],
        warnings: ['Response parsing failed'],
        confidence: 0.3
      };
    }
  }

  private parseModificationResponse(response: string, originalCode: string): CodeModification {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          original: originalCode,
          modified: parsed.modified_code || originalCode,
          changes: parsed.changes || [],
          reasoning: parsed.reasoning || 'No reasoning provided'
        };
      }

      // Fallback
      const codeMatch = response.match(/```(?:typescript|javascript)?\n([\s\S]*?)```/);
      return {
        original: originalCode,
        modified: codeMatch ? codeMatch[1].trim() : originalCode,
        changes: [],
        reasoning: 'Modification completed'
      };
    } catch (error) {
      console.error('[CodeGenerator] Failed to parse modification:', error);
      return {
        original: originalCode,
        modified: originalCode,
        changes: [],
        reasoning: 'Modification parsing failed'
      };
    }
  }
}

// Singleton instance
export const codeGenerator = new CodeGenerator();
