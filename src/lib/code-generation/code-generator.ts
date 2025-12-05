/**
 * HOLLY's Code Generator
 * 
 * Generates new code, components, and features with AI assistance
 * 
 * Phase 5: Code Generation & Modification
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safeCodeModifier, type CodeModification, type CodeChange } from './safe-code-modifier';
import { automatedTesting } from './automated-testing';
import * as fs from 'fs/promises';
import * as path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ===========================
// Types & Interfaces
// ===========================

export interface CodeGenerationRequest {
  type: 'component' | 'api' | 'function' | 'class' | 'feature' | 'fix';
  description: string;
  fileName?: string;
  requirements: string[];
  constraints?: string[];
  style?: 'typescript' | 'javascript' | 'react' | 'nextjs';
  includeTests?: boolean;
}

export interface GeneratedCode {
  code: string;
  fileName: string;
  description: string;
  dependencies: string[];
  warnings: string[];
}

export interface CodeGenerationResult {
  success: boolean;
  generated: GeneratedCode[];
  errors: string[];
  testsRun: boolean;
  testsPassed: boolean;
}

// ===========================
// Code Generator Class
// ===========================

export class CodeGenerator {
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  /**
   * Generate code based on request
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const result: CodeGenerationResult = {
      success: false,
      generated: [],
      errors: [],
      testsRun: false,
      testsPassed: false
    };

    try {
      console.log(`[CODE-GEN] Generating ${request.type}: ${request.description}`);

      // Step 1: Generate code with AI
      const generatedCode = await this.generateWithAI(request);
      result.generated = generatedCode;

      // Step 2: Write generated files
      for (const gen of generatedCode) {
        await this.writeGeneratedFile(gen);
      }

      // Step 3: Run tests if requested
      if (request.includeTests) {
        console.log('[CODE-GEN] Running tests on generated code...');
        result.testsRun = true;

        const testResult = await automatedTesting.runPreDeploymentTests();
        result.testsPassed = testResult.overallPassed;

        if (!testResult.overallPassed) {
          result.errors.push('Generated code failed tests');
          // Optionally delete generated files
          console.error('[CODE-GEN] Generated code failed tests - consider rolling back');
        }
      }

      result.success = result.errors.length === 0;

      console.log(
        result.success
          ? `[CODE-GEN] ✅ Successfully generated ${result.generated.length} file(s)`
          : `[CODE-GEN] ❌ Code generation failed: ${result.errors.join(', ')}`
      );

      return result;

    } catch (error) {
      console.error('[CODE-GEN] Error:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Generate code using AI
   */
  private async generateWithAI(request: CodeGenerationRequest): Promise<GeneratedCode[]> {
    const prompt = this.buildGenerationPrompt(request);

    const response = await this.model.generateContent(prompt);
    const text = response.response.text();

    // Parse AI response to extract code blocks
    return this.parseAIResponse(text, request);
  }

  /**
   * Build prompt for AI code generation
   */
  private buildGenerationPrompt(request: CodeGenerationRequest): string {
    const styleGuide = this.getStyleGuide(request.style || 'typescript');

    return `You are HOLLY, an expert software engineer specializing in ${request.style || 'TypeScript'}.

Generate production-ready code for the following:

**Type**: ${request.type}
**Description**: ${request.description}

**Requirements**:
${request.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${request.constraints ? `**Constraints**:\n${request.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : ''}

**Style Guide**:
${styleGuide}

**Output Format**:
For each file, use this format:

\`\`\`filename: /path/to/file.ts
// File description

[YOUR CODE HERE]
\`\`\`

**Requirements**:
- Use TypeScript with strict types
- Follow Next.js 14 conventions (app router)
- Include comprehensive error handling
- Add JSDoc comments for public functions
- Use modern ES6+ syntax
- Ensure code is production-ready
- Include any necessary imports
${request.includeTests ? '- Generate corresponding test files' : ''}

Generate the code now:`;
  }

  /**
   * Get style guide for specific language/framework
   */
  private getStyleGuide(style: string): string {
    const guides: Record<string, string> = {
      typescript: `
- Use strict TypeScript types (no 'any')
- Prefer interfaces over types for objects
- Use const for immutable values
- Use async/await over promises
- Export types and interfaces separately`,

      react: `
- Use functional components with hooks
- Prefer named exports
- Use TypeScript for prop types
- Keep components small and focused
- Use proper React 18+ patterns`,

      nextjs: `
- Use Next.js 14 app router conventions
- Place components in 'src/components'
- Place APIs in 'app/api'
- Use server components by default
- Add 'use client' only when needed
- Use proper Next.js imports (@/...)`,

      javascript: `
- Use modern ES6+ syntax
- Use const/let, never var
- Prefer arrow functions
- Use destructuring
- Include proper error handling`
    };

    return guides[style] || guides.typescript;
  }

  /**
   * Parse AI response to extract generated code
   */
  private parseAIResponse(text: string, request: CodeGenerationRequest): GeneratedCode[] {
    const generated: GeneratedCode[] = [];
    
    // Match code blocks with filename: header
    const codeBlockRegex = /```(?:filename:\s*(.*?)\n)?([\s\S]*?)```/g;
    let match;
    let fileIndex = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const fileName = match[1]?.trim() || request.fileName || `generated-${fileIndex++}.ts`;
      const code = match[2].trim();

      // Extract description (first comment block)
      const descMatch = code.match(/\/\*\*([\s\S]*?)\*\/|\/\/\s*(.*?)$/m);
      const description = descMatch
        ? (descMatch[1] || descMatch[2]).trim()
        : `Generated ${request.type}`;

      // Extract dependencies (import statements)
      const dependencies: string[] = [];
      const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
      let importMatch;
      
      while ((importMatch = importRegex.exec(code)) !== null) {
        dependencies.push(importMatch[1]);
      }

      generated.push({
        code,
        fileName,
        description,
        dependencies,
        warnings: []
      });
    }

    return generated;
  }

  /**
   * Write generated file to disk
   */
  private async writeGeneratedFile(gen: GeneratedCode): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(gen.fileName);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(gen.fileName, gen.code, 'utf-8');
      console.log(`[CODE-GEN] ✅ Written: ${gen.fileName}`);

    } catch (error) {
      console.error(`[CODE-GEN] Failed to write ${gen.fileName}:`, error);
      throw error;
    }
  }

  /**
   * Generate a fix for a specific issue
   */
  async generateFix(issue: {
    file: string;
    line?: number;
    error: string;
    context: string;
  }): Promise<CodeGenerationResult> {
    console.log(`[CODE-GEN] Generating fix for: ${issue.error}`);

    const request: CodeGenerationRequest = {
      type: 'fix',
      description: `Fix the following error in ${issue.file}:\n\n${issue.error}\n\nContext:\n${issue.context}`,
      fileName: issue.file,
      requirements: [
        'Fix the error completely',
        'Maintain existing functionality',
        'Follow TypeScript best practices',
        'Add comments explaining the fix'
      ],
      includeTests: true
    };

    return await this.generateCode(request);
  }

  /**
   * Generate a new React component
   */
  async generateComponent(name: string, props: string[], description: string): Promise<CodeGenerationResult> {
    const fileName = `src/components/${name}.tsx`;

    const request: CodeGenerationRequest = {
      type: 'component',
      description,
      fileName,
      requirements: [
        `Component name: ${name}`,
        `Props: ${props.join(', ')}`,
        'Use TypeScript with proper prop types',
        'Include JSDoc documentation',
        'Use Tailwind CSS for styling',
        'Make it responsive'
      ],
      style: 'react',
      includeTests: false
    };

    return await this.generateCode(request);
  }

  /**
   * Generate a new API endpoint
   */
  async generateAPI(name: string, method: string, description: string): Promise<CodeGenerationResult> {
    const fileName = `app/api/${name}/route.ts`;

    const request: CodeGenerationRequest = {
      type: 'api',
      description,
      fileName,
      requirements: [
        `HTTP method: ${method}`,
        'Use Next.js route handler format',
        'Include authentication check',
        'Add comprehensive error handling',
        'Return proper JSON responses',
        'Add request validation'
      ],
      style: 'nextjs',
      includeTests: true
    };

    return await this.generateCode(request);
  }
}

// ===========================
// Export Singleton Instance
// ===========================

export const codeGenerator = new CodeGenerator();
