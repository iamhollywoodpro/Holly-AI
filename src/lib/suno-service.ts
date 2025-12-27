/**
 * SUNO API Service for Music Generation
 * Uses SunoAPI.org (third-party API service)
 */

const SUNO_API_KEY = process.env.SUNOAPI_KEY || process.env.SUNO_API_KEY;
const SUNO_BASE_URL = process.env.SUNO_BASE_URL || 'https://api.sunoapi.org/api/v1';

export interface SunoGenerateRequest {
  prompt: string;
  make_instrumental?: boolean;
  wait_audio?: boolean;
  model?: 'chirp-v3-5' | 'chirp-v3-0';
  custom_mode?: boolean;
  tags?: string;
  title?: string;
}

export interface SunoTrack {
  id: string;
  title: string;
  image_url: string;
  lyric: string;
  audio_url: string;
  video_url: string;
  created_at: string;
  model_name: string;
  status: 'submitted' | 'queued' | 'streaming' | 'complete' | 'error';
  gpt_description_prompt: string;
  prompt: string;
  type: string;
  tags: string;
  duration: number;
}

export interface SunoGenerateResponse {
  success: boolean;
  data?: SunoTrack[];
  error?: string;
}

export interface SunoQueryResponse {
  success: boolean;
  data?: SunoTrack[];
  error?: string;
}

/**
 * Generate music using SUNO API
 */
export async function generateMusic(request: SunoGenerateRequest): Promise<SunoGenerateResponse> {
  try {
    if (!SUNO_API_KEY) {
      return {
        success: false,
        error: 'SUNO API key not configured',
      };
    }

    console.log('[SUNO] Generating music with prompt:', request.prompt);

    const response = await fetch(`${SUNO_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': SUNO_API_KEY,
      },
      body: JSON.stringify({
        prompt: request.prompt,
        make_instrumental: request.make_instrumental || false,
        wait_audio: request.wait_audio || false,
        model: request.model || 'chirp-v3-5',
        custom_mode: request.custom_mode || false,
        tags: request.tags || '',
        title: request.title || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SUNO] API error:', response.status, errorText);
      return {
        success: false,
        error: `SUNO API error: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    console.log('[SUNO] Generation response:', data);

    return {
      success: true,
      data: data.data || data,
    };
  } catch (error: any) {
    console.error('[SUNO] Error generating music:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Query the status of generated music
 */
export async function queryMusic(ids: string[]): Promise<SunoQueryResponse> {
  try {
    if (!SUNO_API_KEY) {
      return {
        success: false,
        error: 'SUNO API key not configured',
      };
    }

    console.log('[SUNO] Querying music status for IDs:', ids);

    const response = await fetch(`${SUNO_BASE_URL}/query?ids=${ids.join(',')}`, {
      method: 'GET',
      headers: {
        'api-key': SUNO_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SUNO] Query error:', response.status, errorText);
      return {
        success: false,
        error: `SUNO API error: ${response.status} ${errorText}`,
      };
    }

    const data = await response.json();
    console.log('[SUNO] Query response:', data);

    return {
      success: true,
      data: data.data || data,
    };
  } catch (error: any) {
    console.error('[SUNO] Error querying music:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate music with custom mode (lyrics + style)
 */
export async function generateCustomMusic(
  lyrics: string,
  tags: string,
  title: string,
  instrumental: boolean = false
): Promise<SunoGenerateResponse> {
  return generateMusic({
    prompt: lyrics,
    tags,
    title,
    make_instrumental: instrumental,
    custom_mode: true,
    model: 'chirp-v3-5',
    wait_audio: false,
  });
}

/**
 * Generate instrumental music
 */
export async function generateInstrumental(
  description: string,
  tags: string,
  title: string
): Promise<SunoGenerateResponse> {
  return generateMusic({
    prompt: description,
    tags,
    title,
    make_instrumental: true,
    model: 'chirp-v3-5',
    wait_audio: false,
  });
}

/**
 * Check if SUNO API is configured
 */
export function isSunoConfigured(): boolean {
  return !!SUNO_API_KEY;
}

/**
 * Get account info (if available)
 */
export async function getAccountInfo(): Promise<any> {
  try {
    if (!SUNO_API_KEY) {
      return { error: 'SUNO API key not configured' };
    }

    const response = await fetch(`${SUNO_BASE_URL}/account`, {
      method: 'GET',
      headers: {
        'api-key': SUNO_API_KEY,
      },
    });

    if (!response.ok) {
      return { error: `API error: ${response.status}` };
    }

    return await response.json();
  } catch (error: any) {
    return { error: error.message };
  }
}
