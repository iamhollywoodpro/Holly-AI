// ============================================
// MUSIC GENERATION HOOK
// ============================================

import { useState } from 'react';
import type {
  GenerateSongRequest,
  GenerateLyricsRequest,
  Song,
  Language,
  UseMusicGenerationOptions,
  UseMusicGenerationReturn,
} from '@/types/music';

export function useMusicGeneration(options?: UseMusicGenerationOptions): UseMusicGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>();

  const generateSong = async (request: GenerateSongRequest): Promise<Song> => {
    setIsGenerating(true);
    setError(undefined);

    try {
      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate song');
      }

      const data = await response.json();

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes (5 second intervals)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`/api/music/generate?song_id=${data.song_id}`);
        const statusData = await statusResponse.json();

        if (statusData.status === 'complete') {
          options?.onSuccess?.(statusData as Song);
          return statusData as Song;
        } else if (statusData.status === 'failed') {
          throw new Error('Song generation failed');
        }

        attempts++;
      }

      throw new Error('Song generation timed out');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      options?.onError?.(err as Error);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLyrics = async (request: GenerateLyricsRequest): Promise<string> => {
    setIsGenerating(true);
    setError(undefined);

    try {
      const response = await fetch('/api/music/lyrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate lyrics');
      }

      const data = await response.json();
      return data.lyrics;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      options?.onError?.(err as Error);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const detectLanguage = async (text: string): Promise<Language> => {
    try {
      const response = await fetch('/api/music/detect-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Language detection failed');
      }

      const data = await response.json();
      return data.language;

    } catch (err) {
      console.error('Language detection error:', err);
      return 'en'; // Default to English
    }
  };

  return {
    generateSong,
    generateLyrics,
    detectLanguage,
    isGenerating,
    error,
  };
}
