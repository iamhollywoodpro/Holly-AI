/**
 * HOLLY API Response Utilities
 * Standardized error and success responses for all API routes
 */

import { NextResponse } from 'next/server';

// ============================================================================
// Types
// ============================================================================

interface ApiErrorResponse {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Error Response Factory
// ============================================================================

export const apiError = {
  /**
   * 400 Bad Request - Invalid input
   */
  badRequest: (message: string, details?: any) =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message,
        code: 'BAD_REQUEST',
        details,
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    ),

  /**
   * 401 Unauthorized - Not authenticated
   */
  unauthorized: (message: string = 'Unauthorized. Please sign in.') =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message,
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    ),

  /**
   * 403 Forbidden - Not authorized
   */
  forbidden: (message: string = 'You do not have permission to access this resource.') =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message,
        code: 'FORBIDDEN',
        timestamp: new Date().toISOString()
      },
      { status: 403 }
    ),

  /**
   * 404 Not Found - Resource doesn't exist
   */
  notFound: (resource: string = 'Resource') =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: `${resource} not found.`,
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      },
      { status: 404 }
    ),

  /**
   * 409 Conflict - Resource conflict
   */
  conflict: (message: string, details?: any) =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message,
        code: 'CONFLICT',
        details,
        timestamp: new Date().toISOString()
      },
      { status: 409 }
    ),

  /**
   * 422 Unprocessable Entity - Validation error
   */
  validationError: (message: string, fields?: Record<string, string[]>) =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message,
        code: 'VALIDATION_ERROR',
        details: fields ? { fields } : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 422 }
    ),

  /**
   * 429 Too Many Requests - Rate limited
   */
  rateLimited: (retryAfter?: number, message?: string) =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message || 'Too many requests. Please slow down.',
        code: 'RATE_LIMITED',
        details: retryAfter ? { retryAfter } : undefined,
        timestamp: new Date().toISOString()
      },
      {
        status: 429,
        headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined
      }
    ),

  /**
   * 500 Internal Server Error - Something went wrong
   */
  internal: (message: string = 'An internal error occurred. Please try again later.') =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message,
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    ),

  /**
   * 502 Bad Gateway - External service error
   */
  badGateway: (service?: string) =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: service 
          ? `Failed to connect to ${service}. Please try again.`
          : 'External service unavailable. Please try again.',
        code: 'BAD_GATEWAY',
        timestamp: new Date().toISOString()
      },
      { status: 502 }
    ),

  /**
   * 503 Service Unavailable - Maintenance mode
   */
  serviceUnavailable: (message?: string) =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message || 'Service temporarily unavailable. Please try again later.',
        code: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    ),

  /**
   * Custom error with any status code
   */
  custom: (message: string, status: number, code: string = 'ERROR', details?: any) =>
    NextResponse.json<ApiErrorResponse>(
      {
        error: message,
        code,
        details,
        timestamp: new Date().toISOString()
      },
      { status }
    )
};

// ============================================================================
// Success Response Factory
// ============================================================================

export const apiSuccess = {
  /**
   * 200 OK - Standard success response
   */
  ok: <T>(data: T, message?: string) =>
    NextResponse.json<ApiSuccessResponse<T>>(
      {
        data,
        message,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    ),

  /**
   * 201 Created - Resource created successfully
   */
  created: <T>(data: T, message?: string) =>
    NextResponse.json<ApiSuccessResponse<T>>(
      {
        data,
        message: message || 'Resource created successfully.',
        timestamp: new Date().toISOString()
      },
      { status: 201 }
    ),

  /**
   * 204 No Content - Success with no body (for deletions)
   */
  noContent: () =>
    new NextResponse(null, { status: 204 }),

  /**
   * Paginated response - For list endpoints
   */
  paginated: <T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ) =>
    NextResponse.json<PaginatedResponse<T>>(
      {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total
        }
      },
      { status: 200 }
    ),

  /**
   * Custom success with any status code
   */
  custom: <T>(data: T, status: number, message?: string) =>
    NextResponse.json<ApiSuccessResponse<T>>(
      {
        data,
        message,
        timestamp: new Date().toISOString()
      },
      { status }
    )
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wrap an async handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error) => {
    console.error('[API Error]', error);

    // Handle known error types
    if (error instanceof Error) {
      // Prisma errors
      if (error.message.includes('Prisma')) {
        return apiError.internal('Database error occurred.');
      }

      // Validation errors
      if (error.name === 'ZodError' || error.message.includes('validation')) {
        return apiError.validationError(error.message);
      }

      // Generic error
      return apiError.internal(error.message);
    }

    return apiError.internal();
  }) as Promise<NextResponse<T | ApiErrorResponse>>;
}

/**
 * Check if user is authenticated, return error if not
 */
export function requireAuth(userId: string | null | undefined): NextResponse | null {
  if (!userId) {
    return apiError.unauthorized();
  }
  return null;
}

/**
 * Check if resource belongs to user, return error if not
 */
export function requireOwnership(
  resourceUserId: string,
  currentUserId: string
): NextResponse | null {
  if (resourceUserId !== currentUserId) {
    return apiError.forbidden('You do not have access to this resource.');
  }
  return null;
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): NextResponse | null {
  const missing = fields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return apiError.badRequest(
      `Missing required fields: ${missing.join(', ')}`
    );
  }
  return null;
}
