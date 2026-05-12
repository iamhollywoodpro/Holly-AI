'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches render-time crashes in child components.
 * 
 * Usage:
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <HollyChatInterface />
 *   </ErrorBoundary>
 * 
 * Without this, any render crash in HollyChatInterface unmounts the entire
 * component tree with no recovery — the user sees a blank white page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const errorMsg = this.state.error?.message || 'An unexpected error occurred';
      const isDev = process.env.NODE_ENV === 'development';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          margin: '1rem',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          background: 'rgba(239, 68, 68, 0.05)',
          textAlign: 'center',
          minHeight: '200px',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#f87171' }}>
            Something went wrong
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '1rem', maxWidth: '400px' }}>
            {errorMsg}
          </p>
          {isDev && this.state.error?.stack && (
            <pre style={{
              fontSize: '0.75rem',
              color: '#71717a',
              background: 'rgba(0,0,0,0.3)',
              padding: '0.75rem',
              borderRadius: '8px',
              maxWidth: '600px',
              overflow: 'auto',
              maxHeight: '200px',
              textAlign: 'left',
              marginBottom: '1rem',
            }}>
              {this.state.error.stack}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/chat'}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Reload Chat
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;