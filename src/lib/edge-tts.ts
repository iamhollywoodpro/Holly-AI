/**
 * Microsoft Edge TTS Client Library
 * Client-side wrapper for Edge TTS API
 * Supports 140+ languages including Malayalam with proper dialects
 */

export interface EdgeTTSOptions {
  voice?: string;
  language?: string;
  rate?: string; // e.g., '+0%', '-10%', '+20%'
  pitch?: string; // e.g., '+0Hz', '-50Hz', '+100Hz'
  volume?: string; // e.g., '+0%', '-20%', '+50%'
}

/**
 * Generate speech from text using Microsoft Edge TTS API
 * @param text - The text to convert to speech
 * @param options - TTS options
 * @returns Audio blob
 */
export async function generateSpeech(
  text: string,
  options: EdgeTTSOptions = {}
): Promise<Blob> {
  try {
    console.log('[Edge TTS Client] Generating speech...');
    console.log('[Edge TTS Client] Text length:', text.length);
    console.log('[Edge TTS Client] Options:', options);

    const response = await fetch('/api/tts/edge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: options.voice,
        language: options.language,
        rate: options.rate || '+0%',
        pitch: options.pitch || '+0Hz',
        volume: options.volume || '+0%',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `TTS API error: ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    console.log('[Edge TTS Client] Audio received, size:', audioBlob.size);

    return audioBlob;
  } catch (error) {
    console.error('[Edge TTS Client] Error:', error);
    throw new Error(`Edge TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Play audio from blob
 * @param audioBlob - The audio blob to play
 * @returns Audio element
 */
export function playAudio(audioBlob: Blob): HTMLAudioElement {
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  
  // Clean up object URL after playing
  audio.addEventListener('ended', () => {
    URL.revokeObjectURL(audioUrl);
  });
  
  audio.play().catch(error => {
    console.error('[Edge TTS Client] Audio playback error:', error);
  });
  
  return audio;
}

/**
 * Generate and play speech in one call
 * @param text - The text to convert to speech
 * @param options - TTS options
 * @returns Audio element
 */
export async function speak(
  text: string,
  options: EdgeTTSOptions = {}
): Promise<HTMLAudioElement> {
  const audioBlob = await generateSpeech(text, options);
  return playAudio(audioBlob);
}

/**
 * Get list of available voices and languages
 * @returns List of voices and languages
 */
export async function getAvailableVoices() {
  try {
    const response = await fetch('/api/tts/edge');
    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }
    return await response.json();
  } catch (error) {
    console.error('[Edge TTS Client] Error fetching voices:', error);
    return { languages: [], voices: {} };
  }
}

// Export alias for backward compatibility with Kokoro
export const generateVoice = async (
  text: string,
  voice?: string,
  speed: number = 1.0
): Promise<Blob> => {
  const rate = speed === 1.0 ? '+0%' : `${Math.round((speed - 1) * 100)}%`;
  return generateSpeech(text, { voice, rate });
};
