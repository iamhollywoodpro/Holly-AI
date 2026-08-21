'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceActivityDetector, type VADState } from './voice-activity-detector';

export type VoiceLoopPhase = 'idle' | 'listening' | 'processing' | 'speaking';

export interface VoiceLoopState {
  phase: VoiceLoopPhase;
  volume: number;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isListening: boolean;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
}

interface UseVoiceLoopOptions {
  silenceTimeout?: number;
  onTranscript?: (text: string) => void;
  onResponseComplete?: () => void;
  autoSend?: boolean;
  /** PTT latency telemetry: fired with ms breakdown per voice turn */
  onLatency?: (timing: { sttMs: number }) => void;
}

const INITIAL_STATE: VoiceLoopState = {
  phase: 'idle',
  volume: 0,
  transcript: '',
  interimTranscript: '',
  error: null,
  isListening: false,
  frequencyData: new Uint8Array(0),
  timeDomainData: new Uint8Array(0),
};

export function useVoiceLoop(options: UseVoiceLoopOptions = {}) {
  const [state, setState] = useState<VoiceLoopState>(INITIAL_STATE);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(options.onTranscript);
  const phaseRef = useRef<VoiceLoopPhase>('idle');

  onTranscriptRef.current = options.onTranscript;

  const updateWaveformData = useCallback(() => {
    if (!vadRef.current || phaseRef.current !== 'listening') return;
    animFrameRef.current = requestAnimationFrame(updateWaveformData);

    const frequencyData = vadRef.current.getFrequencyData();
    const timeDomainData = vadRef.current.getTimeDomainData();
    const volume = vadRef.current.getState().volume;

    setState(prev => ({
      ...prev,
      volume,
      frequencyData,
      timeDomainData,
    }));
  }, []);

  const transcribeAudio = useCallback(async (blob: Blob): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);

      const data = await res.json();
      return data.text || data.transcription || '';
    } catch (err) {
      console.error('[VoiceLoop] Transcription error:', err);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (phaseRef.current === 'listening') return;

    phaseRef.current = 'listening';
    setState(prev => ({ ...prev, phase: 'listening', error: null, transcript: '', interimTranscript: '' }));

    try {
      const vad = new VoiceActivityDetector({
        silenceDurationMs: options.silenceTimeout ?? 1500,
      });
      vadRef.current = vad;

      const started = await vad.start();
      if (!started) {
        throw new Error('Failed to start voice activity detection');
      }

      const stream = vad['stream'];
      if (stream) {
        streamRef.current = stream;
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          if (audioChunksRef.current.length === 0) {
            phaseRef.current = 'idle';
            setState(prev => ({ ...prev, phase: 'idle' }));
            return;
          }

          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
          audioChunksRef.current = [];

          phaseRef.current = 'processing';
          setState(prev => ({ ...prev, phase: 'processing' }));

          try {
            const text = await transcribeAudio(blob);
            if (text.trim()) {
              setState(prev => ({ ...prev, transcript: text, phase: 'idle' }));
              onTranscriptRef.current?.(text);
            } else {
              setState(prev => ({ ...prev, phase: 'idle' }));
            }
          } catch (err) {
            setState(prev => ({
              ...prev,
              phase: 'idle',
              error: err instanceof Error ? err.message : 'Transcription failed',
            }));
          }
        };

        recorder.start(500);
      }

      vad.onStateChange((vadState: VADState) => {
        if (vadState.isSpeaking && phaseRef.current === 'listening') {
          setState(prev => ({ ...prev, isListening: true }));
        }

        if (!vadState.isSpeaking && phaseRef.current === 'listening' && vadState.volume < 0.005) {
          const recording = mediaRecorderRef.current;
          if (recording && recording.state === 'recording') {
            const chunks = audioChunksRef.current;
            if (chunks.length > 0) {
              stopRecording();
            }
          }
          setState(prev => ({ ...prev, isListening: false }));
        }
      });

      updateWaveformData();
    } catch (err) {
      phaseRef.current = 'idle';
      setState(prev => ({
        ...prev,
        phase: 'idle',
        error: err instanceof Error ? err.message : 'Failed to start listening',
      }));
    }
  }, [options.silenceTimeout, transcribeAudio, stopRecording, updateWaveformData]);

  const stopListening = useCallback(() => {
    if (animFrameRef.current != null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    vadRef.current?.stop();
    vadRef.current = null;

    phaseRef.current = 'idle';
    setState(prev => ({ ...prev, phase: 'idle', isListening: false, volume: 0 }));
  }, []);

  // ── PUSH-TO-TALK (Jarvis-style, 2026-08-21) ─────────────────────────────
  // Hold-to-record, release-to-send. No VAD gating — the key IS the gate.
  // Records to the same MediaRecorder pipeline and delivers through the
  // same onTranscript path, so PTT is a transport, not a separate brain.
  const pttRecorderRef = useRef<MediaRecorder | null>(null);
  const pttChunksRef = useRef<Blob[]>([]);
  const pttStreamRef = useRef<MediaStream | null>(null);
  const pttAbortRef = useRef(false);
  const onLatencyRef = useRef(options.onLatency);
  onLatencyRef.current = options.onLatency;

  const isPTTActive = useCallback(() => phaseRef.current === 'listening' && pttRecorderRef.current !== null, []);

  const startPTT = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (phaseRef.current === 'listening' || phaseRef.current === 'processing') return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pttStreamRef.current = stream;
      pttAbortRef.current = false;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      pttRecorderRef.current = recorder;
      pttChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) pttChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Release mic immediately — never held during processing
        pttStreamRef.current?.getTracks().forEach(t => t.stop());
        pttStreamRef.current = null;
        pttRecorderRef.current = null;

        if (pttAbortRef.current || pttChunksRef.current.length === 0) {
          pttChunksRef.current = [];
          phaseRef.current = 'idle';
          setState(prev => ({ ...prev, phase: 'idle' }));
          return;
        }

        const blob = new Blob(pttChunksRef.current, { type: recorder.mimeType });
        pttChunksRef.current = [];

        phaseRef.current = 'processing';
        setState(prev => ({ ...prev, phase: 'processing' }));

        const t0 = performance.now();
        try {
          const text = await transcribeAudio(blob);
          if (text.trim()) {
            onLatencyRef.current?.({ sttMs: Math.round(performance.now() - t0) });
            phaseRef.current = 'idle';
            setState(prev => ({ ...prev, transcript: text, phase: 'idle' }));
            onTranscriptRef.current?.(text);
          } else {
            phaseRef.current = 'idle';
            setState(prev => ({ ...prev, phase: 'idle' }));
          }
        } catch (err) {
          phaseRef.current = 'idle';
          setState(prev => ({
            ...prev,
            phase: 'idle',
            error: err instanceof Error ? err.message : 'Transcription failed',
          }));
        }
      };

      phaseRef.current = 'listening';
      setState(prev => ({ ...prev, phase: 'listening', error: null, transcript: '', interimTranscript: '' }));
      recorder.start(300);
      return true;
    } catch (err) {
      phaseRef.current = 'idle';
      setState(prev => ({
        ...prev,
        phase: 'idle',
        error: err instanceof Error ? err.message : 'Mic permission denied',
      }));
      return false;
    }
  }, [transcribeAudio]);

  /** Release = stop recording → transcribe → deliver. cancel=true discards. */
  const stopPTT = useCallback((cancel = false) => {
    pttAbortRef.current = cancel;
    const recorder = pttRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    } else if (cancel) {
      // Never actually started (permission pending) — hard reset
      pttStreamRef.current?.getTracks().forEach(t => t.stop());
      pttStreamRef.current = null;
      pttRecorderRef.current = null;
      pttChunksRef.current = [];
      phaseRef.current = 'idle';
      setState(prev => ({ ...prev, phase: 'idle' }));
    }
  }, []);

  // ── BROWSER STT MODE (Web Speech API) ───────────────────────────────────
  // Zero server round-trip for transcription. Availability: Chrome/Edge
  // (network-based engine) and Safari (on-device). Used as the "fast" mode
  // when the user opts in — Holly's server Whisper stays the quality default.
  const browserSTTRef = useRef<{ recognition: any; active: boolean } | null>(null);

  const isBrowserSTTAvailable = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }, []);

  const startBrowserSTT = useCallback((): boolean => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    try {
      const recognition = new SR();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalText = '';
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        setState(prev => ({ ...prev, interimTranscript: interim }));
      };
      recognition.onerror = (event: any) => {
        console.warn('[VoiceLoop] Browser STT error:', event.error);
        phaseRef.current = 'idle';
        setState(prev => ({ ...prev, phase: 'idle', error: `Browser STT: ${event.error}` }));
        browserSTTRef.current = null;
      };
      recognition.onend = () => {
        browserSTTRef.current = null;
        phaseRef.current = 'idle';
        setState(prev => ({ ...prev, phase: 'idle' }));
        if (finalText.trim()) {
          onTranscriptRef.current?.(finalText.trim());
        }
      };

      phaseRef.current = 'listening';
      setState(prev => ({ ...prev, phase: 'listening', error: null, transcript: '', interimTranscript: '' }));
      recognition.start();
      browserSTTRef.current = { recognition, active: true };
      return true;
    } catch (err) {
      console.warn('[VoiceLoop] Browser STT failed to start:', err);
      return false;
    }
  }, []);

  const stopBrowserSTT = useCallback(() => {
    browserSTTRef.current?.recognition?.stop?.();
  }, []);

  const setPhase = useCallback((phase: VoiceLoopPhase) => {
    phaseRef.current = phase;
    setState(prev => ({ ...prev, phase }));
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
      vadRef.current?.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (pttStreamRef.current) pttStreamRef.current.getTracks().forEach(t => t.stop());
      browserSTTRef.current?.recognition?.stop?.();
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    setPhase,
    // Push-to-talk
    startPTT,
    stopPTT,
    isPTTActive,
    // Browser STT (Web Speech API)
    isBrowserSTTAvailable,
    startBrowserSTT,
    stopBrowserSTT,
  };
}
