'use client';

/**
 * HOLLY Voice Button Component
 * Allows text-to-speech using Google Gemini TTS (free)
 */

import { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { speakText } from '@/lib/voice/enhanced-voice-output';

interface VoiceButtonProps {
  text: string;
  autoPlay?: boolean;
  className?: string;
}

export function VoiceButton({ text, autoPlay = false, className = '' }: VoiceButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const generateAndPlay = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Stop current audio if playing
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      // Generate and play speech using Gemini TTS
      setIsPlaying(true);
      await speakText(text, {
        onStart: () => setIsPlaying(true),
        onEnd: () => {
          setIsPlaying(false);
          setAudio(null);
        },
        onError: () => {
          setError('Failed to play audio');
          setIsPlaying(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleClick = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      generateAndPlay();
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={isPlaying ? 'Stop HOLLY' : 'Play HOLLY\'s voice'}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isLoading ? 'Generating...' : isPlaying ? 'Stop' : 'Play HOLLY'}
        </span>
      </button>
      
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  );
}
