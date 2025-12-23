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

/**
 * Submit track for analysis
 */
export async function submitAnalysis(data: TrackUploadRequest): Promise<AnalysisJobResponse> {
  const formData = new FormData();
  
  formData.append('trackTitle', data.trackTitle);
  formData.append('artistName', data.artistName);
  if (data.genre) formData.append('genre', data.genre);
  formData.append('audioFile', data.audioFile);
  if (data.lyricsText) formData.append('lyricsText', data.lyricsText);
  if (data.artworkFile) formData.append('artworkFile', data.artworkFile);
  if (data.referenceTrack) formData.append('referenceTrack', data.referenceTrack);

  const response = await fetch('/api/aura/analyze', {
    method: 'POST',
    body: formData,
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
