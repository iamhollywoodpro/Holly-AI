/**
 * HOLLY AI — Structured Logger
 * 
 * Provides consistent, contextual logging throughout the application.
 * All logs include:
 * - context: Which module/feature generated the log
 * - message: Human-readable description
 * - meta: Additional structured data (error objects, user IDs, etc.)
 * - timestamp: When the log occurred
 * - level: Log severity
 */

export interface LogContext {
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  context: string;
  message: string;
  timestamp: Date;
  meta?: LogContext;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private log(level: LogEntry['level'], context: string, message: string, meta?: LogContext): void {
    const entry: LogEntry = {
      level,
      context,
      message,
      timestamp: new Date(),
      meta
    };

    // Add to in-memory buffer
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with formatting
    const timestamp = entry.timestamp.toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

    switch (level) {
      case 'error':
        console.error(`[${timestamp}] [ERROR] [${context}] ${message}${metaStr}`);
        break;
      case 'warn':
        console.warn(`[${timestamp}] [WARN] [${context}] ${message}${metaStr}`);
        break;
      case 'info':
        console.log(`[${timestamp}] [INFO] [${context}] ${message}${metaStr}`);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[${timestamp}] [DEBUG] [${context}] ${message}${metaStr}`);
        }
        break;
    }

    // Save errors and warnings to PostgreSQL audit logs asynchronously
    if (level === 'error' || level === 'warn') {
      this.persistToDatabase(entry);
    }
  }

  /**
   * Save critical log entry to PostgreSQL audit logs.
   * Insulated with robust try-catch boundaries to prevent recursive logging loops on database errors.
   */
  private async persistToDatabase(entry: LogEntry): Promise<void> {
    try {
      // Dynamic import to prevent circular dependency/order-of-load issues
      const { prisma } = await import('@/lib/db');
      await prisma.auditLog.create({
        data: {
          action: `SYSTEM_${entry.level.toUpperCase()}`,
          ipAddress: '127.0.0.1',
          details: {
            context: entry.context,
            message: entry.message,
            timestamp: entry.timestamp.toISOString(),
            meta: entry.meta || {},
          },
        },
      });
    } catch (dbErr) {
      // Insulated boundary: write ONLY to raw console to prevent infinite logging recursion
      console.error(
        `[StructuredLogger:Persistence] Failed to write ${entry.level} to PostgreSQL audit logs:`,
        dbErr
      );
    }
  }

  /**
   * Log an error with full context
   */
  error(context: string, error: Error | string, meta?: LogContext): void {
    const message = error instanceof Error ? error.message : error;
    const errorMeta: LogContext = {
      ...meta,
      ...(error instanceof Error ? {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      } : {})
    };
    this.log('error', context, message, errorMeta);
  }

  /**
   * Log a warning
   */
  warn(context: string, message: string, meta?: LogContext): void {
    this.log('warn', context, message, meta);
  }

  /**
   * Log informational message
   */
  info(context: string, message: string, meta?: LogContext): void {
    this.log('info', context, message, meta);
  }

  /**
   * Log debug message (only in non-production)
   */
  debug(context: string, message: string, meta?: LogContext): void {
    this.log('debug', context, message, meta);
  }

  /**
   * Get recent logs (for debugging/monitoring)
   */
  getRecentLogs(limit?: number): LogEntry[] {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return [...this.logs];
  }

  /**
   * Get logs by context
   */
  getLogsByContext(context: string, limit?: number): LogEntry[] {
    let filtered = this.logs.filter(log => log.context === context);
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Get error logs only
   */
  getErrorLogs(limit?: number): LogEntry[] {
    let filtered = this.logs.filter(log => log.level === 'error');
    if (limit) {
      filtered = filtered.slice(-limit);
    }
    return filtered;
  }

  /**
   * Clear log buffer
   */
  clear(): void {
    this.logs = [];
  }
}

// Singleton instance
export const logger = new Logger();

/**
 * Create a context-specific logger
 * Usage: const log = createLogger('MyModule');
 *        log.info('Something happened');
 */
export function createLogger(context: string) {
  return {
    error: (error: Error | string, meta?: LogContext) => logger.error(context, error, meta),
    warn: (message: string, meta?: LogContext) => logger.warn(context, message, meta),
    info: (message: string, meta?: LogContext) => logger.info(context, message, meta),
    debug: (message: string, meta?: LogContext) => logger.debug(context, message, meta)
  };
}