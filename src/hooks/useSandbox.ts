/**
 * USE SANDBOX HOOK
 * 
 * React hook for sandbox code execution
 */

import { useState, useCallback } from 'react';

export interface SandboxOutput {
  type: 'stdout' | 'stderr' | 'info';
  content: string;
  timestamp: number;
}

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  console_logs?: string[];
  execution_time_ms?: number;
  preview_html?: string;
}

export function useSandbox() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<SandboxOutput[]>([]);

  const execute = useCallback(async (code: string, language: string = 'javascript') => {
    setIsExecuting(true);
    setTerminalOutput([
      {
        type: 'info',
        content: `Executing ${language} code...`,
        timestamp: Date.now()
      }
    ]);

    try {
      const response = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      // Add console logs to terminal output
      if (data.console_logs && data.console_logs.length > 0) {
        const logs: SandboxOutput[] = data.console_logs.map((log: string) => ({
          type: log.startsWith('[ERROR]') ? 'stderr' : 'stdout' as const,
          content: log,
          timestamp: Date.now()
        }));
        setTerminalOutput(prev => [...prev, ...logs]);
      }

      // Add execution result
      if (data.success) {
        if (data.output) {
          setTerminalOutput(prev => [
            ...prev,
            {
              type: 'stdout',
              content: `Output: ${data.output}`,
              timestamp: Date.now()
            }
          ]);
        }
        setTerminalOutput(prev => [
          ...prev,
          {
            type: 'info',
            content: `✓ Execution completed in ${data.execution_time_ms}ms`,
            timestamp: Date.now()
          }
        ]);
      } else {
        setTerminalOutput(prev => [
          ...prev,
          {
            type: 'stderr',
            content: `✗ Error: ${data.error}`,
            timestamp: Date.now()
          }
        ]);
      }

      setResult(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTerminalOutput(prev => [
        ...prev,
        {
          type: 'stderr',
          content: `✗ Error: ${errorMessage}`,
          timestamp: Date.now()
        }
      ]);
      setResult({
        success: false,
        error: errorMessage
      });
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const getPreview = useCallback(async (code: string, language: string = 'html') => {
    try {
      const response = await fetch('/api/sandbox/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Preview generation failed');
      }

      return data.preview_html;
    } catch (error) {
      console.error('[useSandbox] Preview error:', error);
      throw error;
    }
  }, []);

  const clearOutput = useCallback(() => {
    setTerminalOutput([]);
    setResult(null);
  }, []);

  return {
    execute,
    getPreview,
    clearOutput,
    isExecuting,
    result,
    terminalOutput
  };
}
