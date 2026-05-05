'use client';

/**
 * VoiceInput component — Phase 4C (updated: Browser Web Speech API removed)
 *
 * STT: MediaRecorder → POST /api/voice/transcribe (Groq Whisper)
 * TTS: delegated to enhanced-voice-output.ts (Kokoro → VoxCPM2)
 *
 * Browser speechSynthesis and webkitSpeechRecognition have been removed.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  disabled?: boolean;
}

export default function VoiceInput({
  onTranscript,
  onVoiceStart,
  onVoiceEnd,
  disabled = false,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startListening = useCallback(async () => {
    if (disabled || isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        if (audioChunksRef.current.length === 0) return;
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'recording.webm');
          const res = await fetch('/api/voice/transcribe', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.success && data.text) {
            setTranscript(data.text);
            onTranscript(data.text);
            setTimeout(() => setTranscript(''), 3000);
          } else if (data.error) {
            console.error('[VoiceInput] STT error:', data.error);
          }
        } catch (err) {
          console.error('[VoiceInput] Transcription fetch failed:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mr.start(500);
      setIsListening(true);
      onVoiceStart?.();
    } catch (err) {
      console.error('[VoiceInput] Microphone access denied:', err);
    }
  }, [disabled, isListening, onTranscript, onVoiceStart]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    onVoiceEnd?.();
  }, [onVoiceEnd]);

  const toggleListening = () => {
    if (isListening) stopListening();
    else void startListening();
  };

  // Stop any server TTS that is playing
  const stopSpeaking = useCallback(async () => {
    try {
      const { stopSpeaking: stop } = await import('@/lib/voice/enhanced-voice-output');
      stop();
    } catch { /* ignore */ }
    setIsSpeaking(false);
  }, []);

  const toggleSpeaking = () => {
    if (isSpeaking) void stopSpeaking();
    // When not speaking, the output button is informational only.
  };

  // Simulate audio level animation while recording
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isListening]);

  return (
    <div className="flex items-center gap-3">
      {/* Voice Input Button */}
      <motion.button
        onClick={toggleListening}
        disabled={disabled || isTranscribing}
        title={isListening ? 'Stop recording' : 'Start voice input (Groq Whisper)'}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
            : isTranscribing
            ? 'bg-yellow-600 cursor-wait'
            : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.div key="mic-on" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 180 }}>
              <Mic className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div key="mic-off" initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: -180 }}>
              <MicOff className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Audio Level Visualization */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-red-400"
            animate={{ scale: [1, 1.2 + (audioLevel / 100) * 0.3, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Voice Output Button (stops Kokoro TTS playback) */}
      <motion.button
        onClick={toggleSpeaking}
        title={isSpeaking ? 'Stop HOLLY speaking' : 'HOLLY voice output active (Kokoro TTS)'}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isSpeaking
            ? 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/50'
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isSpeaking ? (
            <motion.div key="volume-on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Volume2 className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div key="volume-off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <VolumeX className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {isSpeaking && (
          <>
            <motion.div className="absolute inset-0 rounded-full border-2 border-purple-400" animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1, repeat: Infinity }} />
            <motion.div className="absolute inset-0 rounded-full border-2 border-purple-400" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.3 }} />
          </>
        )}
      </motion.button>

      {/* Live Transcript */}
      <AnimatePresence>
        {(transcript || isTranscribing) && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="px-4 py-2 bg-gray-800/90 backdrop-blur-sm rounded-lg text-sm text-gray-300 max-w-md"
          >
            {isTranscribing ? '🎙️ Transcribing…' : transcript}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * speakText — uses Kokoro/VoxCPM2 TTS, never browser speechSynthesis.
 */
export const speakText = async (text: string): Promise<void> => {
  try {
    const { speakText: speak } = await import('@/lib/voice/enhanced-voice-output');
    await speak(text, { volume: 0.9 });
  } catch (err) {
    console.error('[VoiceInput] speakText error:', err);
  }
};
