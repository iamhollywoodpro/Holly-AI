/**
 * Error handling utilities for HOLLY
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }
  
  // Network errors are typically retryable
  if (error instanceof Error) {
    return error.message.includes('network') || 
           error.message.includes('timeout') ||
           error.message.includes('fetch');
  }
  
  return false;
}

export const ErrorMessages = {
  NETWORK_ERROR: 'Network connection lost. Please check your internet and try again.',
  API_ERROR: 'Unable to reach HOLLY. Please try again in a moment.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  UPLOAD_ERROR: 'File upload failed. Please try again.',
  LOAD_ERROR: 'Failed to load conversation. Please refresh the page.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
};
