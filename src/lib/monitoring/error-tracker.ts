import { logger } from "./logger";

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: ErrorContext
  ) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ErrorTracker {
  trackError(error: Error | ApplicationError, context?: ErrorContext) {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof ApplicationError && {
        code: error.code,
        statusCode: error.statusCode,
      }),
      context: {
        ...context,
        ...(error instanceof ApplicationError && error.context),
      },
    };

    logger.error("Error tracked", errorData);

    // In production, you could send this to an error tracking service
    // like Sentry, Rollbar, or Bugsnag
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error, { extra: errorData });
    }

    return errorData;
  }

  trackSelfImprovementError(
    improvementId: string,
    error: Error,
    phase: "plan" | "code" | "pr" | "deploy"
  ) {
    this.trackError(error, {
      improvementId,
      phase,
      category: "self-improvement",
    });
  }
}

export const errorTracker = new ErrorTracker();

// Common error types for self-improvement
export class SafetyGuardrailError extends ApplicationError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "SAFETY_GUARDRAIL_VIOLATION", 403, context);
  }
}

export class GitHubAPIError extends ApplicationError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "GITHUB_API_ERROR", 500, context);
  }
}

export class PrismaError extends ApplicationError {
  constructor(message: string, context?: ErrorContext) {
    super(message, "DATABASE_ERROR", 500, context);
  }
}
