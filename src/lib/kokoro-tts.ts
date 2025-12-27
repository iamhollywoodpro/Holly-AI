/**
 * Kokoro TTS Service
 * Free, open-source text-to-speech for HOLLY using Kokoro-82M
 */

const KOKORO_API_URL = process.env.NEXT_PUBLIC_KOKORO_API_URL || 'https://mrleaf81-holly-kokoro-tts.hf.space';

export interface KokoroTTSOptions {
  voice?: 'af_heart' | 'af_bella' | 'af_sarah' | 'af_nicole' | 'af_sky';
  speed?: number;
}

/**
 * Generate speech from text using Kokoro TTS
 * @param text - The text to convert to speech
 * @param options - TTS options (voice, speed)
 * @returns Audio blob
 */
export async function generateSpeech(
  text: string,
  options: KokoroTTSOptions = {}
): Promise<Blob> {
  const { voice = 'af_heart', speed = 1.0 } = options;

  try {
    const response = await fetch(`${KOKORO_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
        speed,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    return audioBlob;
  } catch (error) {
    console.error('Kokoro TTS error:', error);
    throw error;
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
    console.error('Audio playback error:', error);
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
  options: KokoroTTSOptions = {}
): Promise<HTMLAudioElement> {
  const audioBlob = await generateSpeech(text, options);
  return playAudio(audioBlob);
}

/**
 * Check if Kokoro TTS API is available
 * @returns True if API is available
 */
export async function isKokoroAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${KOKORO_API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.warn('Kokoro TTS API not available:', error);
    return false;
  }
}

/**
 * Get available voices
 * @returns List of available voices
 */
export async function getVoices() {
  try {
    const response = await fetch(`${KOKORO_API_URL}/voices`);
    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching voices:', error);
    return { voices: [] };
  }
}
