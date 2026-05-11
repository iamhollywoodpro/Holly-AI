/**
 * HOLLY AI — Chat Error State Components
 * 
 * Provides user-friendly error states for the chat interface.
 * Never show a blank screen - always show meaningful feedback.
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, Zap } from 'lucide-react';

interface ConnectionErrorProps {
  onRetry: () => void;
}

/**
 * Connection lost - user needs to retry
 */
export function ConnectionError({ onRetry }: ConnectionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg animate-in fade-in duration-300">
      <WifiOff className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-800 mb-2">Connection Lost</h3>
      <p className="text-red-600 text-center mb-4 max-w-md">
        Holly is having trouble connecting. This might be a network issue or a temporary problem with our servers.
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

interface ProviderErrorProps {
  providerCount?: number;
}

/**
 * Some providers are down, but Holly is using alternatives
 */
export function ProviderError({ providerCount = 1 }: ProviderErrorProps) {
  const providerText = providerCount === 1 ? 'a provider' : 'some providers';

  return (
    <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg animate-in slide-in-from-left duration-300">
      <Zap className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-medium text-yellow-800 mb-1">Holly is thinking differently...</h4>
        <p className="text-sm text-yellow-700">
          {providerText} is temporarily unavailable. Holly is using alternative approaches to help you. Response quality may vary.
        </p>
      </div>
    </div>
  );
}

interface RateLimitErrorProps {
  retryAfter?: number;
  onRetry?: () => void;
}

/**
 * Rate limited - user needs to wait
 */
export function RateLimitError({ retryAfter = 60, onRetry }: RateLimitErrorProps) {
  const [secondsLeft, setSecondsLeft] = React.useState(retryAfter);

  React.useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const canRetry = secondsLeft <= 0 && onRetry;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-orange-50 border border-orange-200 rounded-lg animate-in fade-in duration-300">
      <Zap className="w-12 h-12 text-orange-500 mb-4" />
      <h3 className="text-lg font-semibold text-orange-800 mb-2">Rate Limited</h3>
      <p className="text-orange-600 text-center mb-4 max-w-md">
        {secondsLeft > 0 ? (
          <>Too many requests. Please wait <strong>{secondsLeft} seconds</strong> before trying again.</>
        ) : (
          <>You can try again now.</>
        )}
      </p>
      {canRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

interface GenericErrorProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Generic error with optional retry
 */
export function GenericError({ message, onRetry }: GenericErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border border-gray-200 rounded-lg animate-in fade-in duration-300">
      <AlertCircle className="w-12 h-12 text-gray-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Something went wrong</h3>
      <p className="text-gray-600 text-center mb-4 max-w-md">
        {message || 'Holly encountered an unexpected error. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

/**
 * Loading/processing state
 */
export function LoadingState({ message = 'Holly is thinking...' }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in duration-300">
      <div className="relative">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <span className="text-sm text-blue-700">{message}</span>
    </div>
  );
}

interface StreamingIndicatorProps {
  text?: string;
}

/**
 * Real-time streaming indicator
 */
export function StreamingIndicator({ text = 'Holly is typing...' }: StreamingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 animate-pulse">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  );
}

interface ToolUsageDisplayProps {
  tool: string;
  result?: string;
  status?: 'running' | 'success' | 'error';
}

/**
 * Display real-time tool usage
 */
export function ToolUsageDisplay({ tool, result, status = 'running' }: ToolUsageDisplayProps) {
  const statusColors = {
    running: 'text-blue-600',
    success: 'text-green-600',
    error: 'text-red-600'
  };

  return (
    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 animate-in slide-in-from-left duration-200">
      <span className={`font-medium ${statusColors[status]}`}>
        {status === 'running' && '⚡'}
        {status === 'success' && '✓'}
        {status === 'error' && '✗'}
        {' Using '}{tool}
      </span>
      {result && <span className="text-gray-400">— {result}</span>}
    </div>
  );
}

interface ErrorMessageInlineProps {
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

/**
 * Inline error message (small, non-blocking)
 */
export function ErrorMessageInline({ 
  message, 
  dismissible = false, 
  onDismiss 
}: ErrorMessageInlineProps) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg animate-in slide-in-from-top duration-200">
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 transition-colors"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}