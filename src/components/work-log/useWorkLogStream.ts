/**
 * useWorkLogStream Hook
 * 
 * Manages SSE connection for real-time work log updates
 * Falls back to polling if SSE not supported
 * 
 * @author HOLLY AI System
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WorkLogEntry } from '@/lib/logging/work-log-service';

interface UseWorkLogStreamOptions {
  conversationId?: string;
  enabled?: boolean;
}

interface UseWorkLogStreamReturn {
  logs: WorkLogEntry[];
  isConnected: boolean;
  error: string | null;
  retry: () => void;
}

export function useWorkLogStream(
  options: UseWorkLogStreamOptions = {}
): UseWorkLogStreamReturn {
  const { conversationId, enabled = true } = options;
  
  const [logs, setLogs] = useState<WorkLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 3;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Polling fallback (if SSE fails)
  const startPolling = useCallback(() => {
    console.log('[WorkLogStream] Falling back to polling...');
    setIsConnected(true);
    
    const poll = async () => {
      try {
        const params = new URLSearchParams();
        if (conversationId) params.set('conversationId', conversationId);
        
        const response = await fetch(`/api/work-log/list?${params.toString()}`);
        if (!response.ok) throw new Error('Polling failed');
        
        const data = await response.json();
        if (data.success && data.logs) {
          setLogs(data.logs);
          setError(null);
        }
      } catch (err) {
        console.error('[WorkLogStream] Polling error:', err);
        setError('Failed to fetch logs');
      }
    };

    // Initial poll
    poll();
    
    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(poll, 3000);
  }, [conversationId]);

  // SSE connection
  const connect = useCallback(() => {
    if (!enabled) return;

    cleanup();
    setError(null);

    try {
      const params = new URLSearchParams();
      if (conversationId) params.set('conversationId', conversationId);
      
      const url = `/api/work-log/stream?${params.toString()}`;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[WorkLogStream] Connected');
        setIsConnected(true);
        setError(null);
        retriesRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data) as WorkLogEntry;
          setLogs((prev) => {
            // Check if log already exists
            const exists = prev.some((l) => l.id === log.id);
            if (exists) return prev;
            
            // Add new log and keep only last 100
            return [log, ...prev].slice(0, 100);
          });
        } catch (err) {
          console.error('[WorkLogStream] Parse error:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[WorkLogStream] SSE error:', err);
        cleanup();
        
        // Retry with exponential backoff
        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          const delay = Math.min(1000 * Math.pow(2, retriesRef.current), 10000);
          console.log(`[WorkLogStream] Retrying in ${delay}ms...`);
          setTimeout(connect, delay);
        } else {
          // Fall back to polling
          setError('Real-time connection failed, using polling fallback');
          startPolling();
        }
      };
    } catch (err) {
      console.error('[WorkLogStream] Connection error:', err);
      setError('Failed to connect');
      startPolling();
    }
  }, [enabled, conversationId, cleanup, startPolling]);

  // Manual retry
  const retry = useCallback(() => {
    retriesRef.current = 0;
    setError(null);
    connect();
  }, [connect]);

  // Effect: connect/disconnect
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      cleanup();
    }

    return cleanup;
  }, [enabled, connect, cleanup]);

  return {
    logs,
    isConnected,
    error,
    retry,
  };
}
