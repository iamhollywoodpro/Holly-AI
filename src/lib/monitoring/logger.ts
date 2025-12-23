export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

class Logger {
  private formatLog(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    const formatted = this.formatLog(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.ERROR:
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context);
  }

  // Self-improvement specific logging
  improvementCreated(improvementId: string, title: string, riskLevel: string) {
    this.info("Self-improvement created", {
      improvementId,
      title,
      riskLevel,
      category: "self-improvement",
    });
  }

  improvementApproved(improvementId: string, userId: string) {
    this.info("Self-improvement approved", {
      improvementId,
      userId,
      category: "self-improvement",
    });
  }

  improvementRejected(improvementId: string, userId: string) {
    this.warn("Self-improvement rejected", {
      improvementId,
      userId,
      category: "self-improvement",
    });
  }

  improvementDeployed(improvementId: string) {
    this.info("Self-improvement deployed", {
      improvementId,
      category: "self-improvement",
    });
  }

  improvementFailed(improvementId: string, error: string) {
    this.error("Self-improvement failed", {
      improvementId,
      error,
      category: "self-improvement",
    });
  }
}

export const logger = new Logger();

  // Self-healing specific logging
  selfHealing(context: { anomaly: string; proposedFix: string; priority: string; autoFixable?: boolean }) {
    this.info("Self-healing action proposed", {
      ...context,
      category: "self-healing",
    });
  }
