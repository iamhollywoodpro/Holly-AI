/**
 * Orchestrator Integration for Code Generation
 * 
 * Demonstrates how to integrate the code generation engine
 * with HOLLY's orchestrator system
 */

import { CodeGenerationEngine, CodeGenerationRequest } from './code-generator';
import { EmotionEngine, EmotionAnalysis } from './emotion-engine';

// ============================================================================
// Enhanced Orchestrator with Code Generation
// ============================================================================

export interface CodeGenerationContext {
  emotionalState?: EmotionAnalysis;
  conversationHistory?: string[];
  projectContext?: {
    framework?: string;
    techStack?: string[];
    styleGuide?: any;
  };
}

export class EnhancedOrchestrator {
  private codeEngine: CodeGenerationEngine;
  private emotionEngine: EmotionEngine;

  constructor(apiKey: string) {
    this.codeEngine = new CodeGenerationEngine(apiKey);
    this.emotionEngine = new EmotionEngine();
  }

  /**
   * Process code generation request with emotional context
   */
  async processCodeRequest(
    userMessage: string,
    context: CodeGenerationContext = {}
  ): Promise<{
    code: any;
    response: string;
    emotion?: EmotionAnalysis;
  }> {
    // 1. Analyze user's emotional state
    const emotion = this.emotionEngine.analyzeEmotion(userMessage);
    
    // 2. Parse code request from message
    const codeRequest = this.parseCodeRequest(userMessage, context);
    
    // 3. Adapt request based on emotion
    const adaptedRequest = this.adaptRequestToEmotion(codeRequest, emotion);
    
    // 4. Generate code
    const generatedCode = await this.codeEngine.generateCode(adaptedRequest);
    
    // 5. Create response based on emotion
    const response = this.createEmotionalResponse(generatedCode, emotion);
    
    return {
      code: generatedCode,
      response,
      emotion
    };
  }

  /**
   * Parse code generation request from natural language
   */
  private parseCodeRequest(
    message: string,
    context: CodeGenerationContext
  ): CodeGenerationRequest {
    const request: CodeGenerationRequest = {
      prompt: message,
      language: this.detectLanguage(message, context),
      includeTests: false,
      includeDocs: false,
      optimizationLevel: 'standard'
    };

    // Check for test request
    if (message.toLowerCase().includes('test') || message.toLowerCase().includes('testing')) {
      request.includeTests = true;
    }

    // Check for documentation request
    if (message.toLowerCase().includes('document') || message.toLowerCase().includes('docs')) {
      request.includeDocs = true;
    }

    // Check for optimization level
    if (message.toLowerCase().includes('optimize') || message.toLowerCase().includes('performance')) {
      request.optimizationLevel = 'aggressive';
    }

    // Add project context
    if (context.projectContext) {
      request.context = JSON.stringify(context.projectContext);
    }

    return request;
  }

  /**
   * Detect programming language from message and context
   */
  private detectLanguage(
    message: string,
    context: CodeGenerationContext
  ): any {
    const lower = message.toLowerCase();

    // Explicit language mentions
    if (lower.includes('typescript') || lower.includes('ts')) return 'typescript';
    if (lower.includes('javascript') || lower.includes('js')) return 'javascript';
    if (lower.includes('python') || lower.includes('py')) return 'python';
    if (lower.includes('react')) return 'react';
    if (lower.includes('sql')) return 'sql';
    if (lower.includes('html')) return 'html';
    if (lower.includes('css')) return 'css';
    if (lower.includes('php')) return 'php';

    // Context-based detection
    if (context.projectContext?.framework === 'react') return 'react';
    if (context.projectContext?.framework === 'next') return 'typescript';
    if (context.projectContext?.techStack?.includes('python')) return 'python';

    // Component patterns
    if (lower.includes('component')) return 'react';
    if (lower.includes('api route') || lower.includes('endpoint')) return 'typescript';
    if (lower.includes('database') || lower.includes('table')) return 'sql';

    // Default to TypeScript for web projects
    return 'typescript';
  }

  /**
   * Adapt code generation request based on user's emotional state
   */
  private adaptRequestToEmotion(
    request: CodeGenerationRequest,
    emotion: EmotionAnalysis
  ): CodeGenerationRequest {
    const adapted = { ...request };

    switch (emotion.primary.type) {
      case 'frustrated':
        // User is frustrated - provide simpler, clearer code with more comments
        adapted.prompt = `${request.prompt}\n\nIMPORTANT: Make this code extremely clear and well-commented. The user needs straightforward, easy-to-understand code.`;
        adapted.includeDocs = true;
        break;

      case 'confused':
        // User is confused - add extra documentation and examples
        adapted.prompt = `${request.prompt}\n\nIMPORTANT: Include detailed comments explaining each step. Add usage examples.`;
        adapted.includeDocs = true;
        break;

      case 'excited':
        // User is excited - match their energy with modern patterns
        adapted.prompt = `${request.prompt}\n\nUse modern best practices and cutting-edge patterns.`;
        adapted.optimizationLevel = 'aggressive';
        break;

      case 'anxious':
        // User is anxious - provide safe, tested code
        adapted.prompt = `${request.prompt}\n\nIMPORTANT: Include comprehensive error handling and input validation. Make this code rock-solid.`;
        adapted.includeTests = true;
        break;

      case 'curious':
        // User is learning - add educational comments
        adapted.prompt = `${request.prompt}\n\nInclude educational comments explaining why certain approaches are used.`;
        adapted.includeDocs = true;
        break;

      case 'impatient':
        // User wants quick results - focus on working code, skip extras
        adapted.includeDocs = false;
        adapted.includeTests = false;
        break;

      default:
        // Neutral or positive - proceed normally
        break;
    }

    return adapted;
  }

  /**
   * Create emotionally-aware response to code generation
   */
  private createEmotionalResponse(
    code: any,
    emotion: EmotionAnalysis
  ): string {
    const baseResponse = `I've generated the ${code.language} code you requested.`;
    
    let emotionalAddition = '';

    switch (emotion.primary.type) {
      case 'frustrated':
        emotionalAddition = " I've made sure to keep it simple and added clear comments to help you out. Let me know if anything needs clarification.";
        break;

      case 'confused':
        emotionalAddition = " I've included detailed documentation to help you understand how everything works. Feel free to ask if you need me to explain any part!";
        break;

      case 'excited':
        emotionalAddition = " Used some modern patterns that I think you'll love! The code is optimized and follows best practices. 🚀";
        break;

      case 'anxious':
        emotionalAddition = " I've added comprehensive error handling and validation to make this bulletproof. You can deploy this with confidence.";
        break;

      case 'curious':
        emotionalAddition = " I've added educational comments throughout to explain the reasoning behind the implementation. Great question!";
        break;

      case 'impatient':
        emotionalAddition = " Got you covered with working code, no fluff. Ready to use.";
        break;

      case 'happy':
        emotionalAddition = " Glad to help! The code follows best practices and should work perfectly for your needs. 😊";
        break;

      default:
        emotionalAddition = " The code includes proper error handling and follows best practices.";
        break;
    }

    // Add warnings if any
    if (code.warnings && code.warnings.length > 0) {
      emotionalAddition += `\n\n⚠️ Note: ${code.warnings.join('; ')}`;
    }

    // Add suggestions if any
    if (code.suggestions && code.suggestions.length > 0) {
      emotionalAddition += `\n\n💡 Suggestions: ${code.suggestions.join('; ')}`;
    }

    return baseResponse + emotionalAddition;
  }

  /**
   * Review code with emotional awareness
   */
  async reviewCodeWithEmotion(
    code: string,
    language: any,
    userMessage: string
  ): Promise<{
    review: any;
    response: string;
    emotion?: EmotionAnalysis;
  }> {
    // Analyze emotion
    const emotion = this.emotionEngine.analyzeEmotion(userMessage);
    
    // Perform review
    const review = await this.codeEngine.reviewCode(code, language);
    
    // Create emotional response
    let response = '';
    
    if (review.score >= 80) {
      response = emotion.primary.type === 'anxious'
        ? `Great news! Your code scores ${review.score}/100. It's solid and you can feel confident about it. ✅`
        : `Nice work! Your code scores ${review.score}/100. Looking good! 👍`;
    } else if (review.score >= 60) {
      response = emotion.primary.type === 'frustrated'
        ? `Your code scores ${review.score}/100. Don't worry, I've found some straightforward improvements that will help. Let's tackle them together.`
        : `Your code scores ${review.score}/100. There are a few areas we can improve - I'll help you through it.`;
    } else {
      response = emotion.primary.type === 'anxious'
        ? `Your code scores ${review.score}/100, but don't stress! I've identified the issues and have clear fixes for each one. We'll get this sorted out.`
        : `Your code scores ${review.score}/100. Let's work through the issues together - I've got specific suggestions for each one.`;
    }

    // Add key issues
    if (review.issues.length > 0) {
      const criticalIssues = review.issues.filter(i => i.severity === 'error');
      if (criticalIssues.length > 0) {
        response += `\n\n🔴 Critical issues to fix: ${criticalIssues.length}`;
      }
    }

    return {
      review,
      response,
      emotion
    };
  }

  /**
   * Optimize code with emotional awareness
   */
  async optimizeCodeWithEmotion(
    code: string,
    language: any,
    userMessage: string
  ): Promise<{
    optimization: any;
    response: string;
    emotion?: EmotionAnalysis;
  }> {
    // Analyze emotion
    const emotion = this.emotionEngine.analyzeEmotion(userMessage);
    
    // Determine optimization level based on emotion
    let level: 'basic' | 'standard' | 'aggressive' = 'standard';
    
    if (emotion.primary.type === 'impatient') {
      level = 'basic'; // Quick wins only
    } else if (emotion.primary.type === 'excited' || userMessage.toLowerCase().includes('aggressive')) {
      level = 'aggressive'; // Full optimization
    }
    
    // Perform optimization
    const optimization = await this.codeEngine.optimizeCode(code, language, level);
    
    // Create emotional response
    let response = `I've optimized your code with a ${level} optimization approach.`;
    
    if (optimization.improvements.length > 0) {
      response += `\n\nImprovements made:\n${optimization.improvements.map(i => `• ${i}`).join('\n')}`;
    }
    
    if (optimization.performanceGain) {
      response += `\n\n⚡ Performance gain: ${optimization.performanceGain}`;
    }

    return {
      optimization,
      response,
      emotion
    };
  }
}

// ============================================================================
// Usage Examples
// ============================================================================

export async function exampleUsage() {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const orchestrator = new EnhancedOrchestrator(apiKey);

  // Example 1: Generate code with emotional context
  const result1 = await orchestrator.processCodeRequest(
    "I'm stuck and need a simple React component for a login form",
    {
      emotionalState: undefined, // Will be detected from message
      projectContext: {
        framework: 'react',
        techStack: ['typescript', 'next.js']
      }
    }
  );

  console.log('Generated code:', result1.code.filename);
  console.log('Response:', result1.response);
  console.log('Detected emotion:', result1.emotion?.primary.type);

  // Example 2: Review code with emotional awareness
  const sampleCode = `
function calculate(x, y) {
  return x + y;
}
  `;

  const result2 = await orchestrator.reviewCodeWithEmotion(
    sampleCode,
    'javascript',
    "I'm worried this code isn't good enough"
  );

  console.log('Review score:', result2.review.score);
  console.log('Response:', result2.response);

  // Example 3: Optimize code
  const result3 = await orchestrator.optimizeCodeWithEmotion(
    sampleCode,
    'javascript',
    "Make this as fast as possible!"
  );

  console.log('Optimized code:', result3.optimization.optimizedCode);
  console.log('Response:', result3.response);
}
