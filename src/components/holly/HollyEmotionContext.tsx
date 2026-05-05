'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type HollyEmotion } from './LivingLogo';

interface HollyEmotionState {
  emotion: HollyEmotion;
  setEmotion: (e: HollyEmotion) => void;
  isThinking: boolean;
  setIsThinking: (v: boolean) => void;
  isStreaming: boolean;
  setIsStreaming: (v: boolean) => void;
  sessionMinutes: number;
  confidence: number;
  setConfidence: (v: number) => void;
}

const HollyEmotionContext = createContext<HollyEmotionState>({
  emotion: 'idle',
  setEmotion: () => {},
  isThinking: false,
  setIsThinking: () => {},
  isStreaming: false,
  setIsStreaming: () => {},
  sessionMinutes: 0,
  confidence: 0,
  setConfidence: () => {},
});

export function HollyEmotionProvider({ children }: { children: ReactNode }) {
  const [emotion, setEmotion] = useState<HollyEmotion>('idle');
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setSessionMinutes(Math.floor((Date.now() - start) / 60000));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <HollyEmotionContext.Provider
      value={{
        emotion,
        setEmotion: useCallback((e: HollyEmotion) => setEmotion(e), []),
        isThinking,
        setIsThinking: useCallback((v: boolean) => setIsThinking(v), []),
        isStreaming,
        setIsStreaming: useCallback((v: boolean) => setIsStreaming(v), []),
        sessionMinutes,
        confidence,
        setConfidence: useCallback((v: number) => setConfidence(v), []),
      }}
    >
      {children}
    </HollyEmotionContext.Provider>
  );
}

export function useHollyEmotion() {
  return useContext(HollyEmotionContext);
}
