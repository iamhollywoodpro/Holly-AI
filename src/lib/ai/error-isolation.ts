/**
 * HOLLY ERROR ISOLATION SYSTEM
 * 
 * CRITICAL PRINCIPLE: Tool failures should NEVER break HOLLY's ability to respond.
 * If a tool fails, HOLLY should explain what went wrong and offer alternatives.
 */

export interface SafeToolResult {
  success: boolean;
  data?: any;
  error?: string;
  errorDetails?: any;
  toolName: string;
  executionTime: number;
}

/**
 * Execute a tool with complete error isolation
 * GUARANTEES: Always returns a result, never throws
 */
export async function safeExecuteTool(
  toolName: string,
  toolExecutor: () => Promise<any>,
  timeout: number = 60000
): Promise<SafeToolResult> {
  const startTime = Date.now();
  
  try {
    // Race between tool execution and timeout
    const result = await Promise.race([
      toolExecutor(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
      )
    ]);

    return {
      success: true,
      data: result,
      toolName,
      executionTime: Date.now() - startTime,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Log error for debugging (but don't crash)
    console.error(`[ERROR ISOLATION] Tool '${toolName}' failed after ${executionTime}ms:`, error);

    // Return safe error result
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: {
        type: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      toolName,
      executionTime,
    };
  }
}

/**
 * Convert tool error to user-friendly message for HOLLY to explain
 */
export function explainToolFailure(result: SafeToolResult): string {
  if (result.success) return '';

  const explanations: Record<string, string> = {
    generate_image: `Image generation encountered an issue: ${result.error}. This could be due to API rate limits or service availability. Would you like me to try a different approach?`,
    generate_music: `Music generation failed: ${result.error}. The audio service might be temporarily unavailable. Should I try again or help you with something else?`,
    generate_video: `Video generation couldn't complete: ${result.error}. Video generation is resource-intensive and might need a moment. Want to try again?`,
    github_commit: `GitHub operation failed: ${result.error}. Please check your GitHub connection and repository permissions.`,
    deploy_to_vercel: `Deployment encountered an issue: ${result.error}. Let's verify your Vercel configuration.`,
  };

  return explanations[result.toolName] || 
    `The ${result.toolName} tool encountered an error: ${result.error}. Let me help you troubleshoot this.`;
}

/**
 * System health check - runs before critical operations
 */
export async function checkSystemHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  timestamp: string;
}> {
  const issues: string[] = [];
  const timestamp = new Date().toISOString();

  // Check environment variables
  if (!process.env.HUGGINGFACE_API_KEY) {
    issues.push('HUGGINGFACE_API_KEY missing - image generation will fail');
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    issues.push('BLOB_READ_WRITE_TOKEN missing - media storage will fail');
  }

  if (!process.env.DATABASE_URL) {
    issues.push('DATABASE_URL missing - database operations will fail');
  }

  // Check critical services (with timeout)
  try {
    const dbCheck = await Promise.race([
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/health`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
  } catch (error) {
    issues.push('Health endpoint not responding');
  }

  return {
    healthy: issues.length === 0,
    issues,
    timestamp,
  };
}

/**
 * Graceful degradation wrapper for any async operation
 */
export async function withGracefulDegradation<T>(
  operation: () => Promise<T>,
  fallback: T,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.warn(`[GRACEFUL DEGRADATION] ${operationName} failed, using fallback:`, error);
    return fallback;
  }
}
