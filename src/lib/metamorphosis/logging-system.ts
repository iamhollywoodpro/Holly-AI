/**
 * HOLLY'S METAMORPHOSIS - PHASE 1: LOGGING SYSTEM
 * 
 * This is HOLLY's structured logging foundation - how she observes and records
 * her own operational state, performance, and interactions.
 * 
 * Purpose: Enable HOLLY to monitor herself in real-time and build self-awareness
 * through comprehensive, structured logging of all system activities.
 */

import { prisma } from '@/lib/db';

// ============================================================================
// LOG LEVELS & CATEGORIES
// ============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type LogCategory = 
  | 'api_call'           // HTTP requests/responses
  | 'database_query'     // Prisma operations
  | 'ai_inference'       // GPT/AI model calls
  | 'file_operation'     // Uploads, downloads, processing
  | 'authentication'     // User login, session management
  | 'performance'        // Timing, resource usage
  | 'error'              // Errors, exceptions
  | 'user_interaction'   // User actions, feedback
  | 'self_improvement'   // Metamorphosis activities
  | 'system';            // General system events

// ============================================================================
// LOG ENTRY STRUCTURE
// ============================================================================

export interface HollyLog {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: {
    userId?: string;
    conversationId?: string;
    sessionId?: string;
    traceId?: string;
    endpoint?: string;
    operation?: string;
    duration?: number; // milliseconds
    [key: string]: any; // Flexible for additional context
  };
  metadata?: {
    stackTrace?: string;
    errorCode?: string;
    requestBody?: any;
    responseBody?: any;
    performanceMetrics?: {
      cpuUsage?: number;
      memoryUsage?: number;
      dbQueryTime?: number;
    };
  };
}

// ============================================================================
// IN-MEMORY LOG BUFFER (FOR RECENT LOGS)
// ============================================================================

class LogBuffer {
  private logs: HollyLog[] = [];
  private maxSize = 1000; // Keep last 1000 logs in memory

  add(log: HollyLog): void {
    this.logs.push(log);
    if (this.logs.length > this.maxSize) {
      this.logs.shift(); // Remove oldest log
    }
  }

  getLogs(filters?: {
    level?: LogLevel;
    category?: LogCategory;
    since?: Date;
    limit?: number;
  }): HollyLog[] {
    let filtered = [...this.logs];

    if (filters?.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    if (filters?.category) {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    if (filters?.since) {
      filtered = filtered.filter(log => log.timestamp >= filters.since!);
    }

    if (filters?.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered;
  }

  getRecentErrors(limit: number = 10): HollyLog[] {
    return this.logs
      .filter(log => log.level === 'ERROR' || log.level === 'CRITICAL')
      .slice(-limit);
  }

  clear(): void {
    this.logs = [];
  }
}

// Singleton log buffer
const logBuffer = new LogBuffer();

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Main logging function - routes to appropriate handlers
 */
export async function log(
  level: LogLevel,
  category: LogCategory,
  message: string,
  context?: Partial<HollyLog['context']>,
  metadata?: HollyLog['metadata']
): Promise<void> {
  const logEntry: HollyLog = {
    timestamp: new Date(),
    level,
    category,
    message,
    context: {
      traceId: generateTraceId(),
      ...context,
    },
    metadata,
  };

  // Add to in-memory buffer
  logBuffer.add(logEntry);

  // Console output (for development)
  logToConsole(logEntry);

  // For critical errors, could add alert system here
  if (level === 'CRITICAL') {
    await handleCriticalError(logEntry);
  }

  // Optionally persist important logs to database
  if (shouldPersistLog(logEntry)) {
    await persistLog(logEntry);
  }
}

// ============================================================================
// CONVENIENCE LOGGING FUNCTIONS
// ============================================================================

export const logger = {
  debug: (category: LogCategory, message: string, context?: any) =>
    log('DEBUG', category, message, context),

  info: (category: LogCategory, message: string, context?: any) =>
    log('INFO', category, message, context),

  warn: (category: LogCategory, message: string, context?: any) =>
    log('WARN', category, message, context),

  error: (category: LogCategory, message: string, context?: any, metadata?: any) =>
    log('ERROR', category, message, context, metadata),

  critical: (category: LogCategory, message: string, context?: any, metadata?: any) =>
    log('CRITICAL', category, message, context, metadata),

  // Domain-specific loggers
  api: {
    start: (endpoint: string, context?: any) =>
      log('INFO', 'api_call', `API call started: ${endpoint}`, context),

    success: (endpoint: string, duration: number, context?: any) =>
      log('INFO', 'api_call', `API call completed: ${endpoint}`, { ...context, duration }),

    error: (endpoint: string, error: any, context?: any) =>
      log('ERROR', 'api_call', `API call failed: ${endpoint}`, context, {
        errorCode: error.code,
        stackTrace: error.stack,
      }),
  },

  db: {
    query: (operation: string, duration: number, context?: any) =>
      log('DEBUG', 'database_query', `DB query: ${operation}`, { ...context, duration }),

    slow: (operation: string, duration: number, context?: any) =>
      log('WARN', 'database_query', `Slow DB query: ${operation} (${duration}ms)`, { ...context, duration }),

    error: (operation: string, error: any, context?: any) =>
      log('ERROR', 'database_query', `DB error: ${operation}`, context, {
        errorCode: error.code,
        stackTrace: error.stack,
      }),
  },

  ai: {
    start: (model: string, prompt: string, context?: any) =>
      log('INFO', 'ai_inference', `AI inference started: ${model}`, { ...context, operation: 'inference' }),

    success: (model: string, duration: number, tokens?: number, context?: any) =>
      log('INFO', 'ai_inference', `AI inference completed: ${model}`, { 
        ...context, 
        duration,
        metadata: { tokens },
      }),

    error: (model: string, error: any, context?: any) =>
      log('ERROR', 'ai_inference', `AI inference failed: ${model}`, context, {
        errorCode: error.code,
        stackTrace: error.stack,
      }),
  },

  performance: {
    metric: (metricName: string, value: number, unit: string, context?: any) =>
      log('INFO', 'performance', `Performance metric: ${metricName} = ${value}${unit}`, context),

    slow: (operation: string, duration: number, threshold: number, context?: any) =>
      log('WARN', 'performance', `Slow operation: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, context),
  },

  user: {
    action: (action: string, context?: any) =>
      log('INFO', 'user_interaction', `User action: ${action}`, context),

    feedback: (feedbackType: string, sentiment: string, context?: any) =>
      log('INFO', 'user_interaction', `User feedback: ${feedbackType} (${sentiment})`, context),
  },

  metamorphosis: {
    event: (event: string, context?: any) =>
      log('INFO', 'self_improvement', `Metamorphosis event: ${event}`, context),

    insight: (insight: string, context?: any) =>
      log('INFO', 'self_improvement', `HOLLY insight: ${insight}`, context),
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique trace ID for request tracking
 */
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log to console (development only)
 */
function logToConsole(log: HollyLog): void {
  const emoji = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    CRITICAL: '🚨',
  }[log.level];

  const color = {
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m',  // Green
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
    CRITICAL: '\x1b[35m', // Magenta
  }[log.level];

  const reset = '\x1b[0m';

  console.log(
    `${emoji} ${color}[${log.level}]${reset} [${log.category}] ${log.message}`,
    log.context
  );

  if (log.metadata?.stackTrace) {
    console.error(log.metadata.stackTrace);
  }
}

/**
 * Determine if log should be persisted to database
 */
function shouldPersistLog(log: HollyLog): boolean {
  // Always persist errors and critical logs
  if (log.level === 'ERROR' || log.level === 'CRITICAL') {
    return true;
  }

  // Persist important system events
  if (log.category === 'self_improvement' || log.category === 'system') {
    return true;
  }

  // Persist slow performance issues
  if (log.category === 'performance' && log.level === 'WARN') {
    return true;
  }

  // Don't persist debug logs
  return false;
}

/**
 * Persist log to database (for important logs)
 */
async function persistLog(log: HollyLog): Promise<void> {
  try {
    // Note: This would require a new database model
    // For now, we'll store in a simple format
    // TODO: Create SystemLog model in Prisma schema
    
    // Placeholder - implement after adding database model
    console.log('📝 [Persist Log] Would persist to database:', log.message);
  } catch (error) {
    console.error('Failed to persist log:', error);
  }
}

/**
 * Handle critical errors (could send alerts, trigger rollbacks, etc.)
 */
async function handleCriticalError(log: HollyLog): Promise<void> {
  console.error('🚨 CRITICAL ERROR DETECTED:', log);
  
  // Future: Send alerts, trigger automated responses
  // For now, just ensure it's logged prominently
}

// ============================================================================
// LOG RETRIEVAL & ANALYSIS
// ============================================================================

/**
 * Get recent logs from buffer
 */
export function getRecentLogs(filters?: {
  level?: LogLevel;
  category?: LogCategory;
  since?: Date;
  limit?: number;
}): HollyLog[] {
  return logBuffer.getLogs(filters);
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit: number = 10): HollyLog[] {
  return logBuffer.getRecentErrors(limit);
}

/**
 * Get log statistics
 */
export function getLogStats(since?: Date): {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  errorRate: number;
} {
  const logs = logBuffer.getLogs({ since });

  const byLevel: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 0,
    WARN: 0,
    ERROR: 0,
    CRITICAL: 0,
  };

  const byCategory: any = {};

  logs.forEach(log => {
    byLevel[log.level]++;
    byCategory[log.category] = (byCategory[log.category] || 0) + 1;
  });

  const errorRate = logs.length > 0
    ? ((byLevel.ERROR + byLevel.CRITICAL) / logs.length) * 100
    : 0;

  return {
    total: logs.length,
    byLevel,
    byCategory,
    errorRate,
  };
}

/**
 * Clear log buffer (use with caution)
 */
export function clearLogs(): void {
  logBuffer.clear();
  console.log('🧹 Log buffer cleared');
}

// ============================================================================
// PERFORMANCE TRACKING UTILITIES
// ============================================================================

/**
 * Create a performance tracker for timing operations
 */
export function createPerformanceTracker(
  operation: string,
  category: LogCategory,
  context?: any
) {
  const startTime = performance.now();

  return {
    end: async (additionalContext?: any) => {
      const duration = performance.now() - startTime;
      await logger.performance.metric(operation, duration, 'ms', {
        ...context,
        ...additionalContext,
      });
      return duration;
    },
  };
}

/**
 * Wrap async function with automatic logging
 */
export function withLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  category: LogCategory,
  operationName: string
): T {
  return (async (...args: any[]) => {
    const tracker = createPerformanceTracker(operationName, category);
    try {
      const result = await fn(...args);
      await tracker.end({ status: 'success' });
      return result;
    } catch (error) {
      await tracker.end({ status: 'error' });
      await logger.error(category, `${operationName} failed`, {}, {
        errorCode: (error as any).code,
        stackTrace: (error as any).stack,
      });
      throw error;
    }
  }) as T;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default logger;
