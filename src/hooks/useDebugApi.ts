import { useDebug } from '@/contexts/DebugContext';
import { useCallback } from 'react';

export function useDebugApi() {
  const { addLog, isEnabled } = useDebug();

  const trackApiCall = useCallback(async <T>(
    endpoint: string,
    options: RequestInit,
    operation: () => Promise<T>
  ): Promise<T> => {
    if (!isEnabled) {
      return operation();
    }

    const startTime = performance.now();
    
    addLog({
      level: 'info',
      category: 'api',
      message: `${options.method || 'GET'} ${endpoint}`,
      details: {
        endpoint,
        method: options.method || 'GET',
        headers: options.headers,
      },
    });

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      addLog({
        level: 'success',
        category: 'api',
        message: `${options.method || 'GET'} ${endpoint} - Success`,
        duration,
        details: {
          endpoint,
          duration: `${duration.toFixed(2)}ms`,
          response: result,
        },
      });

      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;

      addLog({
        level: 'error',
        category: 'api',
        message: `${options.method || 'GET'} ${endpoint} - Failed`,
        duration,
        details: {
          endpoint,
          duration: `${duration.toFixed(2)}ms`,
          error: error.message,
          stack: error.stack,
        },
      });

      throw error;
    }
  }, [addLog, isEnabled]);

  const trackTokens = useCallback((used: number, limit: number) => {
    if (!isEnabled) return;

    const percentage = (used / limit) * 100;
    const level = percentage > 90 ? 'warn' : percentage > 70 ? 'info' : 'success';

    addLog({
      level,
      category: 'token',
      message: `Token usage: ${used.toLocaleString()} / ${limit.toLocaleString()} (${percentage.toFixed(1)}%)`,
      details: {
        used,
        limit,
        remaining: limit - used,
        percentage: percentage.toFixed(2),
      },
    });
  }, [addLog, isEnabled]);

  const trackTool = useCallback((toolName: string, params: any, result: any, duration: number) => {
    if (!isEnabled) return;

    addLog({
      level: 'success',
      category: 'tool',
      message: `Tool executed: ${toolName}`,
      duration,
      details: {
        tool: toolName,
        params,
        result,
        duration: `${duration.toFixed(2)}ms`,
      },
    });
  }, [addLog, isEnabled]);

  const trackTiming = useCallback((operation: string, duration: number) => {
    if (!isEnabled) return;

    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'success';

    addLog({
      level,
      category: 'timing',
      message: `${operation}: ${duration.toFixed(2)}ms`,
      duration,
      details: {
        operation,
        duration: `${duration.toFixed(2)}ms`,
        slow: duration > 2000,
      },
    });
  }, [addLog, isEnabled]);

  return {
    trackApiCall,
    trackTokens,
    trackTool,
    trackTiming,
  };
}
