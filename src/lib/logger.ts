/**
 * HOLLY Structured Logger
 * Consistent logging with levels, context, and formatting
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  requestId?: string;
  userId?: string;
}

// Log level priority
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Minimum log level based on environment
const MIN_LOG_LEVEL: LogLevel = 
  process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Check if we should log this level
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

// Format log entry for output
function formatLog(entry: LogEntry): string {
  const { timestamp, level, message, context, data, error, duration, requestId, userId } = entry;
  
  const parts = [
    `[${timestamp}]`,
    `[${level.toUpperCase().padEnd(5)}]`,
    context ? `[${context}]` : null,
    message,
  ].filter(Boolean);

  let output = parts.join(' ');

  if (duration !== undefined) {
    output += ` (${duration}ms)`;
  }

  if (userId) {
    output += ` [user:${userId}]`;
  }

  if (requestId) {
    output += ` [req:${requestId}]`;
  }

  if (data && Object.keys(data).length > 0) {
    output += `\n  Data: ${JSON.stringify(data, null, 2)}`;
  }

  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (error.stack) {
      output += `\n  Stack:\n${error.stack.split('\n').map(l => '    ' + l).join('\n')}`;
    }
  }

  return output;
}

// Log to appropriate destination
function outputLog(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return;

  const formatted = formatLog(entry);

  switch (entry.level) {
    case 'debug':
    case 'info':
      console.log(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
    case 'fatal':
      console.error(formatted);
      break;
  }
}

// ============================================================================
// Logger Class
// ============================================================================

class Logger {
  private context: string;
  private defaultData?: Record<string, any>;
  private requestId?: string;
  private userId?: string;

  constructor(context: string = 'APP', defaultData?: Record<string, any>) {
    this.context = context;
    this.defaultData = defaultData;
  }

  /**
   * Set request ID for tracing
   */
  setRequestId(requestId: string): this {
    this.requestId = requestId;
    return this;
  }

  /**
   * Set user ID for context
   */
  setUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  /**
   * Create child logger with additional context
   */
  child(subContext: string, data?: Record<string, any>): Logger {
    return new Logger(
      `${this.context}:${subContext}`,
      { ...this.defaultData, ...data }
    );
  }

  /**
   * Debug logging - detailed information for debugging
   */
  debug(message: string, data?: Record<string, any>): void {
    outputLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context: this.context,
      data: { ...this.defaultData, ...data },
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Info logging - general information
   */
  info(message: string, data?: Record<string, any>): void {
    outputLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context: this.context,
      data: { ...this.defaultData, ...data },
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Warning logging - potential issues
   */
  warn(message: string, data?: Record<string, any>): void {
    outputLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context: this.context,
      data: { ...this.defaultData, ...data },
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Error logging - errors that should be investigated
   */
  error(message: string, error?: Error | unknown, data?: Record<string, any>): void {
    let errorInfo: LogEntry['error'] | undefined;

    if (error instanceof Error) {
      errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorInfo = {
        name: 'UnknownError',
        message: String(error),
      };
    }

    outputLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: this.context,
      data: { ...this.defaultData, ...data },
      error: errorInfo,
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Fatal logging - critical errors that may crash the app
   */
  fatal(message: string, error?: Error | unknown, data?: Record<string, any>): void {
    let errorInfo: LogEntry['error'] | undefined;

    if (error instanceof Error) {
      errorInfo = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorInfo = {
        name: 'UnknownError',
        message: String(error),
      };
    }

    outputLog({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message,
      context: this.context,
      data: { ...this.defaultData, ...data },
      error: errorInfo,
      requestId: this.requestId,
      userId: this.userId,
    });
  }

  /**
   * Time a function and log its duration
   */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`${label} completed`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`${label} failed`, error, { duration });
      throw error;
    }
  }

  /**
   * Log API request
   */
  apiRequest(method: string, path: string, data?: Record<string, any>): void {
    this.info(`→ ${method} ${path}`, data);
  }

  /**
   * Log API response
   */
  apiResponse(method: string, path: string, status: number, duration: number): void {
    const level = status >= 400 ? 'warn' : 'info';
    outputLog({
      timestamp: new Date().toISOString(),
      level,
      message: `← ${method} ${path} ${status}`,
      context: this.context,
      duration,
      requestId: this.requestId,
      userId: this.userId,
    });
  }
}

// ============================================================================
// Pre-configured Loggers
// ============================================================================

export const hollyLogger = {
  /** General application logging */
  app: new Logger('APP'),
  
  /** API route logging */
  api: new Logger('API'),
  
  /** AI/LLM operations logging */
  ai: new Logger('AI'),
  
  /** Database operations logging */
  db: new Logger('DB'),
  
  /** Authentication logging */
  auth: new Logger('AUTH'),
  
  /** GitHub integration logging */
  github: new Logger('GITHUB'),
  
  /** Music operations logging */
  music: new Logger('MUSIC'),
  
  /** Consciousness system logging */
  consciousness: new Logger('CONSCIOUSNESS'),
  
  /** Create custom logger */
  create: (context: string, data?: Record<string, any>) => new Logger(context, data),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick log functions for one-off logging
 */
export const quickLog = {
  debug: (message: string, data?: Record<string, any>) => hollyLogger.app.debug(message, data),
  info: (message: string, data?: Record<string, any>) => hollyLogger.app.info(message, data),
  warn: (message: string, data?: Record<string, any>) => hollyLogger.app.warn(message, data),
  error: (message: string, error?: Error | unknown, data?: Record<string, any>) => 
    hollyLogger.app.error(message, error, data),
  fatal: (message: string, error?: Error | unknown, data?: Record<string, any>) => 
    hollyLogger.app.fatal(message, error, data),
};

/**
 * Log unhandled errors
 */
export function setupErrorLogging(): void {
  process.on('uncaughtException', (error) => {
    hollyLogger.app.fatal('Uncaught Exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    hollyLogger.app.fatal('Unhandled Rejection', reason);
  });
}

export default hollyLogger;
