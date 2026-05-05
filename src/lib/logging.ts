/**
 * Logging Utility for HOLLY
 * Provides consistent logging across the application
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
}

class Logger {
  private context: string;

  constructor(context: string = 'HOLLY') {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...(data && { data })
    };

    const emoji = {
      info: '💜',
      warn: '⚠️',
      error: '🚨',
      debug: '🔍'
    };

    console.log(`${emoji[level]} [${entry.timestamp}] [${this.context}] ${message}`, data || '');

    // In production, send to Sentry or logging service
    if (level === 'error' && typeof window !== 'undefined') {
      // Browser error tracking
      if ((window as any).Sentry) {
        (window as any).Sentry.captureException(new Error(message), {
          contexts: { data }
        });
      }
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
}

// Export default logger
export const logger = new Logger('HOLLY');

// Export Logger class for custom contexts
export { Logger };

// Convenience function for creating contextual loggers
export function createLogger(context: string): Logger {
  return new Logger(context);
}
