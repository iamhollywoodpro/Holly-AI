'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Suggestion } from '@/types/suggestions';

interface UseSuggestionsOptions {
  conversationId: string | null;
  enabled?: boolean;
  autoHideDelay?: number; // milliseconds
}

export function useSuggestions({
  conversationId,
  enabled = true,
  autoHideDelay = 30000, // 30 seconds default
}: UseSuggestionsOptions) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastConversationIdRef = useRef<string | null>(null);

  // Generate suggestions
  const generateSuggestions = useCallback(async () => {
    if (!conversationId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/suggestions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageCount: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
      
      if (data.suggestions && data.suggestions.length > 0) {
        setIsVisible(true);
        startAutoHideTimer();
      }
    } catch (err) {
      console.error('Suggestion generation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, enabled]);

  // Auto-hide timer
  const startAutoHideTimer = useCallback(() => {
    // Clear existing timer
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }

    // Set new timer
    autoHideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, autoHideDelay);
  }, [autoHideDelay]);

  // Dismiss suggestions
  const dismiss = useCallback(() => {
    setIsVisible(false);
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  // Show suggestions (reset auto-hide timer)
  const show = useCallback(() => {
    if (suggestions.length > 0) {
      setIsVisible(true);
      startAutoHideTimer();
    }
  }, [suggestions.length, startAutoHideTimer]);

  // Refresh suggestions
  const refresh = useCallback(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  // Track suggestion usage (for learning)
  const trackUsage = useCallback(async (suggestion: Suggestion) => {
    try {
      // TODO: Implement usage tracking API
      // This will help AI learn which suggestions are most useful
      console.log('Suggestion used:', suggestion);
    } catch (err) {
      console.error('Failed to track suggestion usage:', err);
    }
  }, []);

  // Auto-generate suggestions when conversation changes
  useEffect(() => {
    if (conversationId && conversationId !== lastConversationIdRef.current) {
      lastConversationIdRef.current = conversationId;
      
      // Delay to let messages load
      const timer = setTimeout(() => {
        generateSuggestions();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [conversationId, generateSuggestions]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isVisible || suggestions.length === 0) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc to dismiss
      if (e.key === 'Escape') {
        dismiss();
        return;
      }

      // Cmd/Ctrl + 1/2/3 to select suggestion
      if ((e.metaKey || e.ctrlKey) && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (suggestions[index]) {
          return suggestions[index];
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, suggestions, dismiss]);

  return {
    suggestions,
    isLoading,
    isVisible,
    error,
    generateSuggestions,
    refresh,
    dismiss,
    show,
    trackUsage,
  };
}
