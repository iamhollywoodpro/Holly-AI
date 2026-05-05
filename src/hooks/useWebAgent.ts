/**
 * useWebAgent Hook
 * React hook for Web Agent browser automation
 */

'use client';

import { useState, useCallback } from 'react';

export interface WebAgentTask {
  type: 'navigate' | 'extract' | 'interact' | 'screenshot' | 'custom';
  description: string;
  url?: string;
  selector?: string;
  action?: 'click' | 'fill';
  value?: string;
  script?: string;
  multiple?: boolean;
  fullPage?: boolean;
}

export interface WebAgentResult {
  success: boolean;
  data?: any;
  screenshot?: string;
  error?: string;
}

export function useWebAgent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new browser session
   */
  const createSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/web-agent/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);

      return data.sessionId;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Close the current session
   */
  const closeSession = useCallback(async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/web-agent/session?sessionId=${sessionId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to close session');
      }

      setSessionId(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Execute a web automation task
   */
  const executeTask = useCallback(
    async (task: WebAgentTask): Promise<WebAgentResult> => {
      if (!sessionId) {
        throw new Error('No active session. Call createSession() first.');
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/web-agent/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            task,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Task execution failed');
        }

        const result = await response.json();

        if (!result.success) {
          setError(result.error || 'Task failed');
        }

        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
  );

  /**
   * Navigate to a URL
   */
  const navigate = useCallback(
    async (url: string, description?: string) => {
      return executeTask({
        type: 'navigate',
        description: description || `Navigate to ${url}`,
        url,
      });
    },
    [executeTask]
  );

  /**
   * Extract text from page
   */
  const extractText = useCallback(
    async (selector: string, description?: string, multiple?: boolean) => {
      return executeTask({
        type: 'extract',
        description: description || `Extract text from ${selector}`,
        selector,
        multiple,
      });
    },
    [executeTask]
  );

  /**
   * Click an element
   */
  const click = useCallback(
    async (selector: string, description?: string) => {
      return executeTask({
        type: 'interact',
        description: description || `Click ${selector}`,
        selector,
        action: 'click',
      });
    },
    [executeTask]
  );

  /**
   * Fill a form field
   */
  const fill = useCallback(
    async (selector: string, value: string, description?: string) => {
      return executeTask({
        type: 'interact',
        description: description || `Fill ${selector} with "${value}"`,
        selector,
        action: 'fill',
        value,
      });
    },
    [executeTask]
  );

  /**
   * Take a screenshot
   */
  const screenshot = useCallback(
    async (fullPage?: boolean, description?: string) => {
      return executeTask({
        type: 'screenshot',
        description: description || 'Take screenshot',
        fullPage,
      });
    },
    [executeTask]
  );

  /**
   * Execute custom JavaScript
   */
  const executeScript = useCallback(
    async (script: string, description?: string) => {
      return executeTask({
        type: 'custom',
        description: description || 'Execute custom script',
        script,
      });
    },
    [executeTask]
  );

  return {
    sessionId,
    isLoading,
    error,
    createSession,
    closeSession,
    executeTask,
    navigate,
    extractText,
    click,
    fill,
    screenshot,
    executeScript,
  };
}
