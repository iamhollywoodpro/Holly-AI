/**
 * HOLLY - Suno API Client
 * Professional music generation integration
 * 
 * API Key: c3367b96713745a2de3b1f8e1dde4787
 */

import { SunoGenerationParams, SunoTrack, SunoGenerationResult } from '../core/music-types';

const SUNO_API_KEY = process.env.NEXT_PUBLIC_SUNO_API_KEY || 'c3367b96713745a2de3b1f8e1dde4787';
const SUNO_API_BASE = 'https://studio-api.suno.ai';

// ==================== API CLIENT ====================

class SunoAPIClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string = SUNO_API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = SUNO_API_BASE;
  }

  /**
   * Generate music with custom lyrics
   */
  async generateCustom(params: {
    lyrics: string;
    style: string;
    title: string;
    makeInstrumental?: boolean;
    waitAudio?: boolean;
  }): Promise<SunoGenerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/custom_generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: params.lyrics,
          gpt_description_prompt: params.style,
          make_instrumental: params.makeInstrumental || false,
          wait_audio: params.waitAudio !== false, // Default true
          title: params.title,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Suno API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      // Parse Suno response
      const tracks: SunoTrack[] = data.map((item: any) => ({
        id: item.id,
        title: item.title || params.title,
        audioUrl: item.audio_url || '',
        videoUrl: item.video_url,
        imageUrl: item.image_url,
        imageUrlLarge: item.image_large_url,
        status: this.mapStatus(item.status),
        modelName: item.model_name,
        gptDescriptionPrompt: item.gpt_description_prompt,
        prompt: item.prompt,
        style: item.style,
        tags: item.tags,
        duration: item.duration,
        createdAt: item.created_at,
      }));

      return {
        success: true,
        tracks,
        estimatedWaitTime: this.calculateWaitTime(tracks),
      };
    } catch (error) {
      console.error('Suno API Error:', error);
      return {
        success: false,
        tracks: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate music from style prompt only (no lyrics)
   */
  async generate(params: {
    stylePrompt: string;
    title: string;
    makeInstrumental?: boolean;
    waitAudio?: boolean;
  }): Promise<SunoGenerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          gpt_description_prompt: params.stylePrompt,
          make_instrumental: params.makeInstrumental !== false, // Default true for pure generation
          wait_audio: params.waitAudio !== false,
          title: params.title,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Suno API Error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      const tracks: SunoTrack[] = data.map((item: any) => ({
        id: item.id,
        title: item.title || params.title,
        audioUrl: item.audio_url || '',
        videoUrl: item.video_url,
        imageUrl: item.image_url,
        imageUrlLarge: item.image_large_url,
        status: this.mapStatus(item.status),
        modelName: item.model_name,
        gptDescriptionPrompt: item.gpt_description_prompt,
        prompt: item.prompt,
        style: item.style,
        tags: item.tags,
        duration: item.duration,
        createdAt: item.created_at,
      }));

      return {
        success: true,
        tracks,
        estimatedWaitTime: this.calculateWaitTime(tracks),
      };
    } catch (error) {
      console.error('Suno API Error:', error);
      return {
        success: false,
        tracks: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check generation status and get audio URLs
   */
  async getStatus(trackIds: string[]): Promise<SunoTrack[]> {
    try {
      const idsParam = trackIds.join(',');
      const response = await fetch(`${this.baseUrl}/api/get?ids=${idsParam}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((item: any) => ({
        id: item.id,
        title: item.title,
        audioUrl: item.audio_url || '',
        videoUrl: item.video_url,
        imageUrl: item.image_url,
        imageUrlLarge: item.image_large_url,
        status: this.mapStatus(item.status),
        modelName: item.model_name,
        gptDescriptionPrompt: item.gpt_description_prompt,
        prompt: item.prompt,
        style: item.style,
        tags: item.tags,
        duration: item.duration,
        createdAt: item.created_at,
        error: item.error_message,
      }));
    } catch (error) {
      console.error('Status check error:', error);
      return [];
    }
  }

  /**
   * Get user's generated tracks feed
   */
  async getFeed(): Promise<SunoTrack[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/feed`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Feed fetch failed: ${response.status}`);
      }

      const data = await response.json();
      
      return data.map((item: any) => ({
        id: item.id,
        title: item.title,
        audioUrl: item.audio_url || '',
        videoUrl: item.video_url,
        imageUrl: item.image_url,
        imageUrlLarge: item.image_large_url,
        status: this.mapStatus(item.status),
        modelName: item.model_name,
        gptDescriptionPrompt: item.gpt_description_prompt,
        prompt: item.prompt,
        style: item.style,
        tags: item.tags,
        duration: item.duration,
        createdAt: item.created_at,
      }));
    } catch (error) {
      console.error('Feed fetch error:', error);
      return [];
    }
  }

  /**
   * Poll for track completion
   */
  async waitForCompletion(trackIds: string[], maxWaitTime: number = 180000): Promise<SunoTrack[]> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const tracks = await this.getStatus(trackIds);
      
      // Check if all tracks are complete or errored
      const allDone = tracks.every(t => t.status === 'complete' || t.status === 'error');
      
      if (allDone) {
        return tracks;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    // Timeout - return current status
    return await this.getStatus(trackIds);
  }

  /**
   * Map Suno status to our status enum
   */
  private mapStatus(sunoStatus: string): 'queued' | 'generating' | 'complete' | 'error' {
    switch (sunoStatus?.toLowerCase()) {
      case 'complete':
      case 'completed':
        return 'complete';
      case 'streaming':
      case 'generating':
        return 'generating';
      case 'queued':
      case 'submitted':
        return 'queued';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'queued';
    }
  }

  /**
   * Calculate estimated wait time based on track status
   */
  private calculateWaitTime(tracks: SunoTrack[]): number {
    const queuedCount = tracks.filter(t => t.status === 'queued').length;
    const generatingCount = tracks.filter(t => t.status === 'generating').length;
    
    // Rough estimates
    const queueTime = queuedCount * 30; // 30 seconds per queued track
    const generateTime = generatingCount * 60; // 60 seconds for generating tracks
    
    return queueTime + generateTime;
  }
}

// ==================== EXPORT SINGLETON ====================

export const sunoClient = new SunoAPIClient();

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate music with automatic retry logic
 */
export async function generateMusic(params: SunoGenerationParams): Promise<SunoGenerationResult> {
  const maxRetries = 3;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (params.lyrics) {
        // Custom lyrics generation
        return await sunoClient.generateCustom({
          lyrics: params.lyrics,
          style: params.stylePrompt,
          title: params.title,
          makeInstrumental: params.makeInstrumental || false,
          waitAudio: params.waitAudio !== false,
        });
      } else {
        // Style-only generation
        return await sunoClient.generate({
          stylePrompt: params.stylePrompt,
          title: params.title,
          makeInstrumental: params.instrumental,
          waitAudio: params.waitAudio !== false,
        });
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Attempt ${attempt} failed:`, lastError);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  return {
    success: false,
    tracks: [],
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
  };
}

/**
 * Check if track is ready for playback
 */
export function isTrackReady(track: SunoTrack): boolean {
  return track.status === 'complete' && !!track.audioUrl;
}

/**
 * Download track audio
 */
export async function downloadTrack(track: SunoTrack): Promise<Blob | null> {
  if (!track.audioUrl) {
    console.error('No audio URL available');
    return null;
  }

  try {
    const response = await fetch(track.audioUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }
    return await response.blob();
  } catch (error) {
    console.error('Download error:', error);
    return null;
  }
}

/**
 * Format track duration
 */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ==================== EXPORT ALL ====================

export {
  SunoAPIClient,
  sunoClient as default,
};
