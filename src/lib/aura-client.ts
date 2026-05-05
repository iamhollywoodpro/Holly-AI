/**
 * AURA API Client
 * Helper functions for interacting with AURA analysis API
 */

import { 
  TrackUploadRequest, 
  AnalysisJobResponse, 
  AnalysisStatusResponse, 
  AnalysisResult 
} from '@/types/aura';
import { uploadFileToBlob } from './client-upload';

/**
 * Submit track for analysis
 */
export async function submitAnalysis(
  data: TrackUploadRequest,
  onUploadProgress?: (percentage: number) => void
): Promise<AnalysisJobResponse> {
  // Upload audio file first (client-side)
  const audioUpload = await uploadFileToBlob(data.audioFile, 'audio', (progress) => {
    if (onUploadProgress) {
      onUploadProgress(progress.percentage);
    }
  });

  if (!audioUpload.success || !audioUpload.url) {
    throw new Error(audioUpload.error || 'Failed to upload audio file');
  }

  // Upload artwork if provided
  let artworkUrl: string | undefined;
  if (data.artworkFile) {
    const artworkUpload = await uploadFileToBlob(data.artworkFile, 'images');
    if (artworkUpload.success && artworkUpload.url) {
      artworkUrl = artworkUpload.url;
    }
  }

  // Submit analysis with URLs instead of files
  const response = await fetch('/api/aura/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trackTitle: data.trackTitle,
      artistName: data.artistName,
      genre: data.genre,
      audioUrl: audioUpload.url,
      lyricsText: data.lyricsText,
      artworkUrl,
      referenceTrack: data.referenceTrack,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit analysis');
  }

  return response.json();
}

/**
 * Get analysis status
 */
export async function getAnalysisStatus(jobId: string): Promise<AnalysisStatusResponse> {
  const response = await fetch(`/api/aura/status/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch status');
  }

  return response.json();
}

/**
 * Get analysis result
 */
export async function getAnalysisResult(jobId: string): Promise<AnalysisResult> {
  const response = await fetch(`/api/aura/result/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch result');
  }

  return response.json();
}

/**
 * Poll for analysis completion
 * Returns a promise that resolves when analysis is complete
 */
export async function pollForCompletion(
  jobId: string,
  onProgress?: (status: AnalysisStatusResponse) => void,
  intervalMs: number = 2000
): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getAnalysisStatus(jobId);
        
        // Call progress callback
        if (onProgress) {
          onProgress(status);
        }

        // Check if complete
        if (status.status === 'completed') {
          const result = await getAnalysisResult(jobId);
          resolve(result);
          return;
        }

        // Check if failed
        if (status.status === 'failed') {
          reject(new Error('Analysis failed'));
          return;
        }

        // Continue polling
        setTimeout(poll, intervalMs);
      } catch (error) {
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}
