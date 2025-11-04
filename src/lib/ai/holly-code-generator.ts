/**
 * HOLLY Code Generation Engine
 * 
 * Autonomous code generation system supporting multiple languages,
 * templates, optimization, documentation, and testing integration.
 * 
 * @author HOLLY (Hyper-Optimized Logic & Learning Yield)
 * @created 2024
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type SupportedLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'nodejs'
  | 'react'
  | 'html'
  | 'css'
  | 'sql'
  | 'php';

export type CodeTemplate = 
  | 'react-component'
  | 'react-hook'
  | 'api-route'
  | 'database-schema'
  | 'express-server'
  | 'typescript-class'
  | 'python-class'
  | 'sql-migration'
  | 'html-page'
  | 'css-module';

export interface CodeGenerationRequest {
  prompt: string;
  language: SupportedLanguage;
  template?: CodeTemplate;
  style?: CodeStyle;
  includeTests?: boolean;
  includeDocs?: boolean;
  optimizationLevel?: 'basic' | 'standard' | 'aggressive';
  context?: string;
}

export interface CodeStyle {
  indent: 'tabs' | 'spaces';
  indentSize: number;
  quotes: 'single' | 'double';
  semicolons: boolean;
  trailingComma: boolean;
  lineLength: number;
  naming: 'camelCase' | 'snake_case' | 'PascalCase';
}

export interface GeneratedCode {
  code: string;
  language: SupportedLanguage;
  filename: string;
  documentation?: string;
  tests?: string;
  dependencies?: string[];
  warnings?: string[];
  suggestions?: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface CodeReview {
  score: number; // 0-100
  issues: CodeIssue[];
  suggestions: string[];
  securityConcerns: string[];
  performanceNotes: string[];
  bestPractices: string[];
}

export interface CodeIssue {
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  fix?: string;
}

export interface OptimizationResult {
  originalCode: string;
  optimizedCode: string;
  improvements: string[];
  performanceGain?: string;
  complexityReduction?: string;
}

// ============================================================================
// Code Templates
// ============================================================================

const CODE_TEMPLATES: Record<CodeTemplate, string> = {
  'react-component': `
import React from 'react';

interface {{ComponentName}}Props {
  // Define props here
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = (props) => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
};
`,

  'react-hook': `
import { useState, useEffect } from 'react';

export const use{{HookName}} = (initialValue: any) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    // Effect logic here
  }, [value]);

  return { value, setValue };
};
`,

  'api-route': `
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // GET logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // POST logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
`,

  'database-schema': `
CREATE TABLE {{table_name}} (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Add columns here
);

-- Indexes
CREATE INDEX idx_{{table_name}}_created_at ON {{table_name}}(created_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_{{table_name}}_updated_at BEFORE UPDATE ON {{table_name}}
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`,

  'express-server': `
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,

  'typescript-class': `
/**
 * {{ClassName}} class
 */
export class {{ClassName}} {
  private property: string;

  constructor(initialValue: string) {
    this.property = initialValue;
  }

  public method(): void {
    // Method implementation
  }
}
`,

  'python-class': `
"""
{{ClassName}} class module
"""

class {{ClassName}}:
    """{{ClassName}} description"""
    
    def __init__(self, initial_value: str):
        """Initialize {{ClassName}}"""
        self.property = initial_value
    
    def method(self) -> None:
        """Method implementation"""
        pass
`,

  'sql-migration': `
-- Migration: {{migration_name}}
-- Created: {{timestamp}}

-- Up Migration
BEGIN;

-- Add your migration SQL here

COMMIT;

-- Down Migration (rollback)
BEGIN;

-- Add rollback SQL here

COMMIT;
`,

  'html-page': `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PageTitle}}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>{{PageTitle}}</h1>
  </header>
  
  <main>
    <!-- Main content -->
  </main>
  
  <footer>
    <p>&copy; 2024</p>
  </footer>
  
  <script src="script.js"></script>
</body>
</html>
`,

  'css-module': `
/* {{ModuleName}} styles */

.{{moduleName}} {
  /* Container styles */
}

.{{moduleName}}__element {
  /* Element styles */
}

.{{moduleName}}__element--modifier {
  /* Modifier styles */
}

/* Responsive */
@media (max-width: 768px) {
  .{{moduleName}} {
    /* Mobile styles */
  }
}
`
};

// ============================================================================
// Language-Specific Configurations
// ============================================================================

const LANGUAGE_CONFIGS: Record<SupportedLanguage, {
  fileExtension: string;
  defaultStyle: CodeStyle;
  linter?: string;
  testFramework?: string;
}> = {
  javascript: {
    fileExtension: '.js',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semicolons: true,
      trailingComma: true,
      lineLength: 80,
      naming: 'camelCase'
    },
    linter: 'eslint',
    testFramework: 'jest'
  },
  typescript: {
    fileExtension: '.ts',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semicolons: true,
      trailingComma: true,
      lineLength: 80,
      naming: 'camelCase'
    },
    linter: 'eslint',
    testFramework: 'jest'
  },
  python: {
    fileExtension: '.py',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 4,
      quotes: 'single',
      semicolons: false,
      trailingComma: true,
      lineLength: 88,
      naming: 'snake_case'
    },
    linter: 'pylint',
    testFramework: 'pytest'
  },
  nodejs: {
    fileExtension: '.js',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semicolons: true,
      trailingComma: true,
      lineLength: 80,
      naming: 'camelCase'
    },
    linter: 'eslint',
    testFramework: 'jest'
  },
  react: {
    fileExtension: '.tsx',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semicolons: true,
      trailingComma: true,
      lineLength: 80,
      naming: 'camelCase'
    },
    linter: 'eslint',
    testFramework: 'jest'
  },
  html: {
    fileExtension: '.html',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 2,
      quotes: 'double',
      semicolons: false,
      trailingComma: false,
      lineLength: 120,
      naming: 'camelCase'
    }
  },
  css: {
    fileExtension: '.css',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semicolons: true,
      trailingComma: false,
      lineLength: 80,
      naming: 'camelCase'
    }
  },
  sql: {
    fileExtension: '.sql',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 2,
      quotes: 'single',
      semicolons: true,
      trailingComma: false,
      lineLength: 80,
      naming: 'snake_case'
    }
  },
  php: {
    fileExtension: '.php',
    defaultStyle: {
      indent: 'spaces',
      indentSize: 4,
      quotes: 'single',
      semicolons: true,
      trailingComma: true,
      lineLength: 120,
      naming: 'camelCase'
    }
  }
};

// ============================================================================
// Code Generation Engine
// ============================================================================

export class CodeGenerationEngine {
  private anthropic: Anthropic;
  private model: string;
  private defaultOptimizationLevel: 'basic' | 'standard' | 'aggressive';

  constructor(
    apiKey: string,
    model: string = 'claude-3-5-sonnet-20241022',
    defaultOptimizationLevel: 'basic' | 'standard' | 'aggressive' = 'standard'
  ) {
    this.anthropic = new Anthropic({ apiKey });
    this.model = model;
    this.defaultOptimizationLevel = defaultOptimizationLevel;
  }

  /**
   * Generate code based on request
   */
  async generateCode(request: CodeGenerationRequest): Promise<GeneratedCode> {
    try {
      const config = LANGUAGE_CONFIGS[request.language];
      const style = request.style || config.defaultStyle;
      
      // Get template if specified
      let templateCode = '';
      if (request.template) {
        templateCode = CODE_TEMPLATES[request.template];
      }

      // Build generation prompt
      const prompt = this.buildGenerationPrompt(request, templateCode, style);

      // Generate code using Claude
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.2, // Low temperature for consistent code
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const generatedText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      // Extract code from response
      const code = this.extractCode(generatedText);

      // Generate filename
      const filename = this.generateFilename(request, config.fileExtension);

      // Generate documentation if requested
      let documentation: string | undefined;
      if (request.includeDocs) {
        documentation = await this.generateDocumentation(code, request.language);
      }

      // Generate tests if requested
      let tests: string | undefined;
      if (request.includeTests && config.testFramework) {
        tests = await this.generateTests(code, request.language, config.testFramework);
      }

      // Extract dependencies
      const dependencies = this.extractDependencies(code, request.language);

      // Analyze complexity
      const estimatedComplexity = this.estimateComplexity(code);

      // Generate warnings and suggestions
      const { warnings, suggestions } = await this.analyzeCode(code, request.language);

      return {
        code,
        language: request.language,
        filename,
        documentation,
        tests,
        dependencies,
        warnings,
        suggestions,
        estimatedComplexity
      };

    } catch (error) {
      console.error('Code generation error:', error);
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Review existing code
   */
  async reviewCode(code: string, language: SupportedLanguage): Promise<CodeReview> {
    try {
      const prompt = `You are an expert code reviewer. Analyze this ${language} code and provide a comprehensive review.

CODE:
\`\`\`${language}
${code}
\`\`\`

Provide your review in the following JSON format:
{
  "score": <0-100>,
  "issues": [
    {
      "severity": "error|warning|info",
      "line": <line number if applicable>,
      "message": "description",
      "fix": "suggested fix"
    }
  ],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "securityConcerns": ["concern 1", "concern 2"],
  "performanceNotes": ["note 1", "note 2"],
  "bestPractices": ["practice 1", "practice 2"]
}`;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const reviewText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '{}';

      const review = JSON.parse(this.extractJSON(reviewText));

      return review as CodeReview;

    } catch (error) {
      console.error('Code review error:', error);
      throw new Error(`Failed to review code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize existing code
   */
  async optimizeCode(
    code: string,
    language: SupportedLanguage,
    level: 'basic' | 'standard' | 'aggressive' = 'standard'
  ): Promise<OptimizationResult> {
    try {
      const optimizationGoals = {
        basic: 'minor improvements, maintain readability',
        standard: 'balanced optimization for performance and readability',
        aggressive: 'maximum performance, advanced patterns'
      };

      const prompt = `You are an expert code optimizer. Optimize this ${language} code with a ${level} optimization level.

Optimization goals: ${optimizationGoals[level]}

ORIGINAL CODE:
\`\`\`${language}
${code}
\`\`\`

Provide your optimization in the following JSON format:
{
  "optimizedCode": "the optimized code",
  "improvements": ["improvement 1", "improvement 2"],
  "performanceGain": "estimated performance improvement",
  "complexityReduction": "complexity reduction description"
}`;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const resultText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '{}';

      const result = JSON.parse(this.extractJSON(resultText));

      return {
        originalCode: code,
        ...result
      } as OptimizationResult;

    } catch (error) {
      console.error('Code optimization error:', error);
      throw new Error(`Failed to optimize code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate documentation for code
   */
  async generateDocumentation(code: string, language: SupportedLanguage): Promise<string> {
    try {
      const docStyle = language === 'python' ? 'Google-style docstrings' : 'JSDoc';

      const prompt = `Generate comprehensive ${docStyle} documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
- Function/class descriptions
- Parameter descriptions with types
- Return value descriptions
- Usage examples
- Any important notes or warnings`;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

    } catch (error) {
      console.error('Documentation generation error:', error);
      return '// Documentation generation failed';
    }
  }

  /**
   * Generate tests for code
   */
  async generateTests(
    code: string,
    language: SupportedLanguage,
    testFramework: string
  ): Promise<string> {
    try {
      const prompt = `Generate comprehensive ${testFramework} tests for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
- Unit tests for all functions/methods
- Edge case testing
- Error handling tests
- Mock setup where needed
- Clear test descriptions`;

      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 3000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

    } catch (error) {
      console.error('Test generation error:', error);
      return '// Test generation failed';
    }
  }

  /**
   * Get available templates for a language
   */
  getTemplatesForLanguage(language: SupportedLanguage): CodeTemplate[] {
    const languageTemplateMap: Record<SupportedLanguage, CodeTemplate[]> = {
      react: ['react-component', 'react-hook'],
      typescript: ['typescript-class', 'api-route', 'react-component', 'react-hook'],
      javascript: ['express-server', 'api-route'],
      nodejs: ['express-server', 'api-route'],
      python: ['python-class'],
      sql: ['database-schema', 'sql-migration'],
      html: ['html-page'],
      css: ['css-module'],
      php: []
    };

    return languageTemplateMap[language] || [];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private buildGenerationPrompt(
    request: CodeGenerationRequest,
    templateCode: string,
    style: CodeStyle
  ): string {
    let prompt = `You are an expert ${request.language} developer. Generate clean, production-ready code based on the following requirements.

REQUIREMENTS:
${request.prompt}

LANGUAGE: ${request.language}
`;

    if (templateCode) {
      prompt += `\nTEMPLATE (use this as a starting point):
\`\`\`
${templateCode}
\`\`\`
`;
    }

    if (request.context) {
      prompt += `\nCONTEXT:
${request.context}
`;
    }

    prompt += `\nCODE STYLE:
- Indentation: ${style.indent === 'tabs' ? 'tabs' : `${style.indentSize} spaces`}
- Quotes: ${style.quotes}
- Semicolons: ${style.semicolons ? 'required' : 'omit'}
- Trailing commas: ${style.trailingComma ? 'yes' : 'no'}
- Max line length: ${style.lineLength}
- Naming convention: ${style.naming}

REQUIREMENTS:
- Follow best practices for ${request.language}
- Include error handling
- Add inline comments for complex logic
- Make code modular and reusable
- Ensure type safety (if applicable)
- Optimize for performance and readability

Return ONLY the code, no explanations.`;

    return prompt;
  }

  private extractCode(text: string): string {
    // Try to extract code from markdown code blocks
    const codeBlockMatch = text.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    return text.trim();
  }

  private extractJSON(text: string): string {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
    
    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return objectMatch[0];
    }
    
    return text.trim();
  }

  private generateFilename(request: CodeGenerationRequest, extension: string): string {
    // Try to extract a meaningful name from the prompt
    const words = request.prompt.toLowerCase().split(/\s+/);
    const keywords = ['create', 'build', 'generate', 'make', 'write'];
    
    let name = 'generated-code';
    
    for (let i = 0; i < words.length - 1; i++) {
      if (keywords.includes(words[i])) {
        name = words[i + 1].replace(/[^a-z0-9]/g, '-');
        break;
      }
    }

    return `${name}${extension}`;
  }

  private extractDependencies(code: string, language: SupportedLanguage): string[] {
    const dependencies: string[] = [];

    if (language === 'javascript' || language === 'typescript' || language === 'react' || language === 'nodejs') {
      // Extract import statements
      const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        if (!match[1].startsWith('.') && !match[1].startsWith('/')) {
          dependencies.push(match[1]);
        }
      }

      // Extract require statements
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(code)) !== null) {
        if (!match[1].startsWith('.') && !match[1].startsWith('/')) {
          dependencies.push(match[1]);
        }
      }
    } else if (language === 'python') {
      // Extract import statements
      const importRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        const module = match[1] || match[2];
        if (module && !module.startsWith('.')) {
          dependencies.push(module.split('.')[0]);
        }
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  private estimateComplexity(code: string): 'low' | 'medium' | 'high' {
    const lines = code.split('\n').length;
    const cyclomaticIndicators = (code.match(/if|for|while|switch|catch|\?\?|\|\||&&/g) || []).length;
    
    if (lines < 50 && cyclomaticIndicators < 5) return 'low';
    if (lines < 200 && cyclomaticIndicators < 15) return 'medium';
    return 'high';
  }

  private async analyzeCode(
    code: string,
    language: SupportedLanguage
  ): Promise<{ warnings: string[]; suggestions: string[] }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic static analysis
    if (language === 'javascript' || language === 'typescript' || language === 'react') {
      if (code.includes('eval(')) {
        warnings.push('Use of eval() detected - potential security risk');
      }
      if (code.includes('console.log')) {
        suggestions.push('Consider removing console.log statements in production');
      }
      if (!code.includes('try') && code.includes('await')) {
        suggestions.push('Consider adding error handling for async operations');
      }
    }

    if (language === 'python') {
      if (code.includes('exec(')) {
        warnings.push('Use of exec() detected - potential security risk');
      }
      if (code.includes('print(')) {
        suggestions.push('Consider using logging instead of print statements');
      }
    }

    // Check for common issues
    const lines = code.split('\n');
    if (lines.some(line => line.length > 120)) {
      suggestions.push('Some lines exceed 120 characters - consider breaking them up');
    }

    return { warnings, suggestions };
  }
}

// ============================================================================
// Export utilities
// ============================================================================

export const supportedLanguages: SupportedLanguage[] = [
  'javascript',
  'typescript',
  'python',
  'nodejs',
  'react',
  'html',
  'css',
  'sql',
  'php'
];

export const codeTemplates: CodeTemplate[] = [
  'react-component',
  'react-hook',
  'api-route',
  'database-schema',
  'express-server',
  'typescript-class',
  'python-class',
  'sql-migration',
  'html-page',
  'css-module'
];

/**
 * Create a new code generation engine instance
 */
export function createCodeGenerator(
  apiKey: string,
  model?: string,
  defaultOptimizationLevel?: 'basic' | 'standard' | 'aggressive'
): CodeGenerationEngine {
  return new CodeGenerationEngine(apiKey, model, defaultOptimizationLevel);
}
