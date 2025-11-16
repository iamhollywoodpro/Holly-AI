'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface ConsciousnessState {
  emotion: string;
  intensity: number;
  focus: string;
  goalsCount: number;
  memoriesCount: number;
  isLearning: boolean;
}

interface UseConsciousnessStateOptions {
  refreshInterval?: number; // milliseconds
  enabled?: boolean;
}

/**
 * Hook to fetch and manage HOLLY's real-time consciousness state
 * Fetches data from consciousness APIs and updates periodically
 * Only fetches when user is authenticated
 */
export function useConsciousnessState(options: UseConsciousnessStateOptions = {}) {
  const { refreshInterval = 30000, enabled = true } = options; // Default: 30 seconds
  const { isSignedIn, isLoaded } = useUser(); // Check authentication status
  
  const [state, setState] = useState<ConsciousnessState>({
    emotion: 'curious',
    intensity: 0.7,
    focus: 'Waiting for interaction...',
    goalsCount: 0,
    memoriesCount: 0,
    isLearning: false
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real consciousness state from APIs
  const fetchConsciousnessState = useCallback(async () => {
    // Don't fetch if user is not signed in
    if (!isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch goals, experiences, and identity in parallel
      const [goalsRes, experiencesRes, identityRes] = await Promise.all([
        fetch('/api/consciousness/goals').then(r => r.ok ? r.json() : { goals: [] }),
        fetch('/api/consciousness/experiences?limit=10').then(r => r.ok ? r.json() : { experiences: [] }),
        fetch('/api/consciousness/identity').then(r => r.ok ? r.json() : { identity: null })
      ]);

      const goals = goalsRes.goals || [];
      const experiences = experiencesRes.experiences || [];
      const identity = identityRes.identity;

      // Determine current emotion from recent experiences
      const recentExperience = experiences[0];
      let emotion = 'curious'; // Default
      let intensity = 0.7;

      if (recentExperience?.emotional_impact?.primary_emotion) {
        emotion = recentExperience.emotional_impact.primary_emotion;
        intensity = recentExperience.emotional_impact.intensity || 0.7;
      }

      // Determine current focus from active goals or recent activity
      let focus = 'Ready to help you build amazing things';
      
      const activeGoal = goals.find((g: any) => g.status === 'active' && g.progress < 0.9);
      if (activeGoal) {
        focus = activeGoal.description || activeGoal.goal_text;
      } else if (recentExperience?.content?.what) {
        // Use recent experience as focus
        const content = recentExperience.content.what;
        focus = content.length > 50 ? content.substring(0, 50) + '...' : content;
      }

      // Determine if learning (recent experiences with learning extracted)
      const isLearning = experiences.some((exp: any) => 
        exp.learning_extracted?.insights?.length > 0 ||
        exp.learning_extracted?.skills_developed?.length > 0
      );

      setState({
        emotion,
        intensity,
        focus,
        goalsCount: goals.length,
        memoriesCount: experiences.length,
        isLearning
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch consciousness state:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [isSignedIn]);

  // Initial fetch - only when user is loaded and signed in
  useEffect(() => {
    if (enabled && isLoaded && isSignedIn) {
      fetchConsciousnessState();
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [enabled, isLoaded, isSignedIn, fetchConsciousnessState]);

  // Set up periodic refresh - only if user is signed in
  useEffect(() => {
    if (!enabled || !refreshInterval || !isSignedIn) return;

    const interval = setInterval(fetchConsciousnessState, refreshInterval);
    return () => clearInterval(interval);
  }, [enabled, refreshInterval, isSignedIn, fetchConsciousnessState]);

  return {
    state,
    loading,
    error,
    refresh: fetchConsciousnessState
  };
}
