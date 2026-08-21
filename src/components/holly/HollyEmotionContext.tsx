'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type HollyEmotion } from './LivingLogo';

/**
 * HollyActivity — what Holly is DOING right now (state face, 2026-08-21).
 * Distinct from emotion (how she feels): the voice/conversation loop drives
 * activity, and the avatar shows the matching expression while active.
 */
export type HollyActivity =
  | 'idle'
  | 'listening'     // user is speaking (mic open, PTT held, call mode)
  | 'transcribing'  // Whisper is transcribing the user's audio
  | 'thinking'      // processing a reply
  | 'generating'    // creating media (image / music / video)
  | 'speaking';     // Holly's TTS voice is playing

interface HollyEmotionState {
  emotion: HollyEmotion;
  setEmotion: (e: HollyEmotion) => void;
  activity: HollyActivity;
  setActivity: (a: HollyActivity) => void;
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
  activity: 'idle',
  setActivity: () => {},
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
  const [activity, setActivity] = useState<HollyActivity>('idle');
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
        activity,
        setActivity: useCallback((a: HollyActivity) => setActivity(a), []),
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
