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

  const setPhase = useCallback((phase: VoiceLoopPhase) => {
    phaseRef.current = phase;
    setState(prev => ({ ...prev, phase }));
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current != null) cancelAnimationFrame(animFrameRef.current);
      vadRef.current?.stop();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    setPhase,
  };
}
