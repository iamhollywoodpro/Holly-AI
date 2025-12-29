/**
 * SANDBOX EXECUTION ENGINE
 * 
 * Safely executes code in an isolated environment with security controls
 * Supports JavaScript, TypeScript, and HTML/CSS preview
 */

import { runInNewContext } from 'vm';

export interface ExecutionOptions {
  code: string;
  language: 'javascript' | 'typescript' | 'html' | 'react';
  timeout?: number; // milliseconds
  memoryLimit?: number; // MB
  allowNetwork?: boolean;
  allowFileSystem?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  console_logs?: string[];
  execution_time_ms?: number;
  memory_used_mb?: number;
  preview_html?: string;
}

export class SandboxExecutor {
  private static readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private static readonly DEFAULT_MEMORY_LIMIT = 128; // 128 MB
  private static readonly MAX_OUTPUT_LENGTH = 10000; // characters

  /**
   * Execute code safely in a sandbox
   */
  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const startTime = Date.now();
    const consoleLogs: string[] = [];

    try {
      // Validate code first
      const validation = this.validateCode(options.code, options.language);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          console_logs: [],
          execution_time_ms: Date.now() - startTime
        };
      }

      // Execute based on language
      switch (options.language) {
        case 'javascript':
          return await this.executeJavaScript(options, consoleLogs, startTime);
        
        case 'typescript':
          return await this.executeTypeScript(options, consoleLogs, startTime);
        
        case 'html':
        case 'react':
          return await this.executeHTML(options, startTime);
        
        default:
          return {
            success: false,
            error: `Unsupported language: ${options.language}`,
            console_logs: [],
            execution_time_ms: Date.now() - startTime
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        console_logs: consoleLogs,
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Execute JavaScript code
   */
  private async executeJavaScript(
    options: ExecutionOptions,
    consoleLogs: string[],
    startTime: number
  ): Promise<ExecutionResult> {
    try {
      // Create sandbox context
      const sandbox = {
        console: {
          log: (...args: any[]) => {
            consoleLogs.push(args.map(a => String(a)).join(' '));
          },
          error: (...args: any[]) => {
            consoleLogs.push('[ERROR] ' + args.map(a => String(a)).join(' '));
          },
          warn: (...args: any[]) => {
            consoleLogs.push('[WARN] ' + args.map(a => String(a)).join(' '));
          }
        },
        setTimeout: undefined,
        setInterval: undefined,
        setImmediate: undefined,
        process: undefined,
        require: undefined,
        module: undefined,
        exports: undefined,
        __dirname: undefined,
        __filename: undefined
      };

      // Execute code with timeout
      const timeout = options.timeout || SandboxExecutor.DEFAULT_TIMEOUT;
      const result = await Promise.race([
        Promise.resolve(runInNewContext(options.code, sandbox, { timeout })),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution timeout')), timeout)
        )
      ]);

      return {
        success: true,
        output: result !== undefined ? String(result) : undefined,
        console_logs: consoleLogs,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        console_logs: consoleLogs,
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Execute TypeScript code (compile to JS first)
   */
  private async executeTypeScript(
    options: ExecutionOptions,
    consoleLogs: string[],
    startTime: number
  ): Promise<ExecutionResult> {
    try {
      // For now, treat as JavaScript (full TS compilation requires more setup)
      // In production, you'd use ts-node or compile with TypeScript compiler
      return await this.executeJavaScript(
        { ...options, language: 'javascript' },
        consoleLogs,
        startTime
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TypeScript execution failed',
        console_logs: consoleLogs,
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Execute HTML/React code (generate preview)
   */
  private async executeHTML(
    options: ExecutionOptions,
    startTime: number
  ): Promise<ExecutionResult> {
    try {
      // Sanitize HTML
      const sanitizedHTML = this.sanitizeHTML(options.code);

      // Wrap in iframe-safe HTML
      const previewHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
${sanitizedHTML}
</body>
</html>`;

      return {
        success: true,
        preview_html: previewHTML,
        console_logs: [],
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTML execution failed',
        console_logs: [],
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Validate code before execution
   */
  private validateCode(code: string, language: string): { valid: boolean; error?: string } {
    // Check code length
    if (code.length === 0) {
      return { valid: false, error: 'Code is empty' };
    }

    if (code.length > 100000) {
      return { valid: false, error: 'Code is too long (max 100KB)' };
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /require\s*\(\s*['"]fs['"]\s*\)/,
      /require\s*\(\s*['"]net['"]\s*\)/,
      /process\.exit/,
      /process\.kill/,
      /eval\s*\(/,
      /Function\s*\(/,
      /__dirname/,
      /__filename/,
      /import\s+.*\s+from\s+['"]fs['"]/,
      /import\s+.*\s+from\s+['"]child_process['"]/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return {
          valid: false,
          error: `Dangerous pattern detected: ${pattern.source.substring(0, 50)}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * Sanitize HTML to prevent XSS
   */
  private sanitizeHTML(html: string): string {
    // Remove dangerous tags and attributes
    let sanitized = html;

    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove javascript: URLs
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');

    // Remove data: URLs (can be used for XSS)
    sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, '');

    return sanitized;
  }

  /**
   * Stop execution (for long-running code)
   */
  async stop(executionId: string): Promise<boolean> {
    // In a real implementation, you'd track running executions
    // and forcefully terminate them here
    console.log('[SandboxExecutor] Stop requested for:', executionId);
    return true;
  }

  /**
   * Get execution limits
   */
  static getLimits() {
    return {
      timeout_ms: SandboxExecutor.DEFAULT_TIMEOUT,
      memory_limit_mb: SandboxExecutor.DEFAULT_MEMORY_LIMIT,
      max_output_length: SandboxExecutor.MAX_OUTPUT_LENGTH
    };
  }
}

// Singleton instance
export const sandboxExecutor = new SandboxExecutor();
