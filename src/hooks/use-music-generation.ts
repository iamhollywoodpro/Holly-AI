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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate song');
      }

      const result = await response.json();

      const clips = result.data;
      const taskId = clips?.taskId || clips?.[0]?.id;

      if (!taskId && Array.isArray(clips) && clips.length > 0) {
        const clip = clips[0];
        if (clip.audio_url || clip.status === 'complete' || clip.status === 'published') {
          options?.onSuccess?.(clip as Song);
          return clip as Song;
        }
      }

      if (taskId) {
        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000));

          const statusResponse = await fetch(`/api/music/status?taskId=${taskId}`);
          const statusData = await statusResponse.json();

          if (!statusResponse.ok || statusData.success === false) {
            attempts++;
            continue;
          }

          const statusClips = statusData.data;
          if (Array.isArray(statusClips)) {
            const allDone = statusClips.every(
              (c: any) => c.status === 'complete' || c.status === 'published'
            );
            if (allDone && statusClips.length > 0) {
              options?.onSuccess?.(statusClips[0] as Song);
              return statusClips[0] as Song;
            }
          }

          attempts++;
        }

        throw new Error('Song generation timed out');
      }

      if (Array.isArray(clips) && clips.length > 0) {
        return clips[0] as Song;
      }

      throw new Error('Unexpected response from music API');

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
      const response = await fetch('/api/music/generate-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate lyrics');
      }

      const result = await response.json();
      return result.data?.lyrics || result.lyrics || '';

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
      const response = await fetch('/api/music/generate-lyrics?detect=' + encodeURIComponent(text), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        return 'en';
      }

      const data = await response.json();
      return data?.languageCode || 'en';

    } catch {
      return 'en';
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
