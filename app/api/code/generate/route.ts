/**
 * HOLLY Code Generation API Route
 * 
 * Endpoint for secure code generation with ethics and security validation.
 * 
 * @route POST /api/code/generate
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecureCodeGenerator } from '@/lib/ai/secure-code-generator';
import { EmotionEngine } from '@/lib/ai/emotion-engine';

// ============================================================================
// Types
// ============================================================================

interface CodeGenerateRequest {
  prompt: string;
  language: string;
  template?: string;
  userId?: string;
  includeTests?: boolean;
  includeDocs?: boolean;
  optimizationLevel?: 'basic' | 'standard' | 'aggressive';
  style?: {
    indent?: 'tabs' | 'spaces';
    indentSize?: number;
    quotes?: 'single' | 'double';
    semicolons?: boolean;
    trailingComma?: boolean;
    lineLength?: number;
    naming?: 'camelCase' | 'snake_case' | 'PascalCase';
  };
  targetEnvironment?: 'production' | 'development' | 'test';
  context?: string;
}

// ============================================================================
// Initialize Services
// ============================================================================

const codeGenerator = new SecureCodeGenerator(
  process.env.ANTHROPIC_API_KEY || '',
  'claude-3-5-sonnet-20241022',
  true // strict mode
);

const emotionEngine = new EmotionEngine();

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: CodeGenerateRequest = await request.json();
    const { 
      prompt, 
      language, 
      template, 
      userId, 
      includeTests, 
      includeDocs,
      optimizationLevel,
      style,
      targetEnvironment,
      context
    } = body;

    // Validate required fields
    if (!prompt || !language) {
      return NextResponse.json(
        { error: 'Prompt and language are required' },
        { status: 400 }
      );
    }

    // Validate language
    const validLanguages = ['javascript', 'typescript', 'python', 'nodejs', 'react', 'html', 'css', 'sql', 'php'];
    if (!validLanguages.includes(language.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` },
        { status: 400 }
      );
    }

    // Detect emotion from prompt (for adaptation)
    const emotion = emotionEngine.analyzeEmotion(prompt);

    // Generate code with full security validation
    const result = await codeGenerator.generateCode({
      prompt,
      language: language.toLowerCase() as any,
      template: template as any,
      userId,
      includeTests,
      includeDocs,
      optimizationLevel,
      style,
      targetEnvironment,
      context
    });

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Handle blocked requests
    if (result.blocked) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          reason: result.blockReason,
          ethicsCheck: result.ethicsCheck,
          message: 'Code generation request was blocked for security/ethical reasons'
        },
        { status: 403 }
      );
    }

    // Handle failed security scan
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          securityScan: result.securityScan,
          message: 'Generated code failed security validation'
        },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        code: result.code,
        securityScan: result.securityScan,
        emotion: {
          detected: emotion.primary.type,
          intensity: emotion.primary.intensity
        },
        metadata: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Code generation API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get available languages and templates
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      {
        languages: [
          { id: 'javascript', name: 'JavaScript', extension: '.js' },
          { id: 'typescript', name: 'TypeScript', extension: '.ts' },
          { id: 'python', name: 'Python', extension: '.py' },
          { id: 'nodejs', name: 'Node.js', extension: '.js' },
          { id: 'react', name: 'React', extension: '.tsx' },
          { id: 'html', name: 'HTML', extension: '.html' },
          { id: 'css', name: 'CSS', extension: '.css' },
          { id: 'sql', name: 'SQL', extension: '.sql' },
          { id: 'php', name: 'PHP', extension: '.php' }
        ],
        templates: [
          { id: 'react-component', name: 'React Component', languages: ['react', 'typescript'] },
          { id: 'react-hook', name: 'React Hook', languages: ['react', 'typescript'] },
          { id: 'api-route', name: 'API Route', languages: ['typescript', 'nodejs'] },
          { id: 'database-schema', name: 'Database Schema', languages: ['sql'] },
          { id: 'express-server', name: 'Express Server', languages: ['nodejs', 'javascript'] },
          { id: 'typescript-class', name: 'TypeScript Class', languages: ['typescript'] },
          { id: 'python-class', name: 'Python Class', languages: ['python'] },
          { id: 'sql-migration', name: 'SQL Migration', languages: ['sql'] },
          { id: 'html-page', name: 'HTML Page', languages: ['html'] },
          { id: 'css-module', name: 'CSS Module', languages: ['css'] }
        ],
        optimizationLevels: ['basic', 'standard', 'aggressive']
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Code generation info API error:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve code generation options' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Export config
// ============================================================================

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb'
    }
  }
};
