'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

interface AmbientSoundState {
  enabled: boolean;
  toggle: () => void;
  playSend: () => void;
  playReceive: () => void;
  playModeChange: () => void;
  playThinking: () => void;
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.08) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  filter.Q.value = 1;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + duration);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playChime(notes: number[], interval: number = 0.08, volume: number = 0.06) {
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sine', volume), i * interval * 1000);
  });
}

export function useAmbientSound(): AmbientSoundState {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled(v => {
      if (!v) getAudioCtx();
      return !v;
    });
  }, []);

  const playSend = useCallback(() => {
    if (!enabledRef.current) return;
    playChime([880, 1100], 0.06, 0.05);
  }, []);

  const playReceive = useCallback(() => {
    if (!enabledRef.current) return;
    playChime([660, 880, 1100], 0.1, 0.04);
  }, []);

  const playModeChange = useCallback(() => {
    if (!enabledRef.current) return;
    playChime([440, 554, 659, 880], 0.12, 0.05);
  }, []);

  const playThinking = useCallback(() => {
    if (!enabledRef.current) return;
    playTone(220, 0.5, 'sine', 0.03);
  }, []);

  return { enabled, toggle, playSend, playReceive, playModeChange, playThinking };
}
