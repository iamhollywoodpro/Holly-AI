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

// ─── Error ring buffer (for self-healing log scanning) ────────────────────────
// Keeps the last 200 ERROR-level entries in memory so self-healing can detect
// repeated error patterns without needing a DB migration or external log store.
// In-memory only — resets on container restart. Sufficient for hourly scans.
interface BufferedError {
  timestamp: number;
  message: string;
  context?: Record<string, any>;
}

const ERROR_BUFFER_SIZE = 200;
const errorBuffer: BufferedError[] = [];

function pushToErrorBuffer(message: string, context?: Record<string, any>) {
  errorBuffer.push({ timestamp: Date.now(), message, context });
  if (errorBuffer.length > ERROR_BUFFER_SIZE) {
    errorBuffer.shift();
  }
}

/**
 * Returns error entries from the last `minutes` minutes.
 * Used by self-healing.ts checkLogErrors() to detect repeating error patterns.
 */
export function getRecentErrors(minutes: number): BufferedError[] {
  const cutoff = Date.now() - minutes * 60 * 1000;
  return errorBuffer.filter(e => e.timestamp >= cutoff);
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
        // Feed the self-healing error ring buffer
        pushToErrorBuffer(message, context);
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

  // Autonomous decision logging
  autonomousDecision(context: { improvementId: string; decision: string; riskScore: number; confidenceScore: number; reasoning: string }) {
    this.info("Autonomous decision made", {
      ...context,
      category: "autonomy",
    });
  }

  // Self-healing specific logging
  selfHealing(context: { anomaly: string; proposedFix: string; priority: string; autoFixable?: boolean }) {
    this.info("Self-healing action proposed", {
      ...context,
      category: "self-healing",
    });
  }
}

export const logger = new Logger();
