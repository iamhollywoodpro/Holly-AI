'use client';

/**
 * HOLLY Voice Button Component
 * Allows text-to-speech using Kokoro TTS (free, open-source)
 */

import { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { speak } from '@/lib/kokoro-tts';

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

      // Generate and play speech using Kokoro TTS
      const audioElement = await speak(text, {
        voice: 'af_heart', // Warm, professional female voice
        speed: 1.0,
      });
      
      audioElement.onplay = () => setIsPlaying(true);
      audioElement.onended = () => {
        setIsPlaying(false);
        setAudio(null);
      };
      audioElement.onerror = () => {
        setError('Failed to play audio');
        setIsPlaying(false);
      };

      setAudio(audioElement);
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
