'use client';

import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react';
import { type HollyEmotion } from './LivingLogo';
import { getEmotionProfile } from './LivingLogo';

// ─── Types (mirrors backend VisualRenderingContext) ──────────────────────────

interface HSLColor { h: number; s: number; l: number; }

interface ParticleConfig {
  count: number;
  size: { min: number; max: number };
  speed: { min: number; max: number };
  color: string;
  opacity: { min: number; max: number };
  behavior: 'float' | 'orbit' | 'drift' | 'pulse';
}

interface FormConfig {
  shape: 'circle' | 'hexagon' | 'blob' | 'crystal' | 'nebula';
  baseRadius: number;
  distortion: number;
  segments: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

interface GradientDef {
  id: string;
  stops: { offset: number; color: string; opacity: number }[];
}

export interface VisualRenderingContext {
  cssVars: Record<string, string>;
  gradients: GradientDef[];
  keyframes: string;
  particles: ParticleConfig;
  form: FormConfig;
}

interface VisualIdentityState {
  /** Full rendering context from the engine (or null if loading) */
  rendering: VisualRenderingContext | null;
  /** Whether we're currently fetching from the server */
  isLoading: boolean;
  /** Last fetch error */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Current emotion-driven CSS values (instant local updates) */
  emotionProfile: {
    primaryColor: string;
    secondaryColor: string;
    glowColor: string;
    bpm: number;
    scale: number;
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const VisualIdentityContext = createContext<VisualIdentityState>({
  rendering: null,
  isLoading: true,
  error: null,
  refresh: async () => {},
  emotionProfile: {
    primaryColor: '#2D8B5E',
    secondaryColor: '#0A0908',
    glowColor: 'rgba(45,139,94,0.15)',
    bpm: 50,
    scale: 0.95,
  },
});

// ─── Provider ────────────────────────────────────────────────────────────────

interface VisualIdentityProviderProps {
  children: ReactNode;
  /** Authenticated user ID. Pass null to skip server fetches. */
  userId?: string | null;
  /** Current Holly emotion for instant local updates */
  emotion?: HollyEmotion;
}

export function VisualIdentityProvider({
  children,
  userId,
  emotion = 'idle',
}: VisualIdentityProviderProps) {
  const [rendering, setRendering] = useState<VisualRenderingContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Emotion profile for instant local updates (doesn't wait for server)
  const profile = getEmotionProfile(emotion);
  const emotionProfile = {
    primaryColor: profile.primaryColor,
    secondaryColor: profile.secondaryColor,
    glowColor: profile.glowColor,
    bpm: profile.bpm,
    scale: profile.scale,
  };

  const fetchRendering = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/visual-identity/render', {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });

      if (controller.signal.aborted) return;

      if (res.ok) {
        const data = await res.json();
        setRendering(data);
        setError(null);
      } else {
        setError(`Failed to load visual identity: ${res.status}`);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message || 'Failed to load visual identity');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  // Initial fetch + polling every 30 seconds
  useEffect(() => {
    fetchRendering();
    const interval = setInterval(fetchRendering, 30_000);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchRendering]);

  const value: VisualIdentityState = {
    rendering,
    isLoading,
    error,
    refresh: fetchRendering,
    emotionProfile,
  };

  return (
    <VisualIdentityContext.Provider value={value}>
      {children}
    </VisualIdentityContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useVisualIdentity(): VisualIdentityState {
  return useContext(VisualIdentityContext);
}

/**
 * Resolved visual properties — merges server rendering context with
 * local emotion profile for instant reactivity.
 */
export function useResolvedVisuals() {
  const { rendering, emotionProfile } = useVisualIdentity();

  // Server-provided CSS vars override local when available
  const cssVars = rendering?.cssVars || {};

  // Merge: use server colors when available, fall back to emotion profile
  return {
    primaryColor: cssVars['--holly-primary'] || emotionProfile.primaryColor,
    secondaryColor: cssVars['--holly-secondary'] || emotionProfile.secondaryColor,
    glowColor: cssVars['--holly-glow'] || emotionProfile.glowColor,
    bpm: parseFloat(cssVars['--holly-bpm'] || String(emotionProfile.bpm)),
    scale: parseFloat(cssVars['--holly-scale'] || String(emotionProfile.scale)),
    particles: rendering?.particles || null,
    form: rendering?.form || null,
    gradients: rendering?.gradients || [],
    keyframes: rendering?.keyframes || '',
    allCssVars: cssVars,
  };
}
